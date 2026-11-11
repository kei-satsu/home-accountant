export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Account {
  id: string;
  name: string;
  icon: string;
  color: string;
  initialBalance: number;
  description?: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  fromAccountId: string;
  toAccountId?: string;
  date: string; // YYYY-MM-DD
  note: string;
  voiceRawText?: string;
  createdAt: number;
}

export interface AppState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  darkMode: boolean;
  myanmarNumerals: boolean;
  isPremium: boolean;
  lastSyncedAt?: string;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  count: number;
}

export interface DailyExpenseItem {
  date: string;
  dayLabel: string;
  amount: number;
}
