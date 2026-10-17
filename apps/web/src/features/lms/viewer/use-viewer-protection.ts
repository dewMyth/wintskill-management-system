import { useEffect, useState } from 'react';

/**
 * Discourages copying while a material is open: blocks save/print shortcuts, hides the page when
 * printing (see `html.protected-viewing` in index.css) and reports when the app loses focus so
 * the content can be blurred (e.g. while switching apps to take a screenshot).
 * Screenshots cannot be fully prevented on the web; the watermark makes copies traceable.
 */
export function useViewerProtection() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('protected-viewing');
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase()))
        e.preventDefault();
    };
    const hide = () => setHidden(true);
    const show = () => setHidden(document.visibilityState === 'hidden');
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      root.classList.remove('protected-viewing');
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { hidden };
}
