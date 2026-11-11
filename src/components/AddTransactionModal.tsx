import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowRightLeft,
  Check,
  Calendar,
  Wallet,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { formatMMK } from '../utils/ledger';

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

  const handleQuickAdd = (value: number) => {
    const current = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
    setAmountStr(String(current + value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/,/g, ''), 10);
    if (!amount || amount <= 0) {
      setErrorMsg('ကျေးဇူးပြု၍ မှန်ကန်သော ငွေပမာဏ ရိုက်ထည့်ပါ');
      return;
    }

    if (!fromAccountId) {
      setErrorMsg('ကျေးဇူးပြု၍ အကောင့် ရွေးချယ်ပါ');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg('လွှဲပြောင်းလက်ခံမည့် အကောင့် ရွေးချယ်ပါ');
        return;
      }
      if (fromAccountId === toAccountId) {
        setErrorMsg('မူရင်းအကောင့်နှင့် လွှဲမည့်အကောင့် မတူညီရပါ');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {type === 'transfer' ? 'အကောင့်ချင်း ငွေလွှဲခြင်း' : 'စာရင်း အသစ်သွင်းခြင်း'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Segmented Control: Expense, Income, Transfer */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-xl transition-all ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              အသုံးစရိတ် (အထွက်)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 rounded-xl transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ဝင်ငွေ (အဝင်)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`py-2 rounded-xl transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ငွေလွှဲ (အကောင့်ချင်း)
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              ငွေပမာဏ (ကျပ်)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full py-3 px-4 rounded-xl text-2xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute right-4 top-4 text-xs font-semibold text-slate-400">
                MMK
              </span>
            </div>
            {currentAmountNum > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                = {formatMMK(currentAmountNum, myanmarNumerals)}
              </p>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1000, 5000, 10000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  +{formatMMK(val, myanmarNumerals)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* From Account */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {type === 'transfer'
                  ? 'လွှဲထုတ်မည့် အကောင့်:'
                  : type === 'income'
                  ? 'ထည့်သွင်းမည့် အကောင့်:'
                  : 'နှုတ်ယူမည့် အကောင့်:'}
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMMK(balances[a.id] ?? a.initialBalance, myanmarNumerals)})
                  </option>
                ))}
              </select>
            </div>

            {/* To Account (only for transfer) */}
            {type === 'transfer' ? (
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  လွှဲလက်ခံမည့် အကောင့်:
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="">အကောင့် ရွေးချယ်ပါ</option>
                  {accounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatMMK(balances[a.id] ?? a.initialBalance, myanmarNumerals)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              /* Date Picker */
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  ရက်စွဲ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Transfer Date picker if transfer */}
          {type === 'transfer' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                ရက်စွဲ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Category Chips (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                အမျိုးအစား (Category) ရွေးချယ်ပါ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {filteredCategories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium text-left flex items-center gap-1.5 border transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.name}</span>
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
  );
};
