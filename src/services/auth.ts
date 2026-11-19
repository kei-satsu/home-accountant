import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  reauthenticateWithPopup,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const ACCESS_TOKEN_MAX_AGE_MS = 50 * 60 * 1000;

const provider = new GoogleAuthProvider();
provider.addScope(DRIVE_SCOPE);

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

const cacheAccessToken = (accessToken: string) => {
  cachedAccessToken = accessToken;
  cachedAccessTokenExpiresAt = Date.now() + ACCESS_TOKEN_MAX_AGE_MS;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        cachedAccessTokenExpiresAt = 0;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedAccessTokenExpiresAt = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cacheAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const reauthenticateDriveAccess = async (): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in with the Google account that owns this Drive backup.');
  }

  const reauthProvider = new GoogleAuthProvider();
  reauthProvider.addScope(DRIVE_SCOPE);
  reauthProvider.setCustomParameters({ prompt: 'select_account' });

  const result = await reauthenticateWithPopup(currentUser, reauthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google did not provide Drive access. Please authorize Drive access and try again.');
  }

  cacheAccessToken(credential.accessToken);
  return credential.accessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && Date.now() >= cachedAccessTokenExpiresAt) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
  }
  return cachedAccessToken;
};

export const clearCachedAccessToken = (accessToken: string) => {
  if (cachedAccessToken === accessToken) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
};
