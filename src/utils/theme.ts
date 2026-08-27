/**
 * Ultra-fast 60 FPS / 0ms decoupled theme manager.
 * Directly manages DOM classes and localStorage without triggering root React component re-renders.
 */

export function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('hcmue_theme') || localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    // Ignore storage errors
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'dark';
}

export function initAppTheme(): void {
  if (typeof window === 'undefined') return;
  const theme = getInitialTheme();
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function toggleAppTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  const isDark = root.classList.toggle('dark');
  if (isDark) {
    root.classList.remove('light');
    try {
      localStorage.setItem('hcmue_theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } catch (e) {}
  } else {
    root.classList.add('light');
    try {
      localStorage.setItem('hcmue_theme', 'light');
      localStorage.setItem('theme', 'light');
    } catch (e) {}
  }
  window.dispatchEvent(new CustomEvent('hcmue-theme-toggle', { detail: { isDark } }));
  return isDark;
}
