import { useEffect, useCallback } from 'react';
import { SessionImporter } from '../utils/sessionImporter';
import type { SessionData } from '@ascii-motion/premium';

export function useAdminProjectLoader() {
  useEffect(() => {
    const stored = sessionStorage.getItem('_prj');
    if (stored) {
      try {
        const data = JSON.parse(stored) as SessionData;
        sessionStorage.removeItem('_prj');
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const file = new File([blob], 'session.asciimtn', { type: 'application/json' });
        SessionImporter.importSessionFile(file);
      } catch {
        sessionStorage.removeItem('_prj');
      }
    }
  }, []);

  const loadProjectSession = useCallback(async (sessionData: SessionData) => {
    const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
    const file = new File([blob], 'session.asciimtn', { type: 'application/json' });
    await SessionImporter.importSessionFile(file);
  }, []);

  return {
    loadProjectSession,
  };
}
