import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAccountBalances,
  calculateTotalBalance,
  calculateMonthTotals,
  calculateCategoryBreakdown,
  calculateDailyExpenses,
  formatMMK,
  toMyanmarDigits,
  fromMyanmarDigits,
} from './ledger';
import { Account, Category, Transaction } from '../types';

const mockAccounts: Account[] = [
  { id: 'acc-home', name: 'အိမ်စရိတ်', icon: 'Home', color: '#059669', initialBalance: 300000 },
  { id: 'acc-school', name: 'ကျောင်းစရိတ်', icon: 'GraduationCap', color: '#2563EB', initialBalance: 100000 },
  { id: 'acc-emergency', name: 'အရေးပေါ်', icon: 'ShieldAlert', color: '#DC2626', initialBalance: 200000 },
];

const mockCategories: Category[] = [
  { id: 'cat-market', name: 'ဈေးဖိုး', icon: 'ShoppingBasket', color: '#10B981', type: 'expense' },
  { id: 'cat-school', name: 'ကျူရှင်', icon: 'GraduationCap', color: '#3B82F6', type: 'expense' },
  { id: 'cat-salary', name: 'လစာ', icon: 'Briefcase', color: '#059669', type: 'income' },
];

const mockTransactions: Transaction[] = [
  // Income 500,000 into acc-home on 2026-11-01
  {
    id: 'tx-1',
    amount: 500000,
    type: 'income',
    categoryId: 'cat-salary',
    categoryName: 'လစာ',
    fromAccountId: 'acc-home',
    date: '2026-11-01',
    note: 'နိုဝင်ဘာလစာ',
    createdAt: Date.now(),
  },
  // Expense 20,000 from acc-home on 2026-11-02
  {
    id: 'tx-2',
    amount: 20000,
    type: 'expense',
    categoryId: 'cat-market',
    categoryName: 'ဈေးဖိုး',
    fromAccountId: 'acc-home',
    date: '2026-11-02',
    note: 'ဈေးဝယ်',
    createdAt: Date.now(),
  },
  // Transfer 50,000 from acc-home to acc-school on 2026-11-03
  {
    id: 'tx-3',
    amount: 50000,
    type: 'transfer',
    categoryId: '',
    categoryName: 'ငွေလွှဲ',
    fromAccountId: 'acc-home',
    toAccountId: 'acc-school',
    date: '2026-11-03',
    note: 'ကျောင်းစရိတ်အကောင့်သို့ လွှဲခြင်း',
    createdAt: Date.now(),
  },
  // Expense 30,000 from acc-school on 2026-11-04
  {
    id: 'tx-4',
    amount: 30000,
    type: 'expense',
    categoryId: 'cat-school',
    categoryName: 'ကျူရှင်',
    fromAccountId: 'acc-school',
    date: '2026-11-04',
    note: 'သင်္ချာကျူရှင်လခ',
    createdAt: Date.now(),
  },
];

test('calculateAccountBalances computes correct balances for income, expense, and transfers', () => {
  const balances = calculateAccountBalances(mockAccounts, mockTransactions);
  
  // acc-home: 300,000 + 500,000 (income) - 20,000 (expense) - 50,000 (transfer out) = 730,000
  assert.equal(balances['acc-home'], 730000);

  // acc-school: 100,000 + 50,000 (transfer in) - 30,000 (expense) = 120,000
  assert.equal(balances['acc-school'], 120000);

  // acc-emergency: 200,000 (no changes) = 200,000
  assert.equal(balances['acc-emergency'], 200000);
});

test('calculateTotalBalance computes total across all accounts', () => {
  const balances = calculateAccountBalances(mockAccounts, mockTransactions);
  const total = calculateTotalBalance(balances);
  // 730,000 + 120,000 + 200,000 = 1,050,000
  assert.equal(total, 1050000);
});

test('calculateMonthTotals accurately sums monthly income and expenses', () => {
  const totals = calculateMonthTotals(mockTransactions, '2026-11');
  assert.equal(totals.totalIncome, 500000);
  assert.equal(totals.totalExpense, 50000); // 20,000 + 30,000
  assert.equal(totals.netSavings, 450000);
});

test('calculateCategoryBreakdown groups expenses and calculates percentages', () => {
  const breakdown = calculateCategoryBreakdown(mockTransactions, mockCategories, 'expense', '2026-11');
  assert.equal(breakdown.length, 2);
  // Highest expense first: 30,000 (ကျူရှင်, 60%) then 20,000 (ဈေးဖိုး, 40%)
  assert.equal(breakdown[0].categoryName, 'ကျူရှင်');
  assert.equal(breakdown[0].amount, 30000);
  assert.equal(breakdown[0].percentage, 60);

  assert.equal(breakdown[1].categoryName, 'ဈေးဖိုး');
  assert.equal(breakdown[1].amount, 20000);
  assert.equal(breakdown[1].percentage, 40);
});

test('calculateDailyExpenses maps amounts to individual days in a month', () => {
  const daily = calculateDailyExpenses(mockTransactions, '2026-11');
  assert.equal(daily.length, 30); // November has 30 days
  const day2 = daily.find((d) => d.date === '2026-11-02');
  const day4 = daily.find((d) => d.date === '2026-11-04');
  assert.equal(day2?.amount, 20000);
  assert.equal(day4?.amount, 30000);
});

test('Myanmar numeral conversion functions work correctly', () => {
  assert.equal(toMyanmarDigits('5000'), '၅၀၀၀');
  assert.equal(toMyanmarDigits('1234567890'), '၁၂၃၄၅၆၇၈၉၀');
  assert.equal(fromMyanmarDigits('၅၀၀၀'), '5000');
  assert.equal(formatMMK(5000, true), '၅,၀၀၀ ကျပ်');
  assert.equal(formatMMK(5000, false), '5,000 Ks');
});
