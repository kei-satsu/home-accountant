import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Cloud,
  KeyRound,
  Languages,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { logout } from '../services/auth';
import { Localized, useLanguage } from '../i18n';

interface MorePageProps {
  user: User | null;
  hasGeminiApiKey: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  myanmarNumerals: boolean;
  onToggleMyanmarNumerals: () => void;
  onOpenDriveSync: () => void;
  onOpenApiKeySettings: () => void;
}

export const MorePage: React.FC<MorePageProps> = ({
  user,
  hasGeminiApiKey,
  darkMode,
  onToggleDarkMode,
  myanmarNumerals,
  onToggleMyanmarNumerals,
  onOpenDriveSync,
  onOpenApiKeySettings,
}) => {
  const { language, setLanguage } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
    } catch (error) {
      console.error('Failed to sign out:', error);
      setLogoutError(error instanceof Error ? error.message : 'အကောင့်မှ ထွက်၍ မရပါ။');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Localized>
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            အကောင့်နှင့် ဆက်တင်များ
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            အကောင့်၊ backup နှင့် app ပြင်ဆင်မှုများကို စီမံပါ။
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {(user?.displayName || user?.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {user ? user.displayName || 'Google User' : 'အကောင့်မချိတ်ထားပါ'}
                  </h3>
                  {user && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Check className="h-3 w-3" />
                      ချိတ်ဆက်ထားသည်
                    </span>
                  )}
                </div>
                <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                  {user?.email || 'Google Drive backup အတွက် Google အကောင့်ကို ချိတ်ဆက်ပါ။'}
                </p>
              </div>
            </div>
            {user && (
              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'ထွက်နေပါသည်...' : 'အကောင့်မှ ထွက်မည်'}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  အကောင့်မှထွက်ခြင်းသည် ဒီစက်တွင်းရှိ စာရင်းဒေတာများကို မဖျက်ပါ။
                </p>
              </div>
            )}
            {logoutError && (
              <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {logoutError}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Google Drive Sync</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {user
                    ? 'စာရင်းဒေတာများကို Google Drive နှင့် အလိုအလျောက် backup လုပ်ပါ။'
                    : 'စာရင်းများကို backup လုပ်ရန် Google အကောင့်ကို ချိတ်ဆက်ပါ။'}
                </p>
              </div>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <button
              type="button"
              onClick={onOpenDriveSync}
              className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              {user ? 'Drive Sync ကို စီမံရန်' : 'Google Drive ချိတ်ဆက်ရန်'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">Gemini API key</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {hasGeminiApiKey ? 'API key ထည့်ထားသည်' : 'API key မထည့်ရသေးပါ'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  API key ကို ဒီ browser ထဲတွင်သာ သိမ်းဆည်းပါသည်။
                </p>
              </div>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${hasGeminiApiKey ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
            </div>
            <button
              type="button"
              onClick={onOpenApiKeySettings}
              className="mt-4 min-h-11 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700"
            >
              {hasGeminiApiKey ? 'API key ပြင်ရန်' : 'API key ထည့်ရန်'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <h3 className="font-bold text-slate-900 dark:text-white">ကိုယ်ပိုင်ပြင်ဆင်မှု</h3>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => setLanguage(language === 'my' ? 'en' : 'my')}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300"
              >
                <Languages className="h-4 w-4 shrink-0" />
                <span className="flex-1">ဘာသာစကား</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'my' ? 'မြန်မာ · EN' : 'English · မြန်မာ'}
                </span>
              </button>
              <button
                type="button"
                onClick={onToggleMyanmarNumerals}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300"
              >
                <span className="w-4 shrink-0 text-center text-xs font-bold">123</span>
                <span className="flex-1">ဂဏန်းပုံစံ</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {myanmarNumerals ? 'မြန်မာ ၁၂၃' : 'English 123'}
                </span>
              </button>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300"
              >
                {darkMode ? <Sun className="h-4 w-4 shrink-0 text-amber-500" /> : <Moon className="h-4 w-4 shrink-0" />}
                <span className="flex-1">{darkMode ? 'အလင်းမုဒ်' : 'အမှောင်မုဒ်'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {darkMode ? 'ဖွင့်ထားသည်' : 'ပိတ်ထားသည်'}
                </span>
              </button>
            </div>
          </section>
        </div>
      </section>
    </Localized>
  );
};
