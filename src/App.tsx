import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Plus,
  BarChart3,
  List,
  Home,
  Mic,
  ArrowRightLeft,
  Cloud,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  Account,
  Category,
  Transaction,
  AppState,
  TransactionType,
} from './types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  calculateAccountBalances,
  calculateTotalBalance,
  calculateMonthTotals,
} from './utils/ledger';
import { initAuth } from './services/auth';
import { Navbar } from './components/Navbar';
import { AccountsSummary } from './components/AccountsSummary';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AiVoiceModal } from './components/AiVoiceModal';
import { LedgerCharts } from './components/LedgerCharts';
import { TransactionList } from './components/TransactionList';
import { DriveSyncModal } from './components/DriveSyncModal';
import { AccountManagerModal } from './components/AccountManagerModal';

const STORAGE_KEY = 'myanmar_household_ledger_v1';

// Initial realistic demo transactions for the current month
function getInitialTransactions(): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const d = (day: number) => `${year}-${month}-${String(day).padStart(2, '0')}`;

  return [
    {
      id: 'tx-seed-1',
      amount: 1200000,
      type: 'income',
      categoryId: 'cat-salary',
      categoryName: 'လစာ / ပုံမှန်ဝင်ငွေ',
      fromAccountId: 'acc-home',
      date: d(1),
      note: 'လစဥ်ပုံမှန် လစာဝင်ငွေ',
      createdAt: Date.now() - 86400000 * 8,
    },
    {
      id: 'tx-seed-2',
      amount: 25000,
      type: 'expense',
      categoryId: 'cat-market',
      categoryName: 'ဈေးဖိုး / ကုန်စုံ',
      fromAccountId: 'acc-home',
      date: d(2),
      note: 'မနက်ခင်း ဈေးဝယ် (ဟင်းသီးဟင်းရွက်နှင့် အသားငါး)',
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'tx-seed-3',
      amount: 7000,
      type: 'expense',
      categoryId: 'cat-food',
      categoryName: 'အစားအသောက် / မနက်စာ',
      fromAccountId: 'acc-cash',
      date: d(3),
      note: 'မိသားစု မနက်စာ မုန့်ဟင်းခါးနှင့် လက်ဖက်ရည်',
      createdAt: Date.now() - 86400000 * 6,
    },
    {
      id: 'tx-seed-4',
      amount: 100000,
      type: 'transfer',
      categoryId: '',
      categoryName: 'ငွေလွှဲ',
      fromAccountId: 'acc-home',
      toAccountId: 'acc-school',
      date: d(4),
      note: 'ကျောင်းစရိတ်အကောင့်သို့ လွှဲပြောင်းထားရှိခြင်း',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'tx-seed-5',
      amount: 45000,
      type: 'expense',
      categoryId: 'cat-school',
      categoryName: 'ကျောင်းစရိတ် / ကျူရှင်',
      fromAccountId: 'acc-school',
      date: d(5),
      note: 'ကလေး ကျူရှင်လခနှင့် စာအုပ်ဖိုး',
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'tx-seed-6',
      amount: 32000,
      type: 'expense',
      categoryId: 'cat-bills',
      categoryName: 'အိမ်စရိတ် / မီတာခ / ရေဖိုး',
      fromAccountId: 'acc-digital',
      date: d(6),
      note: 'မီတာခ KBZPay ဖြင့် ပေးချေခြင်း',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'tx-seed-7',
      amount: 15000,
      type: 'expense',
      categoryId: 'cat-health',
      categoryName: 'ကျန်းမာရေး / ဆေးဝါး',
      fromAccountId: 'acc-emergency',
      date: d(7),
      note: 'မိသားစု အိမ်သုံးဆေးဝါးများ ဝယ်ယူခြင်း',
      createdAt: Date.now() - 86400000 * 2,
    },
  ];
}

