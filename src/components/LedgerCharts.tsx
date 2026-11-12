import React, { useState } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingDown,
  TrendingUp,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Account,
  Category,
  Transaction,
  CategoryBreakdownItem,
  DailyExpenseItem,
} from '../types';
import {
  calculateCategoryBreakdown,
  calculateDailyExpenses,
  formatMMK,
} from '../utils/ledger';
import { Localized, useLanguage } from '../i18n';

interface LedgerChartsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  balances: Record<string, number>;
  selectedMonth: string; // YYYY-MM
  myanmarNumerals: boolean;
}

export const LedgerCharts: React.FC<LedgerChartsProps> = ({
  transactions,
  categories,
  accounts,
  balances,
  selectedMonth,
  myanmarNumerals,
}) => {
  const { language } = useLanguage();
  const [chartMode, setChartMode] = useState<'daily' | 'category' | 'accounts'>('daily');
  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');
  const [hoveredDay, setHoveredDay] = useState<DailyExpenseItem | null>(null);

  const dailyData = calculateDailyExpenses(transactions, selectedMonth);
  const categoryBreakdown = calculateCategoryBreakdown(
    transactions,
    categories,
    breakdownType,
    selectedMonth
  );

  const maxDaily = Math.max(...dailyData.map((d) => d.amount), 1);
  const totalCategoryAmount = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Localized>
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
      {/* Chart Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            အသုံးစရိတ် သုံးသပ်ချက်
          </h3>
        </div>

        {/* Tab Buttons */}
        <div className="flex max-w-full items-center overflow-x-auto p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setChartMode('daily')}
            className={`shrink-0 whitespace-nowrap py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              chartMode === 'daily'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            နေ့စဉ်
          </button>
          <button
            onClick={() => setChartMode('category')}
            className={`shrink-0 whitespace-nowrap py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              chartMode === 'category'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            အမျိုးအစား
          </button>
          <button
            onClick={() => setChartMode('accounts')}
            className={`shrink-0 whitespace-nowrap py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              chartMode === 'accounts'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            အကောင့်များ
          </button>
        </div>
      </div>

      {/* Mode 1: Daily Spending Bar Chart */}
      {      chartMode === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ရက်စွဲအလိုက် အသုံးစရိတ်</span>
            {hoveredDay && (
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {hoveredDay.date}: {formatMMK(hoveredDay.amount, myanmarNumerals)}
              </span>
            )}
          </div>

          {dailyData.every((day) => day.amount === 0) ? (
            <div className="text-center py-12 text-xs text-slate-400">
              ယခုလအတွက် အသုံးစရိတ် မှတ်တမ်းမရှိသေးပါ
            </div>
          ) : (
          /* Responsive SVG Bar Chart */
          <div className="relative h-56 sm:h-64 w-full pt-4">
            <div className="flex items-end justify-between h-48 gap-1 border-b border-slate-200 dark:border-slate-800 pb-1">
              {dailyData.map((d, index) => {
                const heightPercent = maxDaily > 0 ? (d.amount / maxDaily) * 100 : 0;
                const isHighest = d.amount === maxDaily && d.amount > 0;
                const isHovered = hoveredDay?.date === d.date;

                return (
                  <div
                    key={d.date}
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isHovered
                          ? 'bg-rose-500 scale-x-110'
                          : isHighest
                          ? 'bg-amber-500'
                          : d.amount > 0
                          ? 'bg-emerald-500 hover:bg-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800/40'
                      }`}
                      style={{
                        height: `${Math.max(4, heightPercent)}%`,
                      }}
                    />
                    {/* Day label every few days or on hover */}
                    <span
                      className={`text-[9px] mt-1 text-slate-400 truncate ${
                        (index + 1) % 5 === 0 || index === 0 || index === dailyData.length - 1
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {index + 1}
                    </span>
                    </div>
                );
              })}
            </div>

            {/* Sub labels */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              <span>၁ ရက်</span>
              <span>လလယ် (၁၅ ရက်)</span>
              <span>
                {language === 'en'
                  ? `End of month (${dailyData.length} days)`
                  : `လကုန် (${dailyData.length} ရက်)`}
              </span>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Mode 2: Category Breakdown */}
      {chartMode === 'category' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBreakdownType('expense')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  breakdownType === 'expense'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                အသုံးစရိတ် အမျိုးအစားများ
              </button>
              <button
                onClick={() => setBreakdownType('income')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  breakdownType === 'income'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ဝင်ငွေ အမျိုးအစားများ
              </button>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              စုစုပေါင်း: {formatMMK(totalCategoryAmount, myanmarNumerals)}
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              ယခုလအတွက် စာရင်းအချက်အလက် မရှိသေးပါ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Visual Strip Bar */}
              <div className="md:col-span-2">
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
                  {categoryBreakdown.map((item) => (
                    <div
                      key={item.categoryName}
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                      title={`${item.categoryName}: ${item.percentage}%`}
                      className="h-full transition-all duration-500 hover:opacity-80"
                    />
                  ))}
                </div>
              </div>

              {/* Category Detailed List */}
              {categoryBreakdown.map((item) => (
                <div
                  key={item.categoryName}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.categoryName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {item.count} ကြိမ် မှတ်ထားသည်
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatMMK(item.amount, myanmarNumerals)}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Accounts Envelope Breakdown */}
      {chartMode === 'accounts' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            အကောင့်တစ်ခုစီတွင် လက်ရှိကျန်ရှိနေသော ငွေပမာဏ နှိုင်းယှဉ်ချက်
          </p>
          {accounts.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              အကောင့်ထည့်ပြီးနောက် လက်ကျန်ငွေကို ဤနေရာတွင် ကြည့်နိုင်ပါသည်
            </div>
          ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const bal = balances[acc.id] ?? acc.initialBalance;
              const totalWealth = Object.values(balances).reduce((sum, b) => sum + Math.max(0, b), 0);
              const ratio = totalWealth > 0 ? Math.round((Math.max(0, bal) / totalWealth) * 100) : 0;

              return (
                <div key={acc.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="text-slate-800 dark:text-slate-200">{acc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-bold">
                        {formatMMK(bal, myanmarNumerals)}
                      </span>
                      <span className="text-[10px] text-slate-400">({ratio}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(2, ratio))}%`,
                        backgroundColor: acc.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
    </Localized>
  );
};
