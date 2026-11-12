import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Check,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { formatMMK } from '../utils/ledger';
import { Localized, useLanguage } from '../i18n';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  balances: Record<string, number>;
  myanmarNumerals: boolean;
  defaultAccountId?: string;
  initialType?: TransactionType;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  balances,
  myanmarNumerals,
  defaultAccountId,
  initialType = 'expense',
  onSave,
}) => {
  const { t } = useLanguage();
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize initial state on open
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setAmountStr('');
      setErrorMsg(null);
      const acc = defaultAccountId || accounts[0]?.id || '';
      setFromAccountId(acc);
      // toAccount default to 2nd account if exists
      const otherAcc = accounts.find((a) => a.id !== acc);
      setToAccountId(otherAcc?.id || '');

      const availableCats = categories.filter((c) => c.type === (initialType === 'income' ? 'income' : 'expense'));
      setCategoryId(availableCats[0]?.id || '');
    }
  }, [isOpen, defaultAccountId, initialType, accounts, categories]);

  // When type changes, switch available category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType !== 'transfer') {
      const availableCats = categories.filter((c) => c.type === newType);
      setCategoryId(availableCats[0]?.id || '');
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const tabs: TransactionType[] = ['expense', 'income', 'transfer'];
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (tabs.indexOf(type) + direction + tabs.length) % tabs.length;
    const nextType = tabs[nextIndex];
    handleTypeChange(nextType);
    document.getElementById(`transaction-tab-${nextType}`)?.focus();
  };

  const handleQuickAdd = (value: number) => {
    const current = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    setAmountStr(String(current + value));
  };

  const handleStepAmount = (step: number) => {
    const current = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    const nextAmount = Math.max(0, current + step);
    setAmountStr(nextAmount ? String(nextAmount) : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/,/g, ''), 10);
    if (!amount || amount <= 0) {
      setErrorMsg(t('ကျေးဇူးပြု၍ မှန်ကန်သော ငွေပမာဏ ရိုက်ထည့်ပါ'));
      return;
    }

    if (!fromAccountId) {
      setErrorMsg(t('ကျေးဇူးပြု၍ အကောင့် ရွေးချယ်ပါ'));
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg(t('လွှဲပြောင်းလက်ခံမည့် အကောင့် ရွေးချယ်ပါ'));
        return;
      }
      if (fromAccountId === toAccountId) {
        setErrorMsg(t('မူရင်းအကောင့်နှင့် လွှဲမည့်အကောင့် မတူညီရပါ'));
        return;
      }
    }

    const selectedCat = categories.find((c) => c.id === categoryId);

    onSave({
      amount,
      type,
      categoryId: type === 'transfer' ? '' : categoryId,
      categoryName: type === 'transfer' ? 'ငွေလွှဲ' : selectedCat?.name || 'အထွေထွေ',
      fromAccountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date,
      note: note.trim() || (type === 'transfer' ? 'အကောင့်ချင်းငွေလွှဲ' : selectedCat?.name || ''),
    });

    onClose();
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  const currentAmountNum = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
  const expenseLabel = 'အသုံးစရိတ် (အထွက်)';
  const incomeLabel = 'ဝင်ငွေ (အဝင်)';
  const transferLabel = 'ငွေလွှဲ (အကောင့်ချင်း)';
  const selectedTypeLabel = type === 'expense'
    ? expenseLabel
    : type === 'income'
    ? incomeLabel
    : transferLabel;
  const fromAccountLabel = type === 'transfer'
    ? 'လွှဲထုတ်မည့် အကောင့်:'
    : type === 'income'
    ? 'ထည့်သွင်းမည့် အကောင့်:'
    : 'နှုတ်ယူမည့် အကောင့်:';

  const renderAccountOptions = (
    availableAccounts: Account[],
    selectedAccountId: string,
    onSelectAccount: (accountId: string) => void,
    label: string,
    emptyMessage = 'အကောင့် မရှိသေးပါ'
  ) => (
    <div
      role="group"
      aria-label={t(label)}
      className="flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain pb-2"
    >
      {availableAccounts.length > 0 ? (
        availableAccounts.map((account) => {
          const isSelected = selectedAccountId === account.id;
          return (
            <button
              key={account.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectAccount(account.id)}
              className={`flex min-w-[148px] shrink-0 items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Wallet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{account.name}</span>
                <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {formatMMK(balances[account.id] ?? account.initialBalance, myanmarNumerals)}
                </span>
              </span>
            </button>
          );
        })
      ) : (
        <span className="py-2 text-xs text-slate-500 dark:text-slate-400">
          {t(emptyMessage)}
        </span>
      )}
    </div>
  );

  return (
    <Localized>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 pt-4 dark:border-slate-800 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                {selectedTypeLabel}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            role="tablist"
            aria-label="စာရင်းအမျိုးအစား"
            className="grid grid-cols-3 gap-2"
          >
            <button
              type="button"
              role="tab"
              id="transaction-tab-expense"
              aria-controls="transaction-panel"
              aria-selected={type === 'expense'}
              aria-label={expenseLabel}
              title={expenseLabel}
              tabIndex={type === 'expense' ? 0 : -1}
              onClick={() => handleTypeChange('expense')}
              onKeyDown={handleTabKeyDown}
              className={`flex min-h-[52px] items-center justify-center rounded-t-xl px-1.5 py-2 transition-colors ${
                type === 'expense'
                  ? 'border-b-2 border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'
              }`}
            >
              <TrendingDown className="h-[18px] w-[18px] shrink-0" />
            </button>
            <button
              type="button"
              role="tab"
              id="transaction-tab-income"
              aria-controls="transaction-panel"
              aria-selected={type === 'income'}
              aria-label={incomeLabel}
              title={incomeLabel}
              tabIndex={type === 'income' ? 0 : -1}
              onClick={() => handleTypeChange('income')}
              onKeyDown={handleTabKeyDown}
              className={`flex min-h-[52px] items-center justify-center rounded-t-xl px-1.5 py-2 transition-colors ${
                type === 'income'
                  ? 'border-b-2 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="h-[18px] w-[18px] shrink-0" />
            </button>
            <button
              type="button"
              role="tab"
              id="transaction-tab-transfer"
              aria-controls="transaction-panel"
              aria-selected={type === 'transfer'}
              aria-label={transferLabel}
              title={transferLabel}
              tabIndex={type === 'transfer' ? 0 : -1}
              onClick={() => handleTypeChange('transfer')}
              onKeyDown={handleTabKeyDown}
              className={`flex min-h-[52px] items-center justify-center rounded-t-xl px-1.5 py-2 transition-colors ${
                type === 'transfer'
                  ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'
              }`}
            >
              <ArrowRightLeft className="h-[18px] w-[18px] shrink-0" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form
          id="transaction-panel"
          role="tabpanel"
          aria-labelledby={`transaction-tab-${type}`}
          onSubmit={handleSubmit}
          className="space-y-5 overflow-y-auto p-4 sm:p-6"
        >
          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="transaction-amount" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              ငွေပမာဏ (ကျပ်)
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800">
              <span className="shrink-0 rounded-xl bg-white px-2.5 py-2 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                MMK
              </span>
              <input
                id="transaction-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="min-w-0 flex-1 appearance-none bg-transparent px-1 py-2 text-xl font-bold text-slate-900 outline-hidden placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600 sm:text-2xl"
              />
              <div className="flex shrink-0 flex-col gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleStepAmount(1000)}
                  aria-label={t('ငွေပမာဏ ၁၀၀၀ ကျပ် တိုးရန်')}
                  title={t('ငွေပမာဏ ၁၀၀၀ ကျပ် တိုးရန်')}
                  className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepAmount(-1000)}
                  aria-label={t('ငွေပမာဏ ၁၀၀၀ ကျပ် လျှော့ရန်')}
                  title={t('ငွေပမာဏ ၁၀၀၀ ကျပ် လျှော့ရန်')}
                  className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-rose-600 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
            {currentAmountNum > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                = {formatMMK(currentAmountNum, myanmarNumerals)}
              </p>
            )}

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1000, 5000, 10000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 sm:text-xs"
                >
                  +{formatMMK(val, myanmarNumerals)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 py-2 text-[10px] font-semibold text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 sm:text-xs"
              >
                ပမာဏ ရှင်းရန်
              </button>
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {fromAccountLabel}
              </label>
              {renderAccountOptions(accounts, fromAccountId, setFromAccountId, fromAccountLabel)}
            </div>

            {type === 'transfer' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  လွှဲလက်ခံမည့် အကောင့်:
                </label>
                {renderAccountOptions(
                  accounts.filter((account) => account.id !== fromAccountId),
                  toAccountId,
                  setToAccountId,
                  'လွှဲလက်ခံမည့် အကောင့်:',
                  'လွှဲရန် အခြားအကောင့် ထည့်ပါ'
                )}
              </div>
            )}

            <div className="space-y-1 sm:max-w-xs">
              <label htmlFor="transaction-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                ရက်စွဲ
              </label>
              <input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Category Chips (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                အမျိုးအစား (Category) ရွေးချယ်ပါ
              </label>
              <div
                role="group"
                aria-label={t('အမျိုးအစား')}
                className="flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain pb-2"
              >
                {filteredCategories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      aria-pressed={isSelected}
                      onClick={() => setCategoryId(c.id)}
                      className={`flex min-h-11 min-w-[144px] max-w-[180px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="min-w-0 truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              မှတ်ချက် / အကြောင်းအရာ
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ဥပမာ - မနက်စာ မုန့်ဟင်းခါး၊ ကလေးကျောင်းစရိတ်..."
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Check className="w-4 h-4" />
              စာရင်း သိမ်းဆည်းမည်
            </button>
          </div>
        </form>
      </div>
    </div>
    </Localized>
  );
};
