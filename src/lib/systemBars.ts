import { Capacitor, registerPlugin } from '@capacitor/core';

const SystemBars = registerPlugin<{
  setTheme(options: { dark: boolean; background: string }): Promise<{ dark: boolean }>;
}>('SystemBars');

export function setSystemBarsTheme(dark: boolean, forceDarkSurface = false): void {
  if (!Capacitor.isNativePlatform()) return;
  const useDark = dark || forceDarkSurface;
  SystemBars.setTheme({
    dark: useDark,
    background: useDark ? '#0D1310' : '#F4F1E8',
  }).catch(() => undefined);
}
