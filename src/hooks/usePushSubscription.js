const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Requests Notification permission, subscribes via the browser's Push
 * API, and saves the subscription to the backend. Pass in the app's
 * existing apiFetch wrapper so this carries the same auth headers as
 * every other request. Returns false quietly on anything unsupported
 * (older Safari, permission denied) rather than throwing — this is
 * meant to be called optimistically, not gate the rest of the app.
 */
export async function subscribeToPush(apiFetch) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await apiFetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription.toJSON()),
    });

    return true;
  } catch (e) {
    return false;
  }
}

export async function unsubscribeFromPush(apiFetch) {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch (e) {
    return false;
  }
}
