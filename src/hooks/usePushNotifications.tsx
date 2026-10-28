import { useCallback } from 'react';

// Foreground delivery only. Receiving notifications with the app closed requires
// a server-side Web Push sender and subscriptions, not Notification permission alone.
export const usePushNotifications = () => {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try { return await Notification.requestPermission() === 'granted'; }
    catch { return false; }
  }, []);

  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return null;
    const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
    const notificationOptions = { icon, badge: icon, ...options };
    try {
      // Mobile browsers require persistent notifications through a service worker.
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (registration) {
        // Once subscribed, the database outbox owns native delivery. Avoid a
        // second foreground notification for the same appointment event.
        if (await registration.pushManager?.getSubscription()) return null;
        await registration.showNotification(title, notificationOptions);
        return null;
      }
      const notification = new Notification(title, notificationOptions);
      notification.onclick = () => { window.focus(); notification.close(); };
      return notification;
    } catch { return null; }
  }, []);

  return { requestPermission, sendNotification, isSupported, permission: isSupported ? Notification.permission : 'denied' };
};
