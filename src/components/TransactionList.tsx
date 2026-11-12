import React, { useState } from 'react';
import {
  List,
  Search,
  Filter,
  Trash2,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Download,
  Calendar,
  Wallet,
} from 'lucide-react';
import { Account, Transaction, TransactionType } from '../types';
import { formatMMK, toMyanmarDigits } from '../utils/ledger';
import { Localized, useLanguage } from '../i18n';

const MONTH_NAMES_MM = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'ဩဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
];

const WEEKDAYS_MM = [
  'တနင်္ဂနွေ',
  'တနင်္လာ',
  'အင်္ဂါ',
  'ဗုဒ္ဓဟူး',
  'ကြာသပတေး',
  'သောကြာ',
  'စနေ',
];

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedMonth: string;
  myanmarNumerals: boolean;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  selectedMonth,
  myanmarNumerals,
  onDeleteTransaction,
}) => {
  const { language, t } = useLanguage();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    // Month filter
    if (selectedMonth && !tx.date.startsWith(selectedMonth)) return false;

    // Type filter
    if (filterType !== 'all' && tx.type !== filterType) return false;

    // Account filter
    if (filterAccount !== 'all') {
      if (tx.fromAccountId !== filterAccount && tx.toAccountId !== filterAccount) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNote = tx.note.toLowerCase().includes(q);
      const matchCat = tx.categoryName.toLowerCase().includes(q);
      const fromAcc = accountMap.get(tx.fromAccountId)?.name.toLowerCase() || '';
      const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId)?.name.toLowerCase() || '' : '';
      if (!matchNote && !matchCat && !fromAcc.includes(q) && !toAcc.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sort by date descending, then createdAt descending
  const sorted = [...filtered].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  const groupedTransactions = sorted.reduce<{ date: string; items: Transaction[] }[]>(
    (groups, transaction) => {
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.date === transaction.date) {
        currentGroup.items.push(transaction);
      } else {
        groups.push({ date: transaction.date, items: [transaction] });
      }
      return groups;
    },
    []
  );

  const formatGroupDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > new Date(year, month, 0).getDate()
    ) {
      return date;
    }

    const localDate = new Date(year, month - 1, day);

    if (language === 'en') {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(localDate);
    }

    const formatNumber = myanmarNumerals ? toMyanmarDigits : String;
    return `${formatNumber(year)} ခုနှစ်၊ ${MONTH_NAMES_MM[month - 1]}လ ${formatNumber(day)} ရက်၊ ${WEEKDAYS_MM[localDate.getDay()]}`;
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      t('ရက်စွဲ (Date)'),
      t('အမျိုးအစား (Type)'),
      t('ခေါင်းစဉ် (Category)'),
      t('ငွေပမာဏ (Amount MMK)'),
      t('မူရင်းအကောင့် (From Account)'),
      t('လွှဲလက်ခံအကောင့် (To Account)'),
      t('မှတ်ချက် (Note)'),
    ];
    const rows = sorted.map((tx) => [
      tx.date,
      language === 'en'
        ? tx.type === 'expense' ? 'Expense' : tx.type === 'income' ? 'Income' : 'Transfer'
        : tx.type === 'expense' ? 'အထွက်' : tx.type === 'income' ? 'အဝင်' : 'ငွေလွှဲ',
      tx.categoryName,
      tx.amount,
      accountMap.get(tx.fromAccountId)?.name || tx.fromAccountId,
      tx.toAccountId ? accountMap.get(tx.toAccountId)?.name || tx.toAccountId : '-',
      `"${tx.note.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${t('အိမ်စရင်း')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Localized>
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
      {/* List Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <List className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            စာရင်းမှတ်တမ်း
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            {sorted.length} {language === 'en' ? (sorted.length === 1 ? 'record' : 'records') : 'ခု'}
          </span>
        </div>

        {/* Action Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            title="CSV ဖိုင် ထုတ်ယူမည်"
          >
            <Download className="w-3.5 h-3.5" />
            CSV ထုတ်မည်
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Search Input */}
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ရှာဖွေရန်..."
            className="w-full py-2 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">အမျိုးအစား အားလုံး</option>
            <option value="expense">အသုံးစရိတ်</option>
            <option value="income">ဝင်ငွေ</option>
            <option value="transfer">ငွေလွှဲ</option>
          </select>
        </div>

        {/* Account Filter */}
        <div className="flex items-center">
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">အကောင့် အားလုံး</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Render */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
          <List className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            ရွေးချယ်ထားသော အချက်အလက်များအတွက် မှတ်တမ်း မရှိသေးပါ
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            "AI စာရင်းသွင်း" သို့မဟုတ် "စာရင်းသွင်း" ခလုတ်ဖြင့် စာရင်းထည့်သွင်းနိုင်ပါသည်
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map(({ date, items }) => (
            <section key={date} className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 px-1 py-1">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {formatGroupDate(date)}
                </h4>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {items.length} {language === 'en' ? (items.length === 1 ? 'record' : 'records') : 'ခု'}
                </span>
              </div>
              {items.map((tx) => {
                const fromAccount = accountMap.get(tx.fromAccountId);
                const toAccount = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                const isDeleting = confirmDeleteId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="group p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between gap-2 sm:gap-3"
                  >
                {/* Left side: Icon & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                      tx.type === 'expense'
                        ? 'bg-rose-500'
                        : tx.type === 'income'
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {tx.type === 'expense' ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : tx.type === 'income' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tx.note || tx.categoryName}
                      </h4>
                      {tx.categoryName && tx.type !== 'transfer' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                          {tx.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Account information */}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {tx.type === 'transfer' ? (
                        <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          {fromAccount?.name} ➔ {toAccount?.name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: fromAccount?.color || '#94A3B8' }}
                          />
                          {fromAccount?.name || 'အကောင့်'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Delete button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className={`text-sm sm:text-base font-extrabold ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatMMK(tx.amount, myanmarNumerals)}
                    </p>
                  </div>

                  {/* Delete with inline confirmation */}
                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteTransaction(tx.id);
                          setConfirmDeleteId(null);
                        }}
                        className="py-1 px-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                      >
                        ဖျက်မည်
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="py-1 px-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                      >
                        မဖျက်ပါ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(tx.id)}
                      title="ဖျက်ပစ်မည်"
                      className="sm:opacity-60 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
    </Localized>
  );
};
