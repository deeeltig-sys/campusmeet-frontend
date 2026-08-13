import { useEffect } from 'react';

// Why this exists: `.app-shell` uses `height: 100dvh`, which correctly
// shrinks for mobile browser chrome (address bar) but NOT reliably for
// the on-screen keyboard — support varies by browser, and inside the
// Capacitor WebView (no @capacitor/keyboard listener wired up) the
// webview doesn't resize for the keyboard at all. Without a real
// height change, the browser's default "scroll the focused input into
// view" behavior has nowhere to get extra room from except scrolling
// the WHOLE page — dragging the chat header up and off-screen along
// with the messages, instead of just the message list compressing.
//
// This hook watches the actual visible height (window.visualViewport
// where available — nearly all modern mobile browsers — and the
// Capacitor Keyboard plugin as a native fallback) and writes it to a
// `--app-vh` CSS custom property on the root. `.app-shell` then sizes
// itself off that instead of blindly trusting 100dvh, so the shell
// itself shrinks to fit above the keyboard: header stays pinned in
// the flex column, only the scrollable message list gets shorter.
export function useKeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement;

    function setVh(px) {
      root.style.setProperty('--app-vh', `${px}px`);
    }

    function clearVh() {
      root.style.removeProperty('--app-vh');
    }

    // --- Web / PWA / mobile browser path ---
    const vv = window.visualViewport;
    function onViewportChange() {
      if (!vv) return;
      setVh(vv.height);
    }
    vv?.addEventListener('resize', onViewportChange);
    vv?.addEventListener('scroll', onViewportChange); // iOS Safari nudges offsetTop, not just height
    onViewportChange();

    // --- Capacitor native app path (no-op stub on web builds) ---
    let cleanupNative = () => {};
    import('@capacitor/keyboard')
      .then(({ Keyboard }) => {
        const shownHandle = Keyboard.addListener('keyboardWillShow', (info) => {
          setVh(window.innerHeight - (info?.keyboardHeight || 0));
        });
        const hiddenHandle = Keyboard.addListener('keyboardWillHide', () => {
          // Fall back to visualViewport (or full height) once the
          // keyboard is gone rather than hardcoding innerHeight.
          if (vv) setVh(vv.height);
          else clearVh();
        });
        cleanupNative = () => {
          shownHandle.then((h) => h.remove()).catch(() => {});
          hiddenHandle.then((h) => h.remove()).catch(() => {});
        };
      })
      .catch(() => {
        // @capacitor/keyboard isn't installed/synced yet on this
        // build — visualViewport above still covers the web/PWA case.
      });

    return () => {
      vv?.removeEventListener('resize', onViewportChange);
      vv?.removeEventListener('scroll', onViewportChange);
      cleanupNative();
      clearVh();
    };
  }, []);
}
