import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { Localized } from '../i18n';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  apiKey: string;
  isDriveConnected: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  apiKey,
  isDriveConnected,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(apiKey);
      setShowKey(false);
    }
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(draft.trim());
    onClose();
  };

  const handleRemove = () => {
    onSave('');
    setDraft('');
    onClose();
  };

  return (
    <Localized>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5" />
            <div>
              <h2 className="font-bold">Gemini API key</h2>
              <p className="text-xs text-indigo-100">ကိုယ်ပိုင် Google AI Studio key ထည့်သွင်းရန်</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="ပိတ်မည်" className="rounded-lg p-2 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            API key ကို server တွင် မသိမ်းပါ။ Gemini သို့ စာရင်းစာသားခွဲခြမ်းစိတ်ဖြာရန်သာ ပို့ပြီး၊ မသိမ်းထားလျှင် စည်းမျဉ်းအခြေပြု parser ကို သုံးပါမည်။
          </p>

          <div>
            <label htmlFor="gemini-api-key" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              API key
            </label>
            <div className="relative">
              <input
                id="gemini-api-key"
                type={showKey ? 'text' : 'password'}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Google AI Studio API key"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-3 pr-12 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowKey((visible) => !visible)}
                aria-label={showKey ? 'API key ဖျောက်မည်' : 'API key ပြမည်'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Google AI Studio မှ API key ရယူရန် ↗
            </a>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {isDriveConnected
              ? 'Key ကို ဒီ browser ထဲတွင် သိမ်းပါမည်။ အလိုအလျောက် Drive sync တွင် key မပါဝင်ပါ။ Key ကို Drive backup ထဲထည့်ရန် Drive ထဲတွင် “သိမ်းမည်” ကို ကိုယ်တိုင်နှိပ်ပြီး Google account ကို ပြန်အတည်ပြုပါ။ Drive ဖိုင်ကို ဝင်ကြည့်နိုင်သူသည် key ကို ဖတ်နိုင်သဖြင့် ဤနည်းသည် end-to-end encryption မဟုတ်ပါ။'
              : 'Drive မချိတ်ထားသဖြင့် key ကို ဒီ browser ထဲတွင်သာ သိမ်းပါမည်။ စက်အသစ်၊ browser အသစ်တွင် ပြန်ထည့်ရန်လိုပြီး local JSON export ထဲတွင် key မပါဝင်ပါ။'}
          </div>
          {isDriveConnected && apiKey && (
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Key ကို ဖယ်ရှားပြီးနောက် Drive ထဲက copy ကိုပါ ဖယ်ရှားရန် key မပါဘဲ Drive backup အသစ်တစ်ခု သိမ်းပါ။
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {apiKey ? (
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Key ဖယ်ရှားမည်
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                သိမ်းမည်
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </Localized>
  );
};
