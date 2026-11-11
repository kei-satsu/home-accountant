import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Gemini SDK with server-side API Key
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

import { parseMyanmarExpenseFallback } from './src/utils/aiParser';

// API endpoint for AI Voice & Text Parsing
app.post('/api/ai/parse-expense', async (req, res) => {
  try {
    const { text, accounts, categories } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const accountList = Array.isArray(accounts) ? accounts : [];
    const categoryList = Array.isArray(categories) ? categories : [];

    if (!aiClient) {
      // Fallback parser if API key is not yet configured
      const fallbackResult = parseMyanmarExpenseFallback(text, accountList, categoryList);
      return res.json({ result: fallbackResult, source: 'rule-engine' });
    }

    const prompt = `You are a helpful and intelligent Myanmar household ledger accounting assistant (အိမ်စရင်း လက်ထောက် AI).
The user gave this voice or text input in Burmese (Myanmar) or English about an expense or income:
"${text}"

Available Accounts in user's budget:
${JSON.stringify(accountList.map((a: any) => ({ id: a.id, name: a.name })))}

Available Categories:
${JSON.stringify(categoryList.map((c: any) => ({ id: c.id, name: c.name, type: c.type })))}

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

    // Set up a 5-second timeout for Gemini call, falling back to rule parser if slow or unavailable
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 4500)
    );

    const generatePromise = aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    // Validation
    if (!parsed.amount || parsed.amount <= 0) {
      const fallback = parseMyanmarExpenseFallback(text, accountList, categoryList);
      if (fallback.amount > 0) {
        return res.json({ result: fallback, source: 'hybrid-fallback' });
      }
    }

    return res.json({ result: parsed, source: 'gemini-3.8-flash' });
  } catch (err: any) {
    console.error('Error in /api/ai/parse-expense:', err);
    // Graceful fallback to rule parser
    try {
      const { text, accounts, categories } = req.body;
      const fallbackResult = parseMyanmarExpenseFallback(text || '', accounts || [], categories || []);
      return res.json({ result: fallbackResult, source: 'error-fallback' });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse expense text' });
    }
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`အိမ်စရင်း Server running on port ${port} (prod: ${isProd})`);
  });
}

startServer();
