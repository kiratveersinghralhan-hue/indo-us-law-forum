import { createContext, useContext } from 'react';

export type MotionMode = 'system' | 'reduced' | 'full';
export const motionPreferenceKey = 'editorial-motion-mode';

export const MotionContext = createContext({
  reduced: true,
  systemReduced: true,
  mode: 'system' as MotionMode,
  welcomeOpen: false,
  openWelcome: () => {},
  setMode: (_mode: MotionMode) => {
    void _mode;
  },
});
export const useMotion = () => useContext(MotionContext);
