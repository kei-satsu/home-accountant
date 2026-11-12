import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { LanguageProvider } from './i18n';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('Failed to register offline app support:', error);
    });
  });
}

const page = window.location.pathname.replace(/\/+$/, '') === '/privacy-policy'
  ? <PrivacyPolicy />
  : <App />;

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>{page}</LanguageProvider>
);
