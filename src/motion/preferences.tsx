import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MotionContext, motionPreferenceKey } from './use-motion';
import type { MotionMode } from './use-motion';
import { useMediaQuery } from '../hooks/use-media-query';
import { MotionWelcome } from './welcome';

export const welcomeDismissedKey = 'editorial-motion-welcome-dismissed';
export const motionChoiceKey = 'editorial-motion-choice-made';
function initialPreference(): { mode: MotionMode; welcome: boolean } {
  try {
    if (sessionStorage.getItem(welcomeDismissedKey) === '1')
      return { mode: 'reduced', welcome: false };
    const saved = localStorage.getItem(motionPreferenceKey);
    // Automatically saved legacy System shows the welcome. An explicit legacy
    // System choice migrates to Plain; existing explicit Full remains Full.
    if (
      saved === 'full' ||
      saved === 'reduced' ||
      (saved === 'system' && localStorage.getItem(motionChoiceKey) === '1')
    )
      return { mode: saved === 'full' ? 'full' : 'reduced', welcome: false };
  } catch {
    /* A fresh visitor stays calm when storage is unavailable. */
  }
  return { mode: 'reduced', welcome: true };
}

export function MotionPreferences({ children }: { children: ReactNode }) {
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [preference, setPreference] = useState(initialPreference);
  const { mode, welcome } = preference;
  const setMode = useCallback((next: MotionMode) => {
    if (!['system', 'reduced', 'full'].includes(next)) return;
    next = next === 'full' ? 'full' : 'reduced';
    setPreference({ mode: next, welcome: false });
    try {
      localStorage.setItem(motionPreferenceKey, next);
      localStorage.setItem(motionChoiceKey, '1');
      sessionStorage.removeItem(welcomeDismissedKey);
    } catch {
      /* The explicit choice still applies to this visit. */
    }
  }, []);
  const dismiss = useCallback(() => {
    setPreference({ mode: 'reduced', welcome: false });
    try {
      sessionStorage.setItem(welcomeDismissedKey, '1');
    } catch {
      /* The provider retains dismissal across routes. */
    }
  }, []);
  const openWelcome = useCallback(
    () => setPreference((current) => ({ ...current, welcome: true })),
    [],
  );
  const reduced = welcome || mode !== 'full';
  useEffect(() => {
    document.documentElement.dataset.motion = mode;
    document.documentElement.dataset.motionEffective = reduced
      ? 'reduced'
      : 'full';
  }, [mode, reduced]);
  const value = useMemo(
    () => ({
      reduced,
      systemReduced,
      mode,
      setMode,
      openWelcome,
      welcomeOpen: welcome,
    }),
    [reduced, systemReduced, mode, setMode, openWelcome, welcome],
  );
  return (
    <MotionContext.Provider value={value}>
      {children}
      {welcome && (
        <MotionWelcome
          systemReduced={systemReduced}
          onChoose={setMode}
          onDismiss={dismiss}
        />
      )}
    </MotionContext.Provider>
  );
}
