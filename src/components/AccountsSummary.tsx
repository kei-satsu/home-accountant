import React from 'react';
import {
  Wallet,
  Home,
  GraduationCap,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRightLeft,
  PlusCircle,
  Settings2,
  DollarSign,
} from 'lucide-react';
import { Account } from '../types';
import { formatMMK } from '../utils/ledger';

interface AccountsSummaryProps {
  accounts: Account[];
  balances: Record<string, number>;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  myanmarNumerals: boolean;
  onOpenAddModal: (defaultAccountId?: string) => void;
  onOpenTransferModal: (fromAccountId?: string) => void;
  onOpenManageAccounts: () => void;
}

const getAccountIcon = (iconName: string) => {
  switch (iconName) {
    case 'Home':
      return <Home className="w-5 h-5" />;
    case 'GraduationCap':
      return <GraduationCap className="w-5 h-5" />;
    case 'ShieldAlert':
      return <ShieldAlert className="w-5 h-5" />;
    case 'Smartphone':
      return <Smartphone className="w-5 h-5" />;
    case 'Wallet':
    default:
      return <Wallet className="w-5 h-5" />;
  }
};

export const AccountsSummary: React.FC<AccountsSummaryProps> = ({
  accounts,
  balances,
  totalBalance,
  monthIncome,
  monthExpense,
  myanmarNumerals,
  onOpenAddModal,
  onOpenTransferModal,
  onOpenManageAccounts,
}) => {
  const netSavings = monthIncome - monthExpense;

  return (
    <section className="space-y-6">
      {/* Top Total Wealth & Monthly Cash Flow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Card: Total Net Balance */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 p-6 text-white shadow-xl shadow-emerald-700/20">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium tracking-wide text-emerald-100 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-300" />
                  စုစုပေါင်း လက်ကျန်ငွေ
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs font-medium">
                  {accounts.length} အကောင့်
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {formatMMK(totalBalance, myanmarNumerals)}
                </h2>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/15 flex items-center gap-3">
              <button
                onClick={() => onOpenAddModal()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                စာရင်းသွင်း
              </button>
              <button
                onClick={() => onOpenTransferModal()}
                className="py-2.5 px-4 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border border-white/20 transition-all active:scale-98"
              >
                <ArrowRightLeft className="w-4 h-4" />
                ငွေလွှဲ
              </button>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        </div>

        {/* This Month's Income Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">ယခုလ ဝင်ငွေ</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                +{formatMMK(monthIncome, myanmarNumerals)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            ပုံမှန်နှင့် အခြားဝင်ငွေ
          </div>
        </div>

        {/* This Month's Expense & Savings Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">ယခုလ အသုံးစရိတ်</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                -{formatMMK(monthExpense, myanmarNumerals)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
              စုဆောင်းငွေ
            </span>
            <span
              className={`font-semibold ${
                netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netSavings >= 0 ? '+' : ''}
              {formatMMK(netSavings, myanmarNumerals)}
            </span>
          </div>
        </div>
      </div>

      {/* Individual Account Envelopes (အကောင့်ခွဲများ) Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            အကောင့်ခွဲများ
          </h3>
          <button
            onClick={onOpenManageAccounts}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            အကောင့်ပြင်မည်
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {accounts.map((acc) => {
            const accBalance = balances[acc.id] ?? acc.initialBalance;
            const ratio = totalBalance > 0 ? Math.max(0, Math.min(100, Math.round((accBalance / totalBalance) * 100))) : 0;
            const isNegative = accBalance < 0;

            return (
              <div
                key={acc.id}
                className="group relative rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: acc.color }}
                    >
                      {getAccountIcon(acc.icon)}
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {ratio}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {acc.name}
                    </h4>
                  </div>

                  <div className="mt-2.5">
                    <div
                      className={`text-lg font-extrabold ${
                        isNegative
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatMMK(accBalance, myanmarNumerals)}
                    </div>
                  </div>

                  {/* Progress bar representing share of budget */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(5, ratio))}%`,
                        backgroundColor: acc.color,
                      }}
                    />
                  </div>
                </div>

                {/* Quick actions for this account */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenAddModal(acc.id)}
                    className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 transition-colors text-center"
                  >
                    + သွင်းမည်
                  </button>
                  <button
                    onClick={() => onOpenTransferModal(acc.id)}
                    title="ငွေလွှဲမည်"
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
