'use client';

import { useEffect, useState } from 'react';
import { syncFromServer } from '@/lib/sync';

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    syncFromServer().then((updated) => {
      if (updated) {
        window.dispatchEvent(new Event('progress-synced'));
      }
      setSynced(true);
    }).catch(() => {
      setSynced(true);
    });
  }, []);

  if (!synced) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Sincronizando progreso...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
