'use client';

import { useEffect, useState } from 'react';
import { syncFromServer } from '@/lib/sync';
import LoginScreen from './LoginScreen';

type AuthState = 'checking' | 'login' | 'authenticated';

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then((data: { authenticated?: boolean; authDisabled?: boolean }) => {
        if (data.authenticated || data.authDisabled) {
          setAuthState('authenticated');
        } else {
          setAuthState('login');
        }
      })
      .catch(() => {
        setAuthState('authenticated');
      });
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated') return;

    syncFromServer().then((updated) => {
      if (updated) {
        window.dispatchEvent(new Event('progress-synced'));
      }
      setSynced(true);
    }).catch(() => {
      setSynced(true);
    });
  }, [authState]);

  if (authState === 'checking' || (authState === 'authenticated' && !synced)) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (authState === 'login') {
    return <LoginScreen onSuccess={() => setAuthState('authenticated')} />;
  }

  return <>{children}</>;
}
