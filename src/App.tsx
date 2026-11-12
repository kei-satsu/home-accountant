import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
} from 'lucide-react';
import {
  Account,
  Category,
  Transaction,
  AppState,
  TransactionType,
} from './types';
import {
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
import { GeminiApiKeyModal } from './components/GeminiApiKeyModal';
import { getAccessToken } from './services/auth';
import { uploadBackupToDrive } from './services/driveSync';
import { Localized } from './i18n';

const STORAGE_KEY = 'myanmar_household_ledger_v1';
const GEMINI_API_KEY_STORAGE = `${STORAGE_KEY}_gemini_api_key`;
const ACCOUNT_MIGRATION_KEY = `${STORAGE_KEY}_main_account_migration`;
const TRANSACTION_MIGRATION_KEY = `${STORAGE_KEY}_main_account_transactions_migration`;
const MAIN_ACCOUNT: Account = {
  id: 'acc-main',
  name: 'Main Account',
  icon: 'Wallet',
  color: '#059669',
  initialBalance: 0,
  description: '',
  isDefault: true,
};
const LEGACY_DEMO_ACCOUNTS: Record<string, { name: string; initialBalance: number }> = {
  'acc-home': { name: 'အိမ်စရိတ်', initialBalance: 300000 },
  'acc-school': { name: 'ကျောင်းစရိတ်', initialBalance: 150000 },
  'acc-emergency': { name: 'အရေးပေါ် ရန်ပုံငွေ', initialBalance: 200000 },
  'acc-cash': { name: 'လက်ငင်းငွေ / ပိုက်ဆံအိတ်', initialBalance: 100000 },
  'acc-digital': { name: 'KBZPay / WavePay', initialBalance: 250000 },
};
const LEGACY_DEMO_TRANSACTION_IDS = new Set([
  'tx-seed-1',
  'tx-seed-2',
  'tx-seed-3',
  'tx-seed-4',
  'tx-seed-5',
  'tx-seed-6',
  'tx-seed-7',
]);

export default function App() {
  // Load saved state or default
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      if (localStorage.getItem(ACCOUNT_MIGRATION_KEY) === 'true') {
        const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
        return saved ? JSON.parse(saved) as Account[] : [MAIN_ACCOUNT];
      }

      const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
      if (saved) {
        const storedAccounts = JSON.parse(saved) as Account[];
        const openingBalance = storedAccounts.reduce((total, account) => {
          const legacyAccount = LEGACY_DEMO_ACCOUNTS[account.id];
          if (
            legacyAccount &&
            account.name === legacyAccount.name &&
            account.initialBalance === legacyAccount.initialBalance
          ) {
            return total;
          }
          return total + (Number(account.initialBalance) || 0);
        }, 0);

        const migratedAccounts = [{ ...MAIN_ACCOUNT, initialBalance: openingBalance }];
        localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(migratedAccounts));
        localStorage.setItem(ACCOUNT_MIGRATION_KEY, 'true');
        return migratedAccounts;
      }
      localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify([MAIN_ACCOUNT]));
      localStorage.setItem(ACCOUNT_MIGRATION_KEY, 'true');
    } catch (e) {}
    return [MAIN_ACCOUNT];
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
      if (localStorage.getItem(TRANSACTION_MIGRATION_KEY) === 'true') {
        return saved ? JSON.parse(saved) as Transaction[] : [];
      }

      if (saved) {
        const storedTransactions = JSON.parse(saved) as Transaction[];
        const migratedTransactions = storedTransactions
          .filter((tx) => !LEGACY_DEMO_TRANSACTION_IDS.has(tx.id))
          .map((tx) => ({
            ...tx,
            fromAccountId: MAIN_ACCOUNT.id,
            ...(tx.toAccountId ? { toAccountId: MAIN_ACCOUNT.id } : {}),
          }));
        localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(migratedTransactions));
        localStorage.setItem(TRANSACTION_MIGRATION_KEY, 'true');
        return migratedTransactions;
      }
      localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify([]));
      localStorage.setItem(TRANSACTION_MIGRATION_KEY, 'true');
    } catch (e) {}
    return [];
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
    } catch {
      return '';
    }
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

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts' | 'records'>('dashboard');

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isDriveSyncReady, setIsDriveSyncReady] = useState(false);
  const [isDriveKeySyncAuthorized, setIsDriveKeySyncAuthorized] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'pending' | 'syncing' | 'success' | 'error'>('idle');
  const [driveSyncMessage, setDriveSyncMessage] = useState('');
  const [driveSyncRetry, setDriveSyncRetry] = useState(0);
  const lastDriveSyncSnapshot = useRef('');
  const driveSyncRetryCount = useRef(0);
  const driveSyncInFlight = useRef(false);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultAccountId, setModalDefaultAccountId] = useState<string | undefined>();
  const [modalInitialType, setModalInitialType] = useState<TransactionType>('expense');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isGeminiApiKeyModalOpen, setIsGeminiApiKeyModalOpen] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_getting_started_dismissed`) !== 'true';
    } catch {
      return true;
    }
  });
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

  const handleDismissGettingStarted = () => {
    setShowGettingStarted(false);
    try {
      localStorage.setItem(`${STORAGE_KEY}_getting_started_dismissed`, 'true');
    } catch {}
  };

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', darkMode ? '#020617' : '#f5f8f6');
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute('content', darkMode ? 'black' : 'default');
    localStorage.setItem(`${STORAGE_KEY}_dark`, JSON.stringify(darkMode));
  }, [darkMode]);

  // Persist data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
      localStorage.setItem(`${STORAGE_KEY}_mm_digits`, JSON.stringify(myanmarNumerals));
      if (geminiApiKey) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE, geminiApiKey);
      } else {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE);
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [accounts, categories, transactions, myanmarNumerals, geminiApiKey]);

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

  useEffect(() => {
    setIsDriveSyncReady(false);
    setIsDriveKeySyncAuthorized(false);
    lastDriveSyncSnapshot.current = '';
    driveSyncRetryCount.current = 0;
    setDriveSyncStatus('idle');
    setDriveSyncMessage('');
  }, [user?.uid]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
    if (accounts.length === 0) {
      setIsAccountManagerOpen(true);
      return;
    }
    setModalDefaultAccountId(defaultAccId);
    setModalInitialType(type);
    setIsAddModalOpen(true);
  };

  const handleOpenTransferModal = (fromAccId?: string) => {
    if (accounts.length === 0) {
      setIsAccountManagerOpen(true);
      return;
    }
    setModalDefaultAccountId(fromAccId);
    setModalInitialType('transfer');
    setIsAddModalOpen(true);
  };

  const handleOpenAiModal = () => {
    if (accounts.length === 0) {
      setIsAccountManagerOpen(true);
      return;
    }
    setIsAiModalOpen(true);
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
    if (typeof restored.geminiApiKey === 'string') {
      setGeminiApiKey(restored.geminiApiKey);
    }
  };

  const currentAppState: AppState = {
    accounts,
    categories,
    transactions,
    darkMode,
    myanmarNumerals,
    geminiApiKey: geminiApiKey || undefined,
  };

  const autoSyncState = { ...currentAppState };
  if (!isDriveKeySyncAuthorized) {
    delete autoSyncState.geminiApiKey;
  }
  const driveSyncSnapshot = JSON.stringify(autoSyncState);
  const latestDriveSyncSnapshot = useRef(driveSyncSnapshot);
  latestDriveSyncSnapshot.current = driveSyncSnapshot;

  useEffect(() => {
    if (!user || !isDriveSyncReady || driveSyncSnapshot === lastDriveSyncSnapshot.current) return;
    if (!isOnline) {
      setDriveSyncStatus('pending');
      setDriveSyncMessage('အင်တာနက်ပြန်ရသောအခါ Drive သို့ အလိုအလျောက် သိမ်းဆည်းပါမည်။');
      return;
    }

    let active = true;
    let retryTimer: number | undefined;
    const timeout = window.setTimeout(async () => {
      if (driveSyncInFlight.current) {
        retryTimer = window.setTimeout(() => {
          if (active) setDriveSyncRetry((attempt) => attempt + 1);
        }, 1000);
        return;
      }

      driveSyncInFlight.current = true;
      const token = await getAccessToken();
      if (!active) {
        driveSyncInFlight.current = false;
        return;
      }
      if (!token) {
        driveSyncInFlight.current = false;
        if (active) {
          setDriveSyncStatus('pending');
          setDriveSyncMessage('Drive ခွင့်ပြုချက် မရရှိသေးပါ။ Sync ကိုဖွင့်၍ Google account ဖြင့် ပြန်ချိတ်ဆက်ပါ။');
        }
        return;
      }

      if (active) {
        setDriveSyncStatus('syncing');
        setDriveSyncMessage('Google Drive သို့ အလိုအလျောက် သိမ်းဆည်းနေပါသည်...');
      }
      try {
        const result = await uploadBackupToDrive(JSON.parse(driveSyncSnapshot) as AppState, token);
        if (active) {
          lastDriveSyncSnapshot.current = driveSyncSnapshot;
          driveSyncRetryCount.current = 0;
          setDriveSyncStatus('success');
          setDriveSyncMessage(`Google Drive သို့ သိမ်းဆည်းပြီးပါပြီ (${new Date(result.modifiedTime).toLocaleTimeString()})`);
        }
      } catch (error) {
        if (active) {
          console.error('Automatic Drive sync failed:', error);
          setDriveSyncStatus('error');
          setDriveSyncMessage('Drive သို့ အလိုအလျောက် သိမ်းမရပါ။ Sync ကိုဖွင့်၍ account ခွင့်ပြုချက်နှင့် အင်တာနက်ကို စစ်ဆေးပါ။');
          const retryDelay = Math.min(120000, 15000 * 2 ** Math.min(driveSyncRetryCount.current, 3));
          driveSyncRetryCount.current += 1;
          retryTimer = window.setTimeout(() => {
            if (active) setDriveSyncRetry((attempt) => attempt + 1);
          }, retryDelay);
        }
      } finally {
        driveSyncInFlight.current = false;
        if (latestDriveSyncSnapshot.current !== driveSyncSnapshot) {
          setDriveSyncRetry((attempt) => attempt + 1);
        }
      }
    }, 1200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [user, isDriveSyncReady, isOnline, driveSyncSnapshot, driveSyncRetry]);

  return (
    <Localized>
    <div className="min-h-screen bg-[#f5f8f6] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans pb-24 md:pb-12">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        myanmarNumerals={myanmarNumerals}
        onToggleMyanmarNumerals={() => setMyanmarNumerals(!myanmarNumerals)}
        user={user}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenApiKeySettings={() => setIsGeminiApiKeyModalOpen(true)}
        hasGeminiApiKey={Boolean(geminiApiKey)}
        onOpenAiModal={handleOpenAiModal}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenTransferModal={() => handleOpenTransferModal()}
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-12 space-y-4 sm:space-y-6">
        {!isOnline && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            အင်တာနက်မရှိပါ။ သိမ်းထားပြီးသား UI နှင့် စာရင်းများကို ဆက်သုံးနိုင်ပါသည်။ AI နှင့် Google Drive ကို အင်တာနက်ပြန်ရမှ အသုံးပြုနိုင်ပါမည်။
          </div>
        )}
        {user && driveSyncStatus !== 'idle' && (
          <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            driveSyncStatus === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
          }`}>
            <span>{driveSyncMessage}</span>
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="shrink-0 font-bold underline"
            >
              Sync
            </button>
          </div>
        )}
        {/* Navigation Tabs (Dashboard, Graphs, Records) */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>ပင်မ</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'charts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>သုံးသပ်ချက်</span>
            </button>

            <button
              onClick={() => setActiveTab('records')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'records'
                  ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
              <span>မှတ်တမ်း</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Google Drive Not Connected Warning Notice */}
            {!user && !dismissDriveWarning && (
              <div className="order-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200 dark:border-amber-800/70 p-3.5 sm:p-4 text-amber-950 dark:text-amber-100 shadow-xs">
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
                      <p className="hidden sm:block text-xs text-amber-900/85 dark:text-amber-200/85 leading-relaxed max-w-3xl">
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

            {showGettingStarted && (
              <section className="order-3 rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/80 dark:bg-sky-950/30 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-sky-100 dark:bg-sky-900/60 p-2 text-sky-700 dark:text-sky-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        စတင်အသုံးပြုရန် လမ်းညွှန်
                      </h2>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        ငွေစာရင်းတွေကို ကိုယ်တိုင်ထည့်သွင်းပြီး အောက်ပါအဆင့်တွေအတိုင်း စတင်နိုင်ပါတယ်။
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissGettingStarted}
                    className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-sky-100 dark:hover:bg-sky-900/50"
                    title="လမ်းညွှန်ကို ပိတ်မည်"
                    aria-label="လမ်းညွှန်ကို ပိတ်မည်"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {accounts.some((account) => account.initialBalance > 0) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] text-sky-700">၁</span>
                      )}
                      Main Account စတင်ပြင်ဆင်ပါ
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Main Account တွင် စတင်လက်ကျန်ငွေကို သတ်မှတ်ပါ။ နောက်ထပ်အကောင့်များကို လိုအပ်မှသာ ကိုယ်တိုင်ထည့်နိုင်ပါတယ်။
                    </p>
                    <button
                      onClick={() => setIsAccountManagerOpen(true)}
                      className="mt-3 text-xs font-bold text-sky-700 hover:underline dark:text-sky-300"
                    >
                      လက်ကျန်ငွေ သတ်မှတ်ရန် →
                    </button>
                  </div>

                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {transactions.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] text-sky-700">၂</span>
                      )}
                      ပထမဆုံးစာရင်း မှတ်ပါ
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      စာရင်းသွင်းခလုတ် သို့မဟုတ် မိုက်ခရိုဖုန်းခလုတ်ကို သုံးပြီး ဝင်ငွေ၊ အသုံးစရိတ်ကို မှတ်ပါ။
                    </p>
                    {!transactions.length && (
                      <button
                        onClick={() => handleOpenAddModal()}
                        disabled={accounts.length === 0}
                        className="mt-3 text-xs font-bold text-sky-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300"
                      >
                        စာရင်းသွင်းရန် →
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {user ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-100 text-[10px] text-sky-700">၃</span>
                      )}
                      ဒေတာကို backup လုပ်ပါ
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      စက်ပြောင်းသည့်အခါ မပျောက်စေရန် Google Drive နဲ့ ချိတ်ဆက်ပြီး သိမ်းဆည်းပါ။
                    </p>
                    {!user && (
                      <button
                        onClick={() => setIsDriveModalOpen(true)}
                        className="mt-3 text-xs font-bold text-sky-700 hover:underline dark:text-sky-300"
                      >
                        Google Drive ချိတ်ရန် →
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Accounts & Wealth Glance */}
            <div className="order-1">
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
            </div>

            {/* Quick Chart Preview & Recent Transactions 2-column Layout */}
            <div className="order-4 hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <p className="mx-auto max-w-4xl leading-relaxed">
          Home Accountant complies with the Google API Services User Data Policy. This application is strictly for financial and ledger tracking and does not use Google APIs to create, process, or distribute AI NCII (AI-generated Non-Consensual Intimate Imagery) or illegal content.
        </p>
        <a href="/privacy-policy" className="mt-3 inline-block font-semibold hover:text-emerald-700 dark:hover:text-emerald-400">
          Privacy Policy (ကိုယ်ရေးအချက်အလက် မူဝါဒ)
        </a>
      </footer>

      {/* Floating Action Button for AI Voice & Text (Positioned snugly right above mobile navigation bar) */}
      <div className="fixed bottom-16 md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        <button
          onClick={handleOpenAiModal}
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
      <nav aria-label="Үндсэн навигаци" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-xl">
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
          <span>သုံးသပ်ချက်</span>
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
      </nav>

      {/* Modals */}
      <AiVoiceModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        accounts={accounts}
        categories={categories}
        balances={balances}
        geminiApiKey={geminiApiKey}
        onOpenApiKeySettings={() => setIsGeminiApiKeyModalOpen(true)}
        isOnline={isOnline}
        myanmarNumerals={myanmarNumerals}
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
        isOnline={isOnline}
        isDriveSyncReady={isDriveSyncReady}
        appState={currentAppState}
        onRestoreState={handleRestoreState}
        onUpdateSyncTime={(time, includesApiKey) => {
          lastDriveSyncSnapshot.current = driveSyncSnapshot;
          if (includesApiKey !== undefined) {
            setIsDriveKeySyncAuthorized(includesApiKey);
          }
          setIsDriveSyncReady(true);
          setDriveSyncStatus('success');
          setDriveSyncMessage(`Google Drive သို့ သိမ်းဆည်းပြီးပါပြီ (${new Date(time).toLocaleTimeString()})`);
        }}
        onDriveSyncReady={setIsDriveSyncReady}
      />

      <GeminiApiKeyModal
        isOpen={isGeminiApiKeyModalOpen}
        apiKey={geminiApiKey}
        isDriveConnected={Boolean(user)}
        onClose={() => setIsGeminiApiKeyModalOpen(false)}
        onSave={setGeminiApiKey}
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
    </Localized>
  );
}
