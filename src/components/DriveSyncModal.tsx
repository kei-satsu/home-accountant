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
import { googleSignIn, logout, getAccessToken } from '../services/auth';
import {
  findDriveBackupFile,
  uploadBackupToDrive,
  downloadBackupFromDrive,
} from '../services/driveSync';
import { AppState } from '../types';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  appState: AppState;
  onRestoreState: (restoredState: AppState) => void;
  onUpdateSyncTime: (timestamp: string) => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  appState,
  onRestoreState,
  onUpdateSyncTime,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [driveFile, setDriveFile] = useState<{ id: string; modifiedTime: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Check Drive file when opened and logged in
  useEffect(() => {
    if (isOpen && user) {
      checkDriveStatus();
    }
  }, [isOpen, user]);

  const checkDriveStatus = async () => {
    try {
      setIsCheckingDrive(true);
      const token = await getAccessToken();
      if (!token) return;
      const file = await findDriveBackupFile(token);
      if (file) {
        setDriveFile({ id: file.id, modifiedTime: file.modifiedTime });
      } else {
        setDriveFile(null);
      }
    } catch (err: any) {
      console.warn('Failed to query drive file:', err);
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setStatusMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setStatusMsg({
          type: 'success',
          text: `မင်္ဂလာပါ ${res.user.displayName || res.user.email}! Google Drive နှင့် အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ။`,
        });
        const token = res.accessToken;
        const file = await findDriveBackupFile(token);
        if (file) {
          setDriveFile({ id: file.id, modifiedTime: file.modifiedTime });
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: 'Google အကောင့်ဖြင့် ဝင်ရောက်ခြင်း မအောင်မြင်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ကြည့်ပါ။',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleBackupNow = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Access token unavailable. Please sign in again.');
      }

      const result = await uploadBackupToDrive(appState, token);
      setDriveFile({ id: result.fileId, modifiedTime: result.modifiedTime });
      onUpdateSyncTime(result.modifiedTime);
      setStatusMsg({
        type: 'success',
        text: 'Google Drive ပေါ်သို့ စာရင်းဒေတာများ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: 'Google Drive သို့ သိမ်းဆည်းရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ (Error: ' + err.message + ')',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!driveFile) return;
    setIsSyncing(true);
    setStatusMsg(null);
    setShowRestoreConfirm(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Token unavailable');

      const { state, modifiedTime } = await downloadBackupFromDrive(driveFile.id, token);
      onRestoreState(state);
      onUpdateSyncTime(modifiedTime);
      setStatusMsg({
        type: 'success',
        text: 'Google Drive ပေါ်ရှိ စာရင်းဒေတာများကို အောင်မြင်စွာ ပြန်လည်ရယူပြီးပါပြီ!',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: 'Drive မှ ဒေတာရယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: ' + err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Local JSON File export
  const handleExportLocalJson = () => {
    const jsonStr = JSON.stringify(appState, null, 2);
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
            text: 'Local JSON ဖိုင်မှ ဒေတာများကို အောင်မြင်စွာ ပြန်လည်ထည့်သွင်းပြီးပါပြီ!',
          });
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: 'ဖိုင်ပုံစံ မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ စစ်ဆေးပါ။',
        });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
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
          {/* User Sign-In Status Card */}
          {user ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border border-blue-400"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {user.displayName || 'Google User'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                ထွက်မည်
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Data Loss Warning Box when Not Signed In */}
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

              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 text-center space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Google Drive တွင် စာရင်းများကို အလိုအလျောက် Cloud Backup သိမ်းဆည်းရန် Google Account ဖြင့် ဝင်ရောက်ပါ
                </p>

              {/* Official Google Sign-In Styled Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSigningIn}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-md border border-slate-300 transition-all active:scale-98"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
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
            </div>
          </div>
        )}

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

              {/* Sync Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBackupNow}
                  disabled={isSyncing}
                  className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex flex-col items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-98"
                >
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-5 h-5" />
                  )}
                  <span>Drive သို့ သိမ်းမည်</span>
                  <span className="text-[10px] font-normal text-blue-100">
                    လက်ရှိစာရင်းများကို Drive သို့ ပို့မည်
                  </span>
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isSyncing || !driveFile}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs flex flex-col items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-98"
                >
                  <CloudDownload className="w-5 h-5 text-emerald-600" />
                  <span>Drive မှ ပြန်ယူမည်</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    Drive ရှိ အချက်အလက်များ ပြန်ဆွဲမည်
                  </span>
                </button>
              </div>
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
                  onClick={handleConfirmRestore}
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
  );
};
