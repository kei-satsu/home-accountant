import { Account, Category, Transaction, CategoryBreakdownItem, DailyExpenseItem } from '../types';

export const MYANMAR_DIGITS: Record<string, string> = {
  '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄',
  '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉',
};

export const LATIN_DIGITS: Record<string, string> = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9',
};

export function toMyanmarDigits(str: string | number): string {
  return String(str).replace(/[0-9]/g, (d) => MYANMAR_DIGITS[d] || d);
}

export function fromMyanmarDigits(str: string): string {
  return str.replace(/[၀-၉]/g, (d) => LATIN_DIGITS[d] || d);
}

export function formatMMK(amount: number, useMyanmarDigits = false): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  if (useMyanmarDigits) {
    return `${toMyanmarDigits(formatted)} ကျပ်`;
  }
  return `${formatted} Ks`;
}

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-home',
    name: 'အိမ်စရိတ်',
    icon: 'Home',
    color: '#059669', // Emerald
    initialBalance: 300000,
    description: 'လစဥ် အိမ်သုံးစရိတ်၊ မီးဖိုချောင်၊ မီတာခ၊ ရေဖိုး',
    isDefault: true,
  },
  {
    id: 'acc-school',
    name: 'ကျောင်းစရိတ်',
    icon: 'GraduationCap',
    color: '#2563EB', // Blue
    initialBalance: 150000,
    description: 'ကလေးကျောင်းလခ၊ ကျူရှင်၊ စာရေးကိရိယာစရိတ်',
  },
  {
    id: 'acc-emergency',
    name: 'အရေးပေါ် ရန်ပုံငွေ',
    icon: 'ShieldAlert',
    color: '#DC2626', // Red
    initialBalance: 200000,
    description: 'ကျန်းမာရေး၊ မမျှော်လင့်သော ကိစ္စများအတွက် အရေးပေါ်ငွေ',
  },
  {
    id: 'acc-cash',
    name: 'လက်ငင်းငွေ / ပိုက်ဆံအိတ်',
    icon: 'Wallet',
    color: '#D97706', // Amber
    initialBalance: 100000,
    description: 'နေ့စဉ် ဈေးဖိုး၊ လက်ဖက်ရည်ဖိုး လက်ထဲရှိငွေ',
  },
  {
    id: 'acc-digital',
    name: 'KBZPay / WavePay',
    icon: 'Smartphone',
    color: '#7C3AED', // Violet
    initialBalance: 250000,
    description: 'အွန်လိုင်း ဘဏ်နှင့် မိုဘိုင်းပိုက်ဆံအိတ်',
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense Categories
  { id: 'cat-market', name: 'ဈေးဖိုး / ကုန်စုံ', icon: 'ShoppingBasket', color: '#10B981', type: 'expense' },
  { id: 'cat-food', name: 'အစားအသောက် / မနက်စာ', icon: 'Utensils', color: '#F59E0B', type: 'expense' },
  { id: 'cat-bills', name: 'အိမ်စရိတ် / မီတာခ / ရေဖိုး', icon: 'Zap', color: '#EF4444', type: 'expense' },
  { id: 'cat-school', name: 'ကျောင်းစရိတ် / ကျူရှင်', icon: 'GraduationCap', color: '#3B82F6', type: 'expense' },
  { id: 'cat-health', name: 'ကျန်းမာရေး / ဆေးဝါး', icon: 'HeartPulse', color: '#EC4899', type: 'expense' },
  { id: 'cat-transport', name: 'သွားလာစရိတ် / ဆီဖိုး', icon: 'Car', color: '#6366F1', type: 'expense' },
  { id: 'cat-donation', name: 'လူမှုရေး / အလှူအတန်း', icon: 'HandHeart', color: '#8B5CF6', type: 'expense' },
  { id: 'cat-general-exp', name: 'အထွေထွေ အသုံးစရိတ်', icon: 'CircleEllipsis', color: '#64748B', type: 'expense' },

  // Income Categories
  { id: 'cat-salary', name: 'လစာ / ပုံမှန်ဝင်ငွေ', icon: 'Briefcase', color: '#059669', type: 'income' },
  { id: 'cat-business', name: 'အရောင်းအဝယ် / စီးပွားရေး', icon: 'Store', color: '#0284C7', type: 'income' },
  { id: 'cat-bonus', name: 'အပိုဝင်ငွေ / Bonus', icon: 'TrendingUp', color: '#8B5CF6', type: 'income' },
  { id: 'cat-gift', name: 'မုန့်ဖိုး / လက်ဆောင်ငွေ', icon: 'Gift', color: '#F43F5E', type: 'income' },
];

