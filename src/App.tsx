import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import logo from './assets/logo.png';
import { ErrorState, Spinner } from './components/States';
import { BudgetScreen } from './screens/BudgetScreen';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { TransactionDetailScreen } from './screens/TransactionDetailScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { VoiceScreen } from './screens/VoiceScreen';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { BackHandlerProvider, useBackStack } from './state/BackHandlerContext';
import { ToastProvider } from './state/ToastContext';
import { VoiceDraftProvider } from './state/VoiceDraftContext';

const TAB_ROUTES = new Set(['/transactions', '/budget']);

/** Android hardware/gesture back: overlays first, then tabs → Home, Home → exit. */
function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const backStack = useBackStack();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      if (backStack.handle()) return;
      const path = location.pathname;
      if (path === '/' || path === '/login') {
        void CapApp.minimizeApp();
      } else if (TAB_ROUTES.has(path)) {
        navigate('/', { replace: true });
      } else if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/', { replace: true });
      }
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [navigate, location.pathname, backStack]);
}

function useKeyboardClass() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const subs = [
      Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-open')),
      Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-open')),
    ];
    return () => {
      subs.forEach((s) => void s.then((h) => h.remove()));
    };
  }, []);
}

function Splash() {
  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center gap-space-md">
      <img src={logo} alt="" className="w-16 h-16 rounded-xl" />
      <Spinner />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const { status, loadError, retryLoad, signedIn } = useAppData();
  useAndroidBack();
  useKeyboardClass();

  if (status === 'loading') return <Splash />;
  if (status === 'error')
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-margin pt-safe pb-safe">
        <ErrorState message={loadError ?? 'Could not open your data.'} onRetry={retryLoad} />
      </div>
    );
  if (!signedIn) return <LoginScreen />;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/transactions" element={<TransactionsScreen />} />
        <Route path="/budget" element={<BudgetScreen />} />
        <Route path="/voice" element={<VoiceScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/add" element={<EntryScreen />} />
        <Route path="/edit/:id" element={<EntryScreen />} />
        <Route path="/transaction/:id" element={<TransactionDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <BackHandlerProvider>
        <ToastProvider>
          <AppDataProvider>
            <VoiceDraftProvider>
              <Shell />
            </VoiceDraftProvider>
          </AppDataProvider>
        </ToastProvider>
      </BackHandlerProvider>
    </HashRouter>
  );
}
