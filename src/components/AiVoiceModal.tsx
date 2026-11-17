import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Download,
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
import { Localized, useLanguage } from '../i18n';
import type { AutomaticSpeechRecognitionPipeline, ProgressInfo } from '@huggingface/transformers';

const SPEECH_MODEL_ID = 'onnx-community/whisper-tiny';
const SPEECH_SAMPLE_RATE = 16_000;

let speechPipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

const loadSpeechPipeline = (onProgress: (progress: ProgressInfo) => void) => {
  if (!speechPipelinePromise) {
    speechPipelinePromise = import('@huggingface/transformers')
      .then(({ pipeline }) =>
        pipeline('automatic-speech-recognition', SPEECH_MODEL_ID, {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: onProgress,
        })
      )
      .catch((error: unknown) => {
        speechPipelinePromise = null;
        throw error;
      });
  }
  return speechPipelinePromise;
};

const decodeAudioAtSpeechRate = async (blob: Blob) => {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const channelCount = decoded.numberOfChannels;
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < channelCount; channel++) {
      const channelData = decoded.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        mono[i] += channelData[i] / channelCount;
      }
    }

    if (decoded.sampleRate === SPEECH_SAMPLE_RATE) return mono;

    const outputLength = Math.floor(mono.length * SPEECH_SAMPLE_RATE / decoded.sampleRate);
    const resampled = new Float32Array(outputLength);
    const sampleRatio = decoded.sampleRate / SPEECH_SAMPLE_RATE;
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = i * sampleRatio;
      const lowerIndex = Math.floor(sourceIndex);
      const upperIndex = Math.min(lowerIndex + 1, mono.length - 1);
      const fraction = sourceIndex - lowerIndex;
      resampled[i] = mono[lowerIndex] * (1 - fraction) + mono[upperIndex] * fraction;
    }
    return resampled;
  } finally {
    await audioContext.close();
  }
};

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
  const { language, t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable parsed fields
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [audioRecordingSupported, setAudioRecordingSupported] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);

  const isOpenRef = useRef(isOpen);
  const audioRecordingSupportedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioSizeRef = useRef(0);
  const audioTooLargeRef = useRef(false);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  isOpenRef.current = isOpen;

  useEffect(() => {
    const canRecordAudio = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
    audioRecordingSupportedRef.current = canRecordAudio;
    setAudioRecordingSupported(canRecordAudio);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setIsAudioRecording(false);
    }
  }, [isOpen]);

  const handleLoadSpeechModel = async () => {
    setIsModelLoading(true);
    setModelProgress(0);
    setErrorMsg(null);
    try {
      await loadSpeechPipeline((progress) => {
        if (progress.status === 'progress_total' && progress.total > 0) {
          setModelProgress(Math.round(progress.progress));
        }
      });
      setIsModelReady(true);
      setModelProgress(100);
    } catch (error) {
      console.error(
        'Unable to load local speech model:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      setModelProgress(null);
      setErrorMsg(t('စက်တွင်း speech model ကို မဖွင့်နိုင်ပါ။ ပထမဆုံး download လုပ်ရန် အင်တာနက်ချိတ်ဆက်ပြီး ထပ်စမ်းပါ။'));
    } finally {
      setIsModelLoading(false);
    }
  };

  const startAudioRecording = async () => {
    if (!audioRecordingSupportedRef.current || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        language === 'en'
          ? 'Audio recording is not available in this browser. Type your transaction instead.'
          : 'ဤ browser တွင် အသံဖမ်းယူ၍မရပါ။ စာရိုက်ထည့်ပါ။'
      );
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isOpenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const supportedMimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? [
            'audio/mp4',
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
          ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
        : undefined;
      const recorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 64_000,
        ...(supportedMimeType ? { mimeType: supportedMimeType } : {}),
      });
      mediaStreamRef.current = stream;
      stream = null;
      audioChunksRef.current = [];
      audioSizeRef.current = 0;
      audioTooLargeRef.current = false;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (audioTooLargeRef.current || event.data.size === 0) return;
        if (audioSizeRef.current + event.data.size > 6 * 1024 * 1024) {
          audioTooLargeRef.current = true;
          if (recorder.state === 'recording') recorder.stop();
          return;
        }
        audioSizeRef.current += event.data.size;
        audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setIsAudioRecording(false);
        setErrorMsg(
          language === 'en'
            ? 'Audio recording failed. Check microphone permissions and try again.'
            : 'အသံဖမ်းယူမှု မအောင်မြင်ပါ။ မိုက်ခရိုဖုန်းခွင့်ပြုချက်ကို စစ်ဆေးပြီး ထပ်စမ်းပါ။'
        );
      };
      recorder.onstop = () => {
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }

        const audioTooLarge = audioTooLargeRef.current;
        audioTooLargeRef.current = false;
        audioSizeRef.current = 0;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/mp4',
        });
        audioChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setIsAudioRecording(false);

        if (!isOpenRef.current) return;
        if (audioTooLarge) {
          setErrorMsg(
            language === 'en'
              ? 'The recording was too large. Record a shorter clip and try again.'
              : 'အသံဖမ်းချက် အရမ်းကြီးနေပါသည်။ ပိုတိုအောင်ဖမ်းပြီး ထပ်စမ်းပါ။'
          );
          return;
        }
        if (audioBlob.size === 0) {
          setErrorMsg(
            language === 'en'
              ? 'No audio was recorded. Try again.'
              : 'အသံဖမ်းမရပါ။ ထပ်စမ်းကြည့်ပါ။'
          );
          return;
        }
        void handleTranscribeAudio(audioBlob);
      };

      recorder.start(1000);
      setInputText('');
      setParsedResult(null);
      setErrorMsg(null);
      setIsAudioRecording(true);
      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 30_000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      console.error('Unable to record audio:', error);
      setIsAudioRecording(false);
      setErrorMsg(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? language === 'en'
            ? 'Allow microphone access in your browser settings, then try again.'
            : 'Browser ဆက်တင်တွင် မိုက်ခရိုဖုန်း အသုံးပြုခွင့်ပေးပြီး ထပ်စမ်းပါ။'
          : language === 'en'
            ? 'Could not start audio recording. Check your microphone and try again.'
            : 'အသံဖမ်းယူမှု မစတင်နိုင်ပါ။ မိုက်ခရိုဖုန်းကို စစ်ဆေးပြီး ထပ်စမ်းပါ။'
      );
    }
  };

  const toggleListening = async () => {
    if (isAudioRecording) {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      return;
    }

    setInputText('');
    setParsedResult(null);
    setErrorMsg(null);
    await startAudioRecording();
  };

  const handleProcessInput = async (textToProcess?: string) => {
    if (!isOnline) {
      setErrorMsg(t('AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာရန် အင်တာနက်ချိတ်ဆက်မှု လိုအပ်ပါသည်။'));
      return;
    }

    const query = (textToProcess || inputText).trim();
    if (!query) {
      setErrorMsg(t('ကျေးဇူးပြု၍ အသံဖြင့် ပြောပါ သို့မဟုတ် စာရိုက်ထည့်ပါ'));
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
          ? t('Internet/server ကို ချိတ်ဆက်မရပါ။ AI သုံးရန် connection ပြန်ရမှ ပြန်စမ်းပါ။')
          : t('AI ခွဲခြမ်းစိတ်ဖြာရာတွင် အခက်အခဲရှိနေပါသည်။ လက်ဖြင့် စစ်ဆေးပြင်ဆင်နိုင်ပါသည်။')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setErrorMsg(null);
    let processingStage: 'audio' | 'inference' = 'audio';
    try {
      const audio = await decodeAudioAtSpeechRate(audioBlob);
      if (!speechPipelinePromise) throw new Error('speech-model-not-loaded');
      const transcriber = await speechPipelinePromise;
      processingStage = 'inference';
      const result = await transcriber(audio, { language: 'burmese', task: 'transcribe' });
      const transcript = result.text.trim();
      if (!transcript) throw new Error('no-speech');
      if (!isOpenRef.current) return;
      setInputText(transcript);
      await handleProcessInput(transcript);
    } catch (error) {
      console.error(
        'Local audio transcription failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      setErrorMsg(
        error instanceof Error && error.message === 'no-speech'
          ? t('အသံမှ စာသားမရပါ။ ပိုရှင်းအောင် ပြောပြီး ထပ်စမ်းပါ။')
          : error instanceof Error && error.message === 'speech-model-not-loaded'
            ? t('အသံသုံးရန် speech model ကို အရင် download လုပ်ပါ။')
          : processingStage === 'audio'
            ? t('အသံဖိုင်ကို ဖတ်မရပါ။ ထပ်မံအသံဖမ်းပြီး စမ်းပါ။')
            : t('စက်တွင်း model ဖြင့် အသံကို စာသားပြောင်းမရပါ။ ထပ်မံအသံဖမ်းပြီး စမ်းပါ။')
      );
    } finally {
      setIsTranscribing(false);
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
      setErrorMsg(t('ပမာဏ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။'));
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg(t('ကျေးဇူးပြု၍ အကောင့်တစ်ခု ရွေးချယ်ပေးပါ။'));
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
  const isVoiceActive = isAudioRecording;

  if (!isOpen) return null;

  return (
    <Localized>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4">
      <div className="drawer-panel drawer-enter relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl rounded-b-none border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl">
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

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                  {t('စက်တွင်း AI speech model')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('အသံဖြင့်သုံးရန် model ကို တစ်ကြိမ် download လုပ်ပါ။ အသံကို စက်ထဲမှာပဲ စာသားပြောင်းပါမည်။')}
                </p>
              </div>
              {isModelReady && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  <Check className="h-3.5 w-3.5" />
                  {t('model အဆင်သင့်ဖြစ်ပါပြီ')}
                </span>
              )}
            </div>

            {!isModelReady && (
              <button
                type="button"
                onClick={handleLoadSpeechModel}
                disabled={isModelLoading || isTranscribing || isLoading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isModelLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isModelLoading
                  ? t('model ကို download လုပ်နေသည်...')
                  : t('စက်တွင်း model ကို download လုပ်မည်')}
              </button>
            )}

            {isModelLoading && (
              <div className="mt-3" aria-live="polite">
                <div
                  role="progressbar"
                  aria-label={t('model download တိုးတက်မှု')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={modelProgress ?? 0}
                  className="h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-700"
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
                    style={{ width: `${modelProgress ?? 0}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs font-bold text-indigo-800 dark:text-indigo-200">
                  {modelProgress ?? 0}%
                </p>
              </div>
            )}

            {isModelReady && (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300" role="status">
                {t('စက်တွင်း model ကို download လုပ်ပြီးပါပြီ။ အသံသွင်းနိုင်ပါပြီ။')}
              </p>
            )}
          </div>

          {/* Voice Input Section with Visualizer */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 text-center">
            <div className="relative">
              {isVoiceActive && (
                <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping scale-150" />
              )}
              <button
                type="button"
                onClick={toggleListening}
                disabled={!audioRecordingSupported || !isModelReady || isModelLoading || isLoading || isTranscribing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isVoiceActive
                    ? 'bg-rose-500 shadow-rose-500/50 scale-105'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-indigo-500/30 hover:scale-105 active:scale-95'
                }`}
                aria-label={isVoiceActive
                  ? 'Stop local audio recording'
                  : 'Start local audio recording'}
              >
                {isVoiceActive ? (
                  <MicOff className="w-8 h-8 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isAudioRecording
                ? language === 'en'
                  ? 'Recording... Tap the mic again to finish.'
                  : 'အသံဖမ်းနေပါသည်။ ပြီးလျှင် mic ကို ထပ်နှိပ်ပါ။'
                : isTranscribing
                  ? t('အသံကို ဤစက်ပေါ်တွင် စာသားပြောင်းနေသည်...')
                  : isModelLoading
                    ? t('model ကို download လုပ်နေသည်...')
                  : !audioRecordingSupported
                    ? t('ဤ browser တွင် အသံဖမ်းခြင်း မရနိုင်ပါ။')
                    : !isModelReady
                      ? t('အသံသုံးရန် speech model ကို အရင် download လုပ်ပါ။')
                    : t('Mic ကိုနှိပ်၍ အသံဖမ်းပြီး စာသားပြောင်းရန် ထပ်နှိပ်ပါ။')}
            </p>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t('အသံကို ဤစက်ပေါ်တွင် စာသားပြောင်းပါမည်။ ပထမအကြိမ်တွင် model ကို download လုပ်ပြီး cache ထားပါမည်။ အသံဖိုင်ကို မပို့ဘဲ စာသားကိုသာ transaction ခွဲခြမ်းစိတ်ဖြာရန် ပို့ပါမည်။')}
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
                disabled={isLoading || isTranscribing || !isOnline || !inputText.trim()}
                className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                title="AI ခွဲခြမ်းစိတ်ဖြာမည်"
              >
                {isLoading || isTranscribing ? (
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
                  disabled={!isOnline || isLoading || isTranscribing}
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
    </Localized>
  );
};