export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize with initial balance
  for (const acc of accounts) {
    balances[acc.id] = acc.initialBalance || 0;
  }

  // Iterate over transactions
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      if (balances[tx.fromAccountId] !== undefined) {
        balances[tx.fromAccountId] += amount;
      }
    } else if (tx.type === 'expense') {
      if (balances[tx.fromAccountId] !== undefined) {
        balances[tx.fromAccountId] -= amount;
      }
    } else if (tx.type === 'transfer') {
      // Deduct from sender
      if (balances[tx.fromAccountId] !== undefined) {
        balances[tx.fromAccountId] -= amount;
      }
      // Add to receiver
      if (tx.toAccountId && balances[tx.toAccountId] !== undefined) {
        balances[tx.toAccountId] += amount;
      }
    }
  }

  return balances;
}

export function calculateTotalBalance(balances: Record<string, number>): number {
  return Object.values(balances).reduce((sum, b) => sum + b, 0);
}

export function filterTransactionsByMonth(
  transactions: Transaction[],
  yearMonth: string // "YYYY-MM"
): Transaction[] {
  return transactions.filter((tx) => tx.date.startsWith(yearMonth));
}

export function calculateMonthTotals(
  transactions: Transaction[],
  yearMonth: string
): { totalIncome: number; totalExpense: number; netSavings: number } {
  const monthTx = filterTransactionsByMonth(transactions, yearMonth);
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of monthTx) {
    if (tx.type === 'income') {
      totalIncome += Number(tx.amount) || 0;
    } else if (tx.type === 'expense') {
      totalExpense += Number(tx.amount) || 0;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
  };
}

export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'expense' | 'income',
  yearMonth?: string
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((tx) => {
    if (tx.type !== type) return false;
    if (yearMonth && !tx.date.startsWith(yearMonth)) return false;
    return true;
  });

  const totals: Record<string, { amount: number; count: number }> = {};
  let totalAmount = 0;

  for (const tx of filtered) {
    const amt = Number(tx.amount) || 0;
    totalAmount += amt;
    const key = tx.categoryName || 'အခြား';
    if (!totals[key]) {
      totals[key] = { amount: 0, count: 0 };
    }
    totals[key].amount += amt;
    totals[key].count += 1;
  }

  const items: CategoryBreakdownItem[] = [];
  const categoryMap = new Map(categories.map((c) => [c.name, c]));

  for (const [name, stats] of Object.entries(totals)) {
    const matched = categoryMap.get(name);
    items.push({
      categoryId: matched?.id || name,
      categoryName: name,
      amount: stats.amount,
      percentage: totalAmount > 0 ? Math.round((stats.amount / totalAmount) * 100) : 0,
      color: matched?.color || '#94A3B8',
      icon: matched?.icon || 'CircleDot',
      count: stats.count,
    });
  }

  // Sort descending by amount
  return items.sort((a, b) => b.amount - a.amount);
}

export function calculateDailyExpenses(
  transactions: Transaction[],
  yearMonth: string
): DailyExpenseItem[] {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyMap: Record<string, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const fullDate = `${yearMonth}-${dayStr}`;
    dailyMap[fullDate] = 0;
  }

  const monthExpenses = transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(yearMonth));
  for (const tx of monthExpenses) {
    if (dailyMap[tx.date] !== undefined) {
      dailyMap[tx.date] += Number(tx.amount) || 0;
    }
  }

  return Object.entries(dailyMap).map(([date, amount]) => {
    const day = parseInt(date.split('-')[2], 10);
    return {
      date,
      dayLabel: `${day}ရက်`,
      amount,
    };
  });
}
