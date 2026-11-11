import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Send,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Loader2,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { Account, Category, Transaction } from '../types';
import { formatMMK } from '../utils/ledger';

interface AiVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  balances: Record<string, number>;
  geminiApiKey: string;
  onOpenApiKeySettings: () => void;
  isOnline: boolean;
  myanmarNumerals: boolean;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

interface ParsedResult {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string | null;
  accountName: string | null;
  description: string;
  needsAccountClarification: boolean;
  clarificationQuestion: string | null;
  aiSummary?: string;
  source?: string;
  warning?: string;
}

export const AiVoiceModal: React.FC<AiVoiceModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  balances,
  geminiApiKey,
  onOpenApiKeySettings,
  isOnline,
  myanmarNumerals,
  onSaveTransaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Editable parsed fields
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'my-MM'; // Burmese locale

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('မိုက်ခရိုဖုန်း အသုံးပြုခွင့် ပေးထားရန် လိုအပ်ပါသည်။');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      setErrorMsg('သင့် browser တွင် Speech Recognition အဆင်မပြေပါက စာရိုက်၍ ထည့်သွင်းနိုင်ပါသည်။');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputText('');
      setParsedResult(null);
      setErrorMsg(null);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleProcessInput = async (textToProcess?: string) => {
    if (!isOnline) {
      setErrorMsg('AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာရန် အင်တာနက်ချိတ်ဆက်မှု လိုအပ်ပါသည်။');
      return;
    }

    const query = (textToProcess || inputText).trim();
    if (!query) {
      setErrorMsg('ကျေးဇူးပြု၍ အသံဖြင့် ပြောပါ သို့မဟုတ် စာရိုက်ထည့်ပါ');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/parse-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'X-Gemini-Api-Key': geminiApiKey } : {}),
        },
        body: JSON.stringify({
          text: query,
          accounts,
          categories,
        }),
      });

      if (!res.ok) {
        throw new Error('AI parsing failed');
      }

      const data = await res.json();
      const result: ParsedResult = { ...data.result, source: data.source, warning: data.warning };

      setParsedResult(result);
      setAmount(result.amount);
      setType(result.type);
      setSelectedCategoryName(result.category);
      setNote(result.description);

      // Account selection logic
      if (result.accountId) {
        setSelectedAccountId(result.accountId);
      } else if (result.accountName) {
        const found = accounts.find((a) => a.name.includes(result.accountName!));
        if (found) setSelectedAccountId(found.id);
      } else {
        // If clarification needed, leave empty or default to first
        setSelectedAccountId(accounts[0]?.id || '');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err instanceof TypeError
          ? 'Internet/server ကို ချိတ်ဆက်မရပါ။ AI သုံးရန် connection ပြန်ရမှ ပြန်စမ်းပါ။'
          : 'AI ခွဲခြမ်းစိတ်ဖြာရာတွင် အခက်အခဲရှိနေပါသည်။ လက်ဖြင့် စစ်ဆေးပြင်ဆင်နိုင်ပါသည်။'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccountClarification = (accId: string) => {
    setSelectedAccountId(accId);
    if (parsedResult) {
      setParsedResult({
        ...parsedResult,
        accountId: accId,
        needsAccountClarification: false,
      });
    }
  };

  const handleConfirmSave = () => {
    if (!amount || amount <= 0) {
      setErrorMsg('ပမာဏ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။');
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg('ကျေးဇူးပြု၍ အကောင့်တစ်ခု ရွေးချယ်ပေးပါ။');
      return;
    }

    const matchedCategory = categories.find((c) => c.name === selectedCategoryName);

    onSaveTransaction({
      amount,
      type,
      categoryId: matchedCategory?.id || '',
      categoryName: selectedCategoryName || (type === 'income' ? 'လစာ/ဝင်ငွေ' : 'အထွေထွေ'),
      fromAccountId: selectedAccountId,
      date,
      note: note || (type === 'income' ? 'အဝင်ငွေ' : 'အသုံးစရိတ်'),
      voiceRawText: inputText,
    });

    onClose();
    // Reset state
    setInputText('');
    setParsedResult(null);
  };

  const samplePrompts = [
    'ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်',
    'အိမ်စရိတ်ထဲက ဈေးဖိုး ၂သောင်းဖိုး ဝယ်လိုက်တယ်',
    'လစာ ၁၀ သိန်း KBZPay ထဲ ဝင်တယ်',
    'ကျောင်းစရိတ်ထဲက ကလေးစာအုပ် ၃သောင်းဖိုး ဝယ်တယ်',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold">AI ဖြင့် စာရင်းသွင်းမည်</h3>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="shrink-0 relative z-10 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <div
            className={`rounded-2xl border p-4 ${
              geminiApiKey
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <KeyRound className={`mt-0.5 h-5 w-5 shrink-0 ${
                geminiApiKey ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${
                  geminiApiKey ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'
                }`}>
                  {geminiApiKey ? 'Gemini API key ထည့်ထားသည်' : 'Gemini API key မထည့်ရသေးပါ'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {geminiApiKey
                    ? 'စာသားကို Gemini AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာပါမည်။ API key မမှန်ခြင်း သို့မဟုတ် Gemini မရနိုင်ခြင်းရှိပါက စည်းမျဉ်းအခြေပြု parser သို့ ပြောင်းသုံးမည်ဖြစ်ပြီး ရလဒ်ကို စစ်ဆေးပေးပါ။'
                    : 'တကယ့် Gemini AI ကို သုံးရန် သင့်ကိုယ်ပိုင် Google AI Studio API key လိုအပ်ပါသည်။ Key မထည့်ဘဲ ဆက်သုံးပါက AI မဟုတ်သော စည်းမျဉ်းအခြေပြု parser ဖြင့်သာ ခန့်မှန်းပေးပါမည်။'}
                </p>
                <button
                  type="button"
                  onClick={onOpenApiKeySettings}
                  className={`mt-2 text-xs font-bold hover:underline ${
                    geminiApiKey ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {geminiApiKey ? 'API key ဆက်တင်ပြင်ရန် →' : 'API key ထည့်ရန် →'}
                </button>
              </div>
            </div>
          </div>

          {!isOnline && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Offline ဖြစ်နေပါသည်။ AI parser သုံးရန် အင်တာနက်လိုအပ်ပြီး၊ ချိတ်ဆက်မှု ပြန်ရမှ အသုံးပြုနိုင်ပါမည်။
            </div>
          )}

          {/* Voice Input Section with Visualizer */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 text-center">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping scale-150" />
              )}
              <button
                onClick={toggleListening}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                  isListening
                    ? 'bg-rose-500 shadow-rose-500/50 scale-105'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-indigo-500/30 hover:scale-105 active:scale-95'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isListening ? 'နားထောင်နေပါသည်...' : 'မိုက်ခရိုဖုန်းကို နှိပ်၍ ပြောပါ'}
            </p>
          </div>

          {/* Text Input with submit */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              စာဖြင့် ရိုက်ထည့်ရန်:
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleProcessInput();
                }}
                placeholder="ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်..."
                className="w-full py-3 pl-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleProcessInput()}
                disabled={isLoading || !isOnline || !inputText.trim()}
                className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                title="AI ခွဲခြမ်းစိတ်ဖြာမည်"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sample Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
              နမူနာများ:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(p);
                    handleProcessInput(p);
                  }}
                  disabled={!isOnline || isLoading}
                  className="text-xs py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-700 text-left"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Interactive Clarification Question if Account Ambiguous */}
          {parsedResult && parsedResult.needsAccountClarification && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 animate-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    AI လက်ထောက် မေးခွန်း:
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    {parsedResult.clarificationQuestion ||
                      `ဘယ်အကောင့်ထဲမှ ${parsedResult.type === 'income' ? 'ထည့်' : 'နှုတ်'} ရမလဲ ရွေးချယ်ပေးပါခင်ဗျာ:`}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {accounts.map((acc) => {
                      const bal = balances[acc.id] ?? acc.initialBalance;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSelectAccountClarification(acc.id)}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: acc.color }}
                          />
                          <span>{acc.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            ({formatMMK(bal, myanmarNumerals)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Result Preview & Confirmation Card */}
          {parsedResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-4 animate-in fade-in-50">
              {parsedResult.source !== 'gemini-3.8-flash' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  {parsedResult.source === 'rule-engine'
                    ? 'Gemini API key မရှိသေးပါ။ အောက်ပါရလဒ်ကို စည်းမျဉ်းအခြေပြု parser ဖြင့် ခန့်မှန်းထားသောကြောင့် မသိမ်းမီ သေချာစစ်ဆေးပါ။'
                    : parsedResult.warning || 'Gemini AI ကို အသုံးမပြုနိုင်သဖြင့် စည်းမျဉ်းအခြေပြု parser ကို သုံးထားပါသည်။ မသိမ်းမီ သေချာစစ်ဆေးပါ။'}
                </div>
              )}
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {parsedResult.source === 'gemini-3.8-flash'
                    ? 'Gemini AI တွေ့ရှိချက် စစ်ဆေးရန်:'
                    : 'အလိုအလျောက် ခွဲခြမ်းစိတ်ဖြာမှု (စည်းမျဉ်းအခြေပြု) စစ်ဆေးရန်:'}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    type === 'income'
                      ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100'
                      : 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100'
                  }`}
                >
                  {type === 'income' ? 'အဝင်ငွေ' : 'အထွက်စရိတ်'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Amount */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    ပမာဏ (ကျပ်):
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-sm font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                    {formatMMK(amount, myanmarNumerals)}
                  </span>
                </div>

                {/* Account */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    {type === 'income' ? 'ဝင်မည့် အကောင့်:' : 'နှုတ်မည့် အကောင့်:'}
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">အကောင့် ရွေးချယ်ပါ</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatMMK(balances[a.id] ?? a.initialBalance, myanmarNumerals)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    အမျိုးအစား (Category):
                  </label>
                  <select
                    value={selectedCategoryName}
                    onChange={(e) => setSelectedCategoryName(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white"
                  >
                    {categories
                      .filter((c) => c.type === type)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    ရက်စွဲ:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  မှတ်ချက်:
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Save Confirm Button */}
              <button
                onClick={handleConfirmSave}
                disabled={!selectedAccountId || amount <= 0}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Check className="w-4 h-4" />
                အတည်ပြုပြီး စာရင်းသွင်းမည်
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
