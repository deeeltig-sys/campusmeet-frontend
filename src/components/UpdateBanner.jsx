import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppAPI } from '../api/client';

/**
 * Sideloaded APK, not Play Store — there's no other channel that tells a
 * student a newer build exists. On native Android this compares the
 * running app's versionCode (App.getInfo().build) against whatever the
 * backend currently reports as latest. No-ops entirely on web, since
 * the web build is always "latest" by definition.
 */
export default function UpdateBanner() {
  const [status, setStatus] = useState(null); // { apkUrl, forced } | null
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    (async () => {
      try {
        const info = await App.getInfo();
        const currentBuild = parseInt(info.build, 10);
        if (Number.isNaN(currentBuild)) return;

        const meta = await AppAPI.version();
        if (cancelled) return;

        const forced = currentBuild < (meta.force_update_below || 0);
        const outdated = currentBuild < meta.latest_version_code;

        if (forced || outdated) {
          setStatus({ apkUrl: meta.apk_url, forced });
        }
      } catch {
        // Version check failing shouldn't ever block someone from using
        // the app they already have open — just skip the prompt.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!status || (dismissed && !status.forced)) return null;

  if (status.forced) {
    return (
      <div className="modal-overlay">
        <div className="modal-sheet" style={{ maxHeight: '40vh' }}>
          <div className="modal-sheet-header">
            <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
              Update required
            </strong>
          </div>
          <div className="modal-sheet-body">
            <p style={{ color: 'var(--ink-soft)', marginBottom: 'var(--sp-4)' }}>
              This version of CampusMEET is no longer supported. Please install the latest version to continue.
            </p>
            <a href={status.apkUrl} className="btn btn-primary btn-block" target="_blank" rel="noreferrer">
              Download latest version
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="update-banner">
      <span>A newer version of CampusMEET is available.</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <a href={status.apkUrl} className="update-banner-btn" target="_blank" rel="noreferrer">
          Update
        </a>
        <button
          type="button"
          className="update-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
