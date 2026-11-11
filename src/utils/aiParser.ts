export interface ParsedExpenseResult {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string | null;
  accountName: string | null;
  description: string;
  needsAccountClarification: boolean;
  clarificationQuestion: string | null;
}

export function parseMyanmarExpenseFallback(
  text: string,
  accounts: Array<{ id: string; name: string }>,
  categories: Array<{ id: string; name: string; type: 'income' | 'expense' }>
): ParsedExpenseResult {
  const clean = text.trim();

  // Myanmar digit translation
  const mmDigits: Record<string, string> = {
    '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
    '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9'
  };
  const normalized = clean.replace(/[၀-၉]/g, (d) => mmDigits[d] || d);

  // Detect amount
  let amount = 0;

  // Words for numbers
  const wordMultiplier: Record<string, number> = {
    'တစ်ထောင်': 1000, 'နှစ်ထောင်': 2000, 'သုံးထောင်': 3000, 'လေးထောင်': 4000, 'ငါးထောင်': 5000,
    'ခြောက်ထောင်': 6000, 'ခုနစ်ထောင်': 7000, 'ရှစ်ထောင်': 8000, 'ကိုးထောင်': 9000,
    'တစ်သောင်း': 10000, 'နှစ်သောင်း': 20000, 'သုံးသောင်း': 30000, 'လေးသောင်း': 40000, 'ငါးသောင်း': 50000,
    'ခြောက်သောင်း': 60000, 'ခုနစ်သောင်း': 70000, 'ရှစ်သောင်း': 80000, 'ကိုးသောင်း': 90000,
    'တစ်သိန်း': 100000, 'နှစ်သိန်း': 200000, 'သုံးသိန်း': 300000, 'ငါးသိန်း': 500000, 'ဆယ်သိန်း': 1000000
  };

  for (const [w, val] of Object.entries(wordMultiplier)) {
    if (normalized.includes(w)) {
      amount = val;
      break;
    }
  }

  // Check for patterns like "10 သိန်း", "2 သောင်း", "5 ထောင်", "10000"
  if (amount === 0) {
    const theinMatch = normalized.match(/(\d+)\s*(သိန်း|thein)/i);
    const thaungMatch = normalized.match(/(\d+)\s*(သောင်း|thaung)/i);
    const htaungMatch = normalized.match(/(\d+)\s*(ထောင်|htaung|k|ks)/i);
    const directNumMatch = normalized.match(/(\d[\d,]*)\s*(ကျပ်|ks|mmk|ဖိုး)?/i);

    if (theinMatch) {
      amount = parseInt(theinMatch[1], 10) * 100000;
    } else if (thaungMatch) {
      amount = parseInt(thaungMatch[1], 10) * 10000;
    } else if (htaungMatch) {
      amount = parseInt(htaungMatch[1], 10) * 1000;
    } else if (directNumMatch) {
      amount = parseInt(directNumMatch[1].replace(/,/g, ''), 10) || 0;
    }
  }

  // Type: income or expense
  // Use specific keywords: "ဝင်ငွေ", "လစာ", "ရရှိ", "ဝင်တယ်", "bonus", "salary", "income"
  const isIncome = /(ဝင်ငွေ|လစာ|ရရှိ|ရတယ်|ဝင်တယ်|bonus|salary|income)/i.test(normalized) &&
    !/(ဝယ်|စား|သုံး|ပေး|လှူ|စရိတ်|ဖိုး)/i.test(normalized.replace(/ဝင်တယ်|လစာ/g, ''));
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

  // Match category
  let matchedCategory = categories.find((c) => c.type === type && normalized.includes(c.name))?.name;
  if (!matchedCategory) {
    if (type === 'income') {
      matchedCategory = 'လစာ / ပုံမှန်ဝင်ငွေ';
    } else {
      if (/မနက်စာ|နေ့လယ်စာ|ညစာ|စား|ကော်ဖီ|လက်ဖက်ရည်|အစားအသောက်/i.test(normalized)) {
        matchedCategory = 'အစားအသောက် / မနက်စာ';
      } else if (/ဈေး|ဟင်းသီးဟင်းရွက်|အသား|ငါး|ဆန်|ဆီ|မီးဖိုချောင်/i.test(normalized)) {
        matchedCategory = 'ဈေးဖိုး / ကုန်စုံ';
      } else if (/ကျောင်း|စာအုပ်|ကလေး|ကျူရှင်/i.test(normalized)) {
        matchedCategory = 'ကျောင်းစရိတ် / ကျူရှင်';
      } else if (/မီတာ|ရေဖိုး|အိမ်လခ|အိမ်သုံး/i.test(normalized)) {
        matchedCategory = 'အိမ်စရိတ် / မီတာခ / ရေဖိုး';
      } else if (/ဆေး|ဆေးခန်း|ဆရာဝန်|ကျန်းမာရေး/i.test(normalized)) {
        matchedCategory = 'ကျန်းမာရေး / ဆေးဝါး';
      } else if (/ကား|ဆီ|taxi|ဘတ်စကား|ခရီး|သွား/i.test(normalized)) {
        matchedCategory = 'သွားလာစရိတ် / ဆီဖိုး';
      } else if (/လှူ|ကုသိုလ်|မင်္ဂလာဆောင်|နာရေး/i.test(normalized)) {
        matchedCategory = 'လူမှုရေး / အလှူအတန်း';
      } else {
        matchedCategory = 'အထွေထွေ အသုံးစရိတ်';
      }
    }
  }

  // Match account
  let matchedAccount = accounts.find((a) => {
    const aName = a.name.toLowerCase();
    const parts = aName.split(/[/()]/).map((p) => p.trim()).filter(Boolean);
    const textLower = normalized.toLowerCase();
    return parts.some((p) => textLower.includes(p.toLowerCase()));
  });

  let needsClarification = false;
  let clarificationQuestion: string | null = null;

  if (!matchedAccount) {
    if (accounts.length > 1) {
      needsClarification = true;
      clarificationQuestion = `ကျေးဇူးပြု၍ မည်သည့်အကောင့်ထဲမှ ${type === 'income' ? 'ထည့်သွင်း' : 'နှုတ်ယူ'}ရမလဲ ရွေးချယ်ပေးပါခင်ဗျာ။ (ဥပမာ - အိမ်စရိတ်၊ လက်ငင်းငွေ သို့မဟုတ် အရေးပေါ်)`;
    } else if (accounts.length === 1) {
      matchedAccount = accounts[0];
    }
  }

  return {
    amount,
    type,
    category: matchedCategory,
    accountId: matchedAccount ? matchedAccount.id : null,
    accountName: matchedAccount ? matchedAccount.name : null,
    description: clean,
    needsAccountClarification: needsClarification,
    clarificationQuestion,
  };
}
