import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  Sparkles,
  Plus,
  Mic,
  ArrowRightLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Localized, useLanguage } from '../i18n';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  myanmarNumerals: boolean;
  onToggleMyanmarNumerals: () => void;
  user: User | null;
  onOpenDriveModal: () => void;
  onOpenApiKeySettings: () => void;
  hasGeminiApiKey: boolean;
  onOpenAiModal: () => void;
  onOpenAddModal: () => void;
  onOpenTransferModal: () => void;
  selectedMonth: string; // YYYY-MM
  onChangeMonth: (newMonth: string) => void;
}

const MONTH_NAMES_MM: Record<string, string> = {
  '01': 'ဇန်နဝါရီ',
  '02': 'ဖေဖော်ဝါရီ',
  '03': 'မတ်',
  '04': 'ဧပြီ',
  '05': 'မေ',
  '06': 'ဇွန်',
  '07': 'ဇူလိုင်',
  '08': 'ဩဂုတ်',
  '09': 'စက်တင်ဘာ',
  '10': 'အောက်တိုဘာ',
  '11': 'နိုဝင်ဘာ',
  '12': 'ဒီဇင်ဘာ',
};
const MONTH_NAMES_EN: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  myanmarNumerals,
  onToggleMyanmarNumerals,
  user,
  onOpenDriveModal,
  onOpenApiKeySettings,
  hasGeminiApiKey,
  onOpenAiModal,
  onOpenAddModal,
  onOpenTransferModal,
  selectedMonth,
  onChangeMonth,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthName = (language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_MM)[monthStr] || monthStr;

  const handlePrevMonth = () => {
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  return (
    <Localized>
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-emerald-100 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/icons/icon.svg"
              alt="Home Accountant logo"
              className="h-9 w-9 shrink-0 rounded-xl shadow-md shadow-emerald-500/20 sm:h-10 sm:w-10 sm:rounded-2xl"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Home Accountant
              </h1>
              {hasGeminiApiKey && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span>Gemini</span>
                </span>
              )}
            </div>
          </div>

          {/* Desktop/Tablet Month Navigator */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {monthName} {yearStr}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* AI Assistant Button (Desktop) */}
            <button
              onClick={onOpenAiModal}
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-indigo-500/25 transition-all hover:scale-102 active:scale-98"
              title="အသံ / စာဖြင့် AI စာရင်းသွင်းမည်"
            >
              <Mic className="w-4 h-4" />
              <span>AI စာရင်းသွင်း</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>

            {/* Quick Add Expense/Income (Desktop) */}
            <button
              onClick={onOpenAddModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 transition-all hover:scale-102 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>စာရင်းသွင်း</span>
            </button>

            {/* Quick Transfer (Desktop) */}
            <button
              onClick={onOpenTransferModal}
              aria-label="Transfer between accounts"
              title="အကောင့်ချင်း ငွေလွှဲမည်"
              className="hidden lg:flex p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Google Drive Sync */}
            <button
              onClick={onOpenApiKeySettings}
              aria-label="Gemini API key ဆက်တင်"
              title={hasGeminiApiKey ? 'Gemini API key ထည့်ထားသည်' : 'ကိုယ်ပိုင် Gemini API key ထည့်ရန်'}
              className={`hidden lg:block relative rounded-xl border p-1.5 sm:p-2 transition-colors ${
                hasGeminiApiKey
                  ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              {hasGeminiApiKey && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />}
            </button>

            {/* Google Drive Sync */}
            <button
              onClick={onOpenDriveModal}
              aria-label="Google Drive Backup & Sync"
              title={user ? 'Google Drive နှင့် ချိတ်ဆက်ထားပြီးဖြစ်သည်' : 'Google Drive မချိတ်ရသေးပါ (ဒေတာမပျောက်စေရန် ချိတ်ဆက်ထားပါ)'}
              className={`hidden lg:flex relative p-1.5 sm:p-2 rounded-xl border transition-colors items-center gap-1 cursor-pointer ${
                user
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <Cloud className="w-4 h-4 text-blue-500" />
              {user ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
            </button>

            {/* Myanmar/Latin Digits Toggle */}
            <button
              onClick={() => setLanguage(language === 'my' ? 'en' : 'my')}
              aria-label="ဘာသာစကား ပြောင်းရန်"
              title="ဘာသာစကား ပြောင်းရန်"
              className="hidden lg:block px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              {language === 'my' ? 'EN' : 'မြန်မာ'}
            </button>

            <button
              onClick={onToggleMyanmarNumerals}
              aria-label="Toggle Myanmar Numerals"
              title={myanmarNumerals ? 'မြန်မာဂဏန်း သုံးနေပါသည်' : 'အင်္ဂလိပ်ဂဏန်း သုံးနေပါသည်'}
              className="hidden lg:block px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              {myanmarNumerals ? '၁၂၃' : '123'}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              aria-label="Toggle Dark Mode"
              title={darkMode ? 'အလင်းမုဒ်သို့ ပြောင်းမည်' : 'အမှောင်မုဒ်သို့ ပြောင်းမည်'}
              className="hidden lg:block p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="relative lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                aria-label="ဆက်တင်များ"
                aria-expanded={isMobileMenuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {isMobileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    onClick={() => {
                      setLanguage(language === 'my' ? 'en' : 'my');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="w-4 text-center text-xs font-bold">Aa</span>
                    {language === 'my' ? 'English' : 'မြန်မာ'}
                  </button>
                  <button
                    onClick={() => {
                      onToggleDarkMode();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
                    {darkMode ? 'အလင်းမုဒ်' : 'အမှောင်မုဒ်'}
                  </button>
                  <button
                    onClick={() => {
                      onToggleMyanmarNumerals();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="w-4 text-center text-xs font-bold">123</span>
                    {myanmarNumerals ? 'အင်္ဂလိပ်ဂဏန်း သုံးမည်' : 'မြန်မာဂဏန်း သုံးမည်'}
                  </button>
                  <button
                    onClick={() => {
                      onOpenApiKeySettings();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <KeyRound className="h-4 w-4" />
                    AI ဆက်တင်
                    {hasGeminiApiKey && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>
                  <button
                    onClick={() => {
                      onOpenDriveModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Cloud className="h-4 w-4 text-blue-500" />
                    Google Drive အရန်သိမ်းခြင်း
                    <span className={`ml-auto h-2 w-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Month Navigator Sub-Bar (only visible on mobile screens) */}
        <div className="flex lg:hidden items-center justify-between pb-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between w-full bg-white dark:bg-slate-900 rounded-xl px-2 py-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {monthName} {yearStr}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
    </Localized>
  );
};