export default function App() {
  // Load saved state or default
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getInitialTransactions();
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_dark`);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });

  const [myanmarNumerals, setMyanmarNumerals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_mm_digits`);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return false; // Default to standard numerals with toggle
  });

  const [isPremium, setIsPremium] = useState<boolean>(true); // Default active for user convenience
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts' | 'records'>('dashboard');

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultAccountId, setModalDefaultAccountId] = useState<string | undefined>();
  const [modalInitialType, setModalInitialType] = useState<TransactionType>('expense');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [dismissDriveWarning, setDismissDriveWarning] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_drive_warning_dismissed`) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissDriveWarning = () => {
    setDismissDriveWarning(true);
    try {
      localStorage.setItem(`${STORAGE_KEY}_drive_warning_dismissed`, 'true');
    } catch {}
  };

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(`${STORAGE_KEY}_dark`, JSON.stringify(darkMode));
  }, [darkMode]);

  // Persist data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
      localStorage.setItem(`${STORAGE_KEY}_mm_digits`, JSON.stringify(myanmarNumerals));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [accounts, categories, transactions, myanmarNumerals]);

  // Init Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => setUser(currentUser),
      () => setUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Balances & totals
  const balances = calculateAccountBalances(accounts, transactions);
  const totalBalance = calculateTotalBalance(balances);
  const { totalIncome, totalExpense } = calculateMonthTotals(transactions, selectedMonth);

  // Handlers
  const handleSaveTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenAddModal = (defaultAccId?: string, type: TransactionType = 'expense') => {
    setModalDefaultAccountId(defaultAccId);
    setModalInitialType(type);
    setIsAddModalOpen(true);
  };

  const handleOpenTransferModal = (fromAccId?: string) => {
    setModalDefaultAccountId(fromAccId);
    setModalInitialType('transfer');
    setIsAddModalOpen(true);
  };

  const handleSaveAccount = (account: Account) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = account;
        return copy;
      }
      return [...prev, account];
    });
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleRestoreState = (restored: AppState) => {
    if (restored.accounts && Array.isArray(restored.accounts)) {
      setAccounts(restored.accounts);
    }
    if (restored.categories && Array.isArray(restored.categories)) {
      setCategories(restored.categories);
    }
    if (restored.transactions && Array.isArray(restored.transactions)) {
      setTransactions(restored.transactions);
    }
  };

  const currentAppState: AppState = {
    accounts,
    categories,
    transactions,
    darkMode,
    myanmarNumerals,
    isPremium,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans pb-24 md:pb-12">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        myanmarNumerals={myanmarNumerals}
        onToggleMyanmarNumerals={() => setMyanmarNumerals(!myanmarNumerals)}
        isPremium={isPremium}
        onTogglePremium={() => setIsPremium(!isPremium)}
        user={user}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenTransferModal={() => handleOpenTransferModal()}
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-12 space-y-6">
        {/* Navigation Tabs (Dashboard, Graphs, Records) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>ပင်မ</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'charts'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Graph</span>
            </button>

            <button
              onClick={() => setActiveTab('records')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'records'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
              <span>မှတ်တမ်း</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Google Drive Not Connected Warning Notice */}
            {!user && !dismissDriveWarning && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200 dark:border-amber-800/70 p-3.5 sm:p-4 text-amber-950 dark:text-amber-100 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 shadow-xs">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                          <span>သတိပြုရန် - Google Drive မချိတ်ဆက်ရသေးပါ</span>
                        </h3>
                      </div>
                      <p className="text-xs text-amber-900/85 dark:text-amber-200/85 leading-relaxed max-w-3xl">
                        လောလောဆယ် စာရင်းများကို သင့်ဖုန်း/စက်တွင်း၌သာ သိမ်းဆည်းထားပါသည်။ ဖုန်းပျောက်ခြင်း၊ စက်အသစ်လဲလှယ်ခြင်း (သို့မဟုတ်) Browser ဒေတာများ ရှင်းလင်း (Clear Cache) မိပါက စာရင်းများ ပျောက်ဆုံးသွားနိုင်သဖြင့် Google Drive တွင် Backup ချိတ်ဆက်ထားရန် အကြံပြုအပ်ပါသည်။
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setIsDriveModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          <span>Google Drive ချိတ်ဆက်မည်</span>
                        </button>
                        <button
                          onClick={handleDismissDriveWarning}
                          className="px-2.5 py-1.5 rounded-xl text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-xs font-medium transition-colors cursor-pointer"
                        >
                          နားလည်ပါပြီ (ပိတ်မည်)
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissDriveWarning}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer shrink-0"
                    title="ပိတ်မည်"
                    aria-label="Dismiss warning"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Accounts & Wealth Glance */}
            <AccountsSummary
              accounts={accounts}
              balances={balances}
              totalBalance={totalBalance}
              monthIncome={totalIncome}
              monthExpense={totalExpense}
              myanmarNumerals={myanmarNumerals}
              onOpenAddModal={handleOpenAddModal}
              onOpenTransferModal={handleOpenTransferModal}
              onOpenManageAccounts={() => setIsAccountManagerOpen(true)}
            />

            {/* Quick Chart Preview & Recent Transactions 2-column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LedgerCharts
                transactions={transactions}
                categories={categories}
                accounts={accounts}
                balances={balances}
                selectedMonth={selectedMonth}
                myanmarNumerals={myanmarNumerals}
              />

              <TransactionList
                transactions={transactions}
                accounts={accounts}
                selectedMonth={selectedMonth}
                myanmarNumerals={myanmarNumerals}
                onDeleteTransaction={handleDeleteTransaction}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Full Charts View */}
        {activeTab === 'charts' && (
          <LedgerCharts
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            balances={balances}
            selectedMonth={selectedMonth}
            myanmarNumerals={myanmarNumerals}
          />
        )}

        {/* Tab 3: Full Records View */}
        {activeTab === 'records' && (
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            selectedMonth={selectedMonth}
            myanmarNumerals={myanmarNumerals}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
      </main>

      {/* Floating Action Button for AI Voice & Text (Positioned snugly right above mobile navigation bar) */}
      <div className="fixed bottom-16 md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="အသံဖြင့် AI စာရင်းသွင်းမည်"
          aria-label="အသံဖြင့် AI စာရင်းသွင်းမည်"
        >
          <Mic className="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[9px] font-bold shadow-xs">
            ✨
          </span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>ပင်မ</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'charts' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Graph</span>
        </button>

        {/* Center Quick Add Button */}
        <button
          onClick={() => handleOpenAddModal()}
          className="w-11 h-11 -mt-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform cursor-pointer"
          aria-label="Add transaction"
          title="စာရင်းသွင်း"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Records Tab */}
        <button
          onClick={() => setActiveTab('records')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'records' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
          title="စာရင်းမှတ်တမ်းများ"
        >
          <List className="w-5 h-5" />
          <span>မှတ်တမ်း</span>
        </button>

        {/* Google Drive Sync */}
        <button
          onClick={() => setIsDriveModalOpen(true)}
          className={`relative flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer ${
            user ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
          title="Google Drive Sync"
        >
          <div className="relative">
            <Cloud className="w-5 h-5" />
            {!user && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span>Sync</span>
        </button>
      </div>

      {/* Modals */}
      <AiVoiceModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        accounts={accounts}
        categories={categories}
        balances={balances}
        myanmarNumerals={myanmarNumerals}
        isPremium={isPremium}
        onTogglePremium={() => setIsPremium(!isPremium)}
        onSaveTransaction={handleSaveTransaction}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        accounts={accounts}
        categories={categories}
        balances={balances}
        myanmarNumerals={myanmarNumerals}
        defaultAccountId={modalDefaultAccountId}
        initialType={modalInitialType}
        onSave={handleSaveTransaction}
      />

      <DriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        user={user}
        appState={currentAppState}
        onRestoreState={handleRestoreState}
        onUpdateSyncTime={(time) => {
          console.log('Synced at', time);
        }}
      />

      <AccountManagerModal
        isOpen={isAccountManagerOpen}
        onClose={() => setIsAccountManagerOpen(false)}
        accounts={accounts}
        balances={balances}
        myanmarNumerals={myanmarNumerals}
        onSaveAccount={handleSaveAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}
