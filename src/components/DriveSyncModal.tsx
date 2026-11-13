import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle,
  AlertTriangle,
  X,
  LogOut,
  FileText,
  Loader2,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  getAccessToken,
  reauthenticateDriveAccess,
} from '../services/auth';
import {
  findDriveBackupFile,
  uploadBackupToDrive,
  downloadBackupFromDrive,
} from '../services/driveSync';
import { AppState } from '../types';
import { Localized, useLanguage } from '../i18n';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isOnline: boolean;
  isDriveSyncReady: boolean;
  appState: AppState;
  onRestoreState: (restoredState: AppState) => void;
  onUpdateSyncTime: (timestamp: string, includesApiKey?: boolean) => void;
  onDriveSyncReady: (ready: boolean) => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  isOnline,
  isDriveSyncReady,
  appState,
  onRestoreState,
  onUpdateSyncTime,
  onDriveSyncReady,
}) => {
  const { t } = useLanguage();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [driveFile, setDriveFile] = useState<{ id: string; modifiedTime: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [syncChoice, setSyncChoice] = useState<'choose-source' | 'no-backup' | null>(null);

  // Check Drive file when opened and logged in
  useEffect(() => {
    if (isOpen && user) {
      checkDriveStatus();
    }
  }, [isOpen, user, isOnline]);

  const checkDriveStatus = async () => {
    try {
      setIsCheckingDrive(true);
      if (!isOnline) {
        onDriveSyncReady(false);
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        onDriveSyncReady(false);
        return;
      }
      const file = await findDriveBackupFile(token);
      setDriveFile(file ? { id: file.id, modifiedTime: file.modifiedTime } : null);
      if (!isDriveSyncReady) {
        setSyncChoice(file ? 'choose-source' : 'no-backup');
      }
    } catch (err: any) {
      console.warn('Failed to query drive file:', err);
      setStatusMsg({
        type: 'error',
        text: t('Google Drive အရန်ဖိုင်ကို စစ်ဆေး၍ မရပါ။ အင်တာနက်နှင့် ခွင့်ပြုချက်ကို စစ်ဆေးပါ။'),
      });
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (!res) return;

      setStatusMsg({
        type: 'success',
        text: `${t('မင်္ဂလာပါ ')}${res.user.displayName || res.user.email}! ${t('Google Drive နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ။')}`,
      });
      onDriveSyncReady(false);
      setIsCheckingDrive(true);
      try {
        const file = await findDriveBackupFile(res.accessToken);
        setDriveFile(file ? { id: file.id, modifiedTime: file.modifiedTime } : null);
        setSyncChoice(file ? 'choose-source' : 'no-backup');
      } catch (error) {
        console.error('Failed to check for an existing Drive backup:', error);
        setStatusMsg({
          type: 'error',
          text: t('Google Drive အရန်ဖိုင်ကို စစ်ဆေး၍ မရပါ။ အင်တာနက်နှင့် ခွင့်ပြုချက်ကို စစ်ဆေးပါ။'),
        });
      } finally {
        setIsCheckingDrive(false);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: t('Google အကောင့်ဖြင့် ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ကြည့်ပါ။'),
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleBackupNow = async (useCurrentAccessToken = false) => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const token = useCurrentAccessToken
        ? (await getAccessToken()) || (await reauthenticateDriveAccess())
        : await reauthenticateDriveAccess();

      const result = await uploadBackupToDrive(appState, token);
      setDriveFile({ id: result.fileId, modifiedTime: result.modifiedTime });
      onDriveSyncReady(true);
      onUpdateSyncTime(result.modifiedTime, Boolean(appState.geminiApiKey));
      setSyncChoice(null);
      setStatusMsg({
        type: 'success',
        text: t('Google Drive ပေါ်သို့ စာရင်းဒေတာများ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!'),
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: `${t('Google Drive သို့ သိမ်းဆည်းရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ (Error: ')}${err.message})`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmRestore = async (useCurrentAccessToken = false) => {
    if (!driveFile) return;
    setIsSyncing(true);
    setStatusMsg(null);
    setShowRestoreConfirm(false);
    try {
      const token = useCurrentAccessToken
        ? (await getAccessToken()) || (await reauthenticateDriveAccess())
        : await reauthenticateDriveAccess();

      const { state, modifiedTime } = await downloadBackupFromDrive(driveFile.id, token);
      onRestoreState(state);
      onDriveSyncReady(true);
      onUpdateSyncTime(modifiedTime, Boolean(state.geminiApiKey));
      setSyncChoice(null);
      setStatusMsg({
        type: 'success',
        text: t('Google Drive ပေါ်ရှိ စာရင်းဒေတာများကို အောင်မြင်စွာ ပြန်လည်ရယူပြီးပါပြီ!'),
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: `${t('Drive မှ ဒေတာရယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: ')}${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Local JSON File export
  const handleExportLocalJson = () => {
    const localBackup = { ...appState };
    delete localBackup.geminiApiKey;
    const jsonStr = JSON.stringify(localBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myanmar_household_ledger_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local JSON File import
  const handleImportLocalJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.transactions && parsed.accounts) {
          onRestoreState(parsed);
          setStatusMsg({
            type: 'success',
            text: t('Local JSON ဖိုင်မှ ဒေတာများကို အောင်မြင်စွာ ပြန်လည်ထည့်သွင်းပြီးပါပြီ!'),
          });
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: t('ဖိုင်ပုံစံ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ စစ်ဆေးပါ။'),
        });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <Localized>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner shrink-0">
              <Cloud className="w-5 h-5 text-sky-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate">Google Drive Sync & Backup</h3>
              <p className="text-xs text-sky-100 mt-0.5 line-clamp-1">
                စက်ပြောင်းသုံးခြင်းနှင့် အချက်အလက်များ မပျောက်ပျက်စေရန် သိမ်းဆည်းခြင်း
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="shrink-0 relative z-10 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {!isOnline && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              အင်တာနက်မရှိပါ။ Drive sync ကို အင်တာနက်ပြန်ရသောအခါ ပြန်အသုံးပြုနိုင်ပါမည်။
            </div>
          )}

          <div className="space-y-3">
            {!user && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-amber-950 dark:text-amber-100">
                    သတိပြုရန် - Google Drive မချိတ်ထားပါက ဒေတာများ ပျောက်ဆုံးနိုင်ပါသည်
                  </h4>
                  <p className="text-amber-900/85 dark:text-amber-300/85 leading-relaxed">
                    လက်ရှိတွင် စာရင်းများကို သင့်ဖုန်း/ကွန်ပျူတာ Browser မှတ်ဉာဏ် (Local Storage) ၌သာ သိမ်းဆည်းထားပါသည်။ ဖုန်းပျောက်ခြင်း၊ စက်အသစ်ပြောင်းခြင်း (သို့မဟုတ်) Browser ဒေတာရှင်းမိပါက စာရင်းများ ပြန်မရနိုင်တော့ပါ။ စာရင်းများ အမြဲလုံခြုံစိတ်ချရစေရန် Google Drive ဖြင့် ချိတ်ဆက်ထားရန် အထူးအကြံပြုအပ်ပါသည်။
                  </p>
                </div>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 text-center space-y-3">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="avatar"
                        className="h-10 w-10 shrink-0 rounded-full border border-blue-400"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {user.displayName || 'Google User'}
                      </h4>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="shrink-0 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900"
                  >
                    <span className="flex items-center gap-1">
                      <LogOut className="h-3.5 w-3.5" />
                      ထွက်မည်
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Google Drive တွင် စာရင်းများကို အလိုအလျောက် Cloud Backup သိမ်းဆည်းရန် Google Account ဖြင့် ဝင်ရောက်ပါ
                  </p>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSigningIn || !isOnline}
                      className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-md transition-all hover:bg-slate-50 active:scale-98"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 48 48">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>{isSigningIn ? 'ဝင်ရောက်နေပါသည်...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Drive Status & Actions */}
          {user && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Drive ဖိုင် အခြေအနေ:</span>
                  {isCheckingDrive ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> စစ်ဆေးနေပါသည်...
                    </span>
                  ) : driveFile ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> သိမ်းထားပြီးဖြစ်သည်
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Drive ပေါ်တွင် ဖိုင်မရှိသေးပါ
                    </span>
                  )}
                </div>

                {driveFile && (
                  <p className="text-[11px] text-slate-500">
                    နောက်ဆုံး သိမ်းဆည်းခဲ့သည့်အချိန်:{' '}
                    {new Date(driveFile.modifiedTime).toLocaleString()}
                  </p>
                )}
              </div>

              {syncChoice && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {syncChoice === 'choose-source'
                      ? 'Drive တွင် အရန်ဒေတာ ရှိပါသည်။ ဘယ်ဒေတာကို သုံးမလဲ?'
                      : 'Drive တွင် အရန်ဒေတာ မရှိသေးပါ'}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {syncChoice === 'choose-source'
                      ? 'ဒီစက်ထဲကဒေတာကို ရွေးပါက Drive အရန်ကို အစားထိုးပါမည်။ Drive ဒေတာကို ရွေးပါက ဒီစက်ထဲကဒေတာကို အစားထိုးပါမည်။'
                      : 'ဒီစက်ထဲတွင် ရှိပြီးသားစာရင်းများကို Google Drive သို့ အရန်သိမ်းနိုင်ပါသည်။'}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleBackupNow(true)}
                      disabled={isSyncing || isCheckingDrive || !isOnline}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                      {syncChoice === 'choose-source'
                        ? 'ဒီစက်ထဲကဒေတာကို သုံးမည်'
                        : 'ဒီစက်ထဲကဒေတာကို Drive သို့သိမ်းမည်'}
                    </button>
                    {syncChoice === 'choose-source' ? (
                      <button
                        onClick={() => setShowRestoreConfirm(true)}
                        disabled={isSyncing || isCheckingDrive || !isOnline}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <CloudDownload className="h-4 w-4 text-emerald-600" />
                        Drive ဒေတာကို သုံးမည်
                      </button>
                    ) : (
                      <button
                        onClick={() => setSyncChoice(null)}
                        disabled={isSyncing}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        အခုမလုပ်သေးပါ
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Actions Grid */}
              {!syncChoice && <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBackupNow()}
                  disabled={isSyncing || isCheckingDrive || !isOnline}
                  className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex flex-col items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-98"
                >
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-5 h-5" />
                  )}
                  <span>Google account အတည်ပြုပြီး သိမ်းမည်</span>
                  <span className="text-[10px] font-normal text-blue-100">
                    {appState.geminiApiKey
                      ? 'စာရင်းနှင့် API key ကို Drive သို့ backup လုပ်မည်'
                      : 'လက်ရှိစာရင်းများကို Drive သို့ ပို့မည်'}
                  </span>
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isSyncing || !driveFile || !isOnline}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs flex flex-col items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-98"
                >
                  <CloudDownload className="w-5 h-5 text-emerald-600" />
                  <span>Drive မှ ပြန်ယူမည်</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Google account ကို ပြန်အတည်ပြုပြီး Drive မှ ပြန်ယူမည်
                  </span>
                </button>
              </div>}
            </div>
          )}

          {/* Status Alert Message */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2 border ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Destructive Restore Confirmation Dialog */}
          {showRestoreConfirm && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100">
                    သတိပြုရန်: လက်ရှိ အချက်အလက်များကို အစားထိုးမလား?
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-1">
                    Google Drive မှ အချက်အလက်များကို ပြန်လည်ရယူပါက လက်ရှိဖုန်း/ကွန်ပျူတာပေါ်ရှိ စာရင်းများကို Drive ရှိ နောက်ဆုံး backup ဖြင့် အစားထိုးသွားပါမည်။ သေချာပါသလား?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowRestoreConfirm(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                >
                  မလုပ်ဆောင်ပါ
                </button>
                <button
                  onClick={() => handleConfirmRestore(syncChoice === 'choose-source')}
                  disabled={isSyncing}
                  className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  သေချာပါသည်၊ ပြန်လည်ရယူမည်
                </button>
              </div>
            </div>
          )}

          {/* Offline Local Backup & Restore */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-500" />
              အော့ဖ်လိုင်း (Local) ဖိုင် အနေဖြင့် သိမ်းခြင်း / တင်ခြင်း
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLocalJson}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                JSON ဖိုင် သိမ်းမည်
              </button>

              <label className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <RefreshCw className="w-3.5 h-3.5" />
                ဖိုင် ပြန်တင်မည်
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportLocalJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Localized>
  );
};
