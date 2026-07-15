import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Screens where pressing back should exit the app (or ask to confirm) instead
// of navigating to a previous in-app screen. These are the "root" screens of
// each tab / the auth flow.
const EXIT_ROUTES = new Set(['/feed', '/login', '/']);

/**
 * Makes the Android hardware back button behave like the on-screen back
 * arrows: go back a screen normally, but on a root screen, press-back-twice
 * exits the app instead of doing nothing or closing unexpectedly.
 * No-ops on web/iOS — this only wires up on native Android.
 */
export default function useHardwareBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef(0);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener('backButton', () => {
      const path = locationRef.current.pathname;

      if (EXIT_ROUTES.has(path)) {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          App.exitApp();
        } else {
          lastBackPress.current = now;
          // Lightweight toast-less nudge; a real toast lib can replace this.
          console.log('Press back again to exit');
        }
        return;
      }

      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/feed');
      }
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, [navigate]);
}
