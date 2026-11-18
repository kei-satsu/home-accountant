import { GoogleGenAI, Type } from '@google/genai';
import { parseMyanmarExpenseFallback } from '../src/utils/aiParser';

interface AccountInfo {
  id: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface ParseExpenseResult {
  statusCode: number;
  body: Record<string, unknown>;
}

const isAccountInfo = (value: unknown): value is AccountInfo =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'name' in value &&
  typeof value.name === 'string';

const isCategoryInfo = (value: unknown): value is CategoryInfo =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'type' in value &&
  (value.type === 'income' || value.type === 'expense');

const createAiClient = (apiKey: string) =>
  new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

export async function parseExpenseRequest(
  payload: unknown,
  requestApiKey?: string
): Promise<ParseExpenseResult> {
  const body = typeof payload === 'object' && payload !== null
    ? payload as Record<string, unknown>
    : {};
  const { text } = body;
  if (typeof text !== 'string' || !text.trim()) {
    return { statusCode: 400, body: { error: 'Text prompt is required' } };
  }

  const apiKey = requestApiKey?.trim();
  if (apiKey && apiKey.length > 1024) {
    return { statusCode: 400, body: { error: 'Gemini API key is invalid' } };
  }

  const accounts = Array.isArray(body.accounts) ? body.accounts.filter(isAccountInfo) : [];
  const categories = Array.isArray(body.categories) ? body.categories.filter(isCategoryInfo) : [];
  const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY?.trim();

  if (!effectiveApiKey) {
    return {
      statusCode: 200,
      body: {
        result: parseMyanmarExpenseFallback(text, accounts, categories),
        source: 'rule-engine',
      },
    };
  }

  try {
    const aiClient = createAiClient(effectiveApiKey);
    const prompt = `You are a helpful and intelligent Myanmar household ledger accounting assistant (အိမ်စရင်း လက်ထောက် AI).
The user gave this voice or text input in Burmese (Myanmar) or English about an expense or income:
"${text}"

Available Accounts in user's budget:
${JSON.stringify(accounts.map(({ id, name }) => ({ id, name })))}

Available Categories:
${JSON.stringify(categories.map(({ id, name, type }) => ({ id, name, type })))}

Your task:
1. Extract the transaction amount as an integer number (MMK). Note Burmese words:
   - "ငါးထောင်" = 5000, "တစ်သောင်း" = 10000, "နှစ်သောင်း" = 20000, "ငါးသောင်း" = 50000, "တစ်သိန်း" = 100000, "ဆယ်သိန်း" = 1000000, etc.
   - Burmese numerals: ၀=0, ၁=1, ၂=2, ၃=3, ၄=4, ၅=5, ၆=6, ၇=7, ၈=8, ၉=9.
2. Determine if it is an "expense" (အထွက်စရိတ်) or "income" (အဝင်ငွေ).
3. Match to the most appropriate category name from the categories list or provide a relevant Myanmar category.
4. Detect if the user mentioned which account/wallet to use (e.g., "အိမ်စရိတ်ထဲက", "လက်ငင်း", "KPay", "ကျောင်းစရိတ်", "အရေးပေါ်").
   - If an account is clearly mentioned, set accountId and accountName.
   - If NO account was mentioned and there are multiple accounts, set "needsAccountClarification": true and provide a polite Myanmar question in "clarificationQuestion" (e.g., "ဒီအသုံးစရိတ်အတွက် ဘယ်အကောင့် (ဥပမာ - အိမ်စရိတ်၊ အရေးပေါ်၊ လက်ငင်းငွေ) ထဲက နှုတ်ရမလဲခင်ဗျာ?").
5. Provide a short, clean description in Myanmar language.
6. Provide an understanding confirmation in Myanmar language.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 4500)
    );
    const generatePromise = aiClient.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.INTEGER, description: 'The transaction amount in MMK' },
            type: { type: Type.STRING, description: '"expense" or "income"' },
            category: { type: Type.STRING, description: 'Matched Myanmar category name' },
            accountId: { type: Type.STRING, description: 'Matched account id if identified or empty string' },
            accountName: { type: Type.STRING, description: 'Matched account name if identified or empty string' },
            needsAccountClarification: { type: Type.BOOLEAN, description: 'True if account is ambiguous' },
            clarificationQuestion: { type: Type.STRING, description: 'Polite Myanmar question if clarification needed' },
            description: { type: Type.STRING, description: 'Clean Myanmar description' },
            aiSummary: { type: Type.STRING, description: 'Summary message in Myanmar' },
          },
          required: ['amount', 'type', 'category', 'needsAccountClarification', 'description'],
        },
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const parsed: unknown = JSON.parse(response.text || '{}');
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Gemini returned an invalid transaction result');
    }

    if (!('amount' in parsed) || typeof parsed.amount !== 'number' || parsed.amount <= 0) {
      const fallback = parseMyanmarExpenseFallback(text, accounts, categories);
      if (fallback.amount > 0) {
        return {
          statusCode: 200,
          body: {
            result: fallback,
            source: 'hybrid-fallback',
            warning: 'Gemini could not identify the amount; the local parser was used.',
          },
        };
      }
    }

    return {
      statusCode: 200,
      body: { result: parsed, source: 'gemini-3.5-flash-lite' },
    };
  } catch (error) {
    console.error(
      'Gemini parsing failed:',
      error instanceof Error ? error.name : 'Unknown error'
    );
    return {
      statusCode: 200,
      body: {
        result: parseMyanmarExpenseFallback(text, accounts, categories),
        source: 'error-fallback',
        warning: 'Gemini could not be reached. The local rule-based parser was used; check the API key and network connection.',
      },
    };
  }
}
