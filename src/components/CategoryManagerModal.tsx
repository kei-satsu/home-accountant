import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Category } from '../types';
import { Localized, useLanguage } from '../i18n';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [type, setType] = useState<Category['type']>('expense');
  const [color, setColor] = useState('#10B981');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (categories.some((category) => category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase())) {
      setError(language === 'en' ? 'This category already exists.' : 'ဤအမျိုးအစား ရှိပြီးသားဖြစ်သည်။');
      return;
    }

    onSaveCategory({
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      icon: 'CircleEllipsis',
      color,
      type,
    });
    setName('');
    setError('');
  };

  const handleDelete = (category: Category) => {
    const message = language === 'en'
      ? `Delete category "${category.name}"? Existing transactions will keep their saved category name.`
      : `"${category.name}" အမျိုးအစားကို ဖျက်မလား။ ရှိပြီးသားစာရင်းများတွင် အမျိုးအစားအမည်ကို မူလအတိုင်း ဆက်လက်ပြသပါမည်။`;
    if (window.confirm(message)) onDeleteCategory(category.id);
  };

  return (
    <Localized>
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="drawer-panel drawer-enter relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl rounded-b-none border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Manage categories' : 'အမျိုးအစားများ စီမံခန့်ခွဲရန်'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={language === 'en' ? 'Close' : 'ပိတ်မည်'}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto p-5">
            <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {language === 'en' ? 'Category name' : 'အမျိုးအစားအမည်'}
                <input
                  required
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {language === 'en' ? 'Type' : 'အမျိုးအစား'}
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as Category['type'])}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="expense">{language === 'en' ? 'Expense' : 'အသုံးစရိတ်'}</option>
                    <option value="income">{language === 'en' ? 'Income' : 'ဝင်ငွေ'}</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {language === 'en' ? 'Color' : 'အရောင်'}
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    aria-label={language === 'en' ? 'Category color' : 'အမျိုးအစားအရောင်'}
                    className="mt-1 block h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
              </div>

              {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                {language === 'en' ? 'Add category' : 'အမျိုးအစားအသစ် ထည့်မည်'}
              </button>
            </form>

            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {category.name}
                    </span>
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {category.type === 'expense'
                        ? language === 'en' ? 'Expense' : 'အသုံးစရိတ်'
                        : language === 'en' ? 'Income' : 'ဝင်ငွေ'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    aria-label={language === 'en' ? `Delete ${category.name}` : `${category.name} ကို ဖျက်မည်`}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Localized>
  );
};
