import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Wallet,
  Home,
  GraduationCap,
  ShieldAlert,
  Smartphone,
  CreditCard,
  PiggyBank,
  Heart,
  Car,
} from 'lucide-react';
import { Account } from '../types';
import { formatMMK } from '../utils/ledger';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  balances: Record<string, number>;
  myanmarNumerals: boolean;
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Home', icon: Home, label: 'အိမ်' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'ကျောင်း' },
  { name: 'ShieldAlert', icon: ShieldAlert, label: 'အရေးပေါ်' },
  { name: 'Wallet', icon: Wallet, label: 'ပိုက်ဆံအိတ်' },
  { name: 'Smartphone', icon: Smartphone, label: 'KPay/Wave' },
  { name: 'CreditCard', icon: CreditCard, label: 'ဘဏ်ကတ်' },
  { name: 'PiggyBank', icon: PiggyBank, label: 'စုငွေ' },
  { name: 'Car', icon: Car, label: 'ကား/ခရီး' },
  { name: 'Heart', icon: Heart, label: 'ကျန်းမာရေး' },
];

const AVAILABLE_COLORS = [
  '#059669', // Emerald
  '#2563EB', // Blue
  '#DC2626', // Red
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#0284C7', // Sky
  '#E11D48', // Rose
  '#4B5563', // Slate
];

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  balances,
  myanmarNumerals,
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingAccount({
      id: `acc-${Date.now()}`,
      name: '',
      icon: 'Wallet',
      color: AVAILABLE_COLORS[0],
      initialBalance: 0,
      description: '',
    });
  };

  const handleStartEdit = (acc: Account) => {
    setIsCreating(false);
    setEditingAccount({ ...acc });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name?.trim()) return;

    onSaveAccount({
      id: editingAccount.id || `acc-${Date.now()}`,
      name: editingAccount.name.trim(),
      icon: editingAccount.icon || 'Wallet',
      color: editingAccount.color || AVAILABLE_COLORS[0],
      initialBalance: Number(editingAccount.initialBalance) || 0,
      description: editingAccount.description?.trim() || '',
    });

    setEditingAccount(null);
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              အကောင့်ခွဲများ စီမံခန့်ခွဲခြင်း
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              အိမ်စရိတ်၊ ကျောင်းစရိတ်၊ အရေးပေါ် စသည့် အကောင့်များ စိတ်ကြိုက်ထည့်သွင်းပြင်ဆင်ပါ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Add / Edit Form */}
          {editingAccount ? (
            <form
              onSubmit={handleSave}
              className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {isCreating ? '+ အကောင့်အသစ် ဖွင့်မည်' : 'အကောင့် ပြင်ဆင်မည်'}
              </h4>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  အကောင့် အမည်:
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount.name || ''}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, name: e.target.value })
                  }
                  placeholder="ဥပမာ - မုန့်ဖိုး ရန်ပုံငွေ"
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  စတင်လက်ကျန်ငွေ (Initial Balance MMK):
                </label>
                <input
                  type="number"
                  value={editingAccount.initialBalance ?? 0}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      initialBalance: Number(e.target.value),
                    })
                  }
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                  အိုင်ကွန် ရွေးချယ်ပါ:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = editingAccount.icon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() =>
                          setEditingAccount({ ...editingAccount, icon: item.name })
                        }
                        className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                  အရောင် ရွေးချယ်ပါ:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((col) => {
                    const isSelected = editingAccount.color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() =>
                          setEditingAccount({ ...editingAccount, color: col })
                        }
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          isSelected ? 'scale-120 border-white shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  အသေးစိတ် ဖော်ပြချက်:
                </label>
                <input
                  type="text"
                  value={editingAccount.description || ''}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, description: e.target.value })
                  }
                  placeholder="ဥပမာ - ကလေးများ မုန့်ဖိုးနှင့် ကစားစရာစရိတ်"
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300"
                >
                  မလုပ်ဆောင်ပါ
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  သိမ်းမည်
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleStartCreate}
              className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-dashed border-emerald-300 dark:border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              + အကောင့်အသစ် ဖွင့်မည်
            </button>
          )}

          {/* Accounts List */}
          <div className="space-y-2 pt-2">
            {accounts.map((acc) => {
              const bal = balances[acc.id] ?? acc.initialBalance;
              return (
                <div
                  key={acc.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: acc.color }}
                    >
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {acc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        လက်ကျန်: {formatMMK(bal, myanmarNumerals)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(acc)}
                      title="ပြင်ဆင်မည်"
                      className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${acc.name}" အကောင့်ကို ဖျက်ပစ်ရန် သေချာပါသလား?`
                            )
                          ) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                        title="ဖျက်မည်"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
