import { useCallback, useState, useEffect } from 'react';
import { notificationClient } from '@/integrations/supabase/notificationClient';
import type { Json } from '@/integrations/supabase/types';

function applicationServerKey(value: string) {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export function useNativePush(storeId?: string | null, barberId?: string | null, sessionToken?: string | null) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const publicKey = import.meta.env.VITE_AGENDA_VAPID_PUBLIC_KEY;
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
  const configured = Boolean(publicKey && storeId);
  useEffect(() => {
    let cancelled = false;
    const synchronize = () => {
      if (!supported || !storeId) return;
      void navigator.serviceWorker.getRegistration().then(async registration => {
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) { if (!cancelled) setEnabled(false); return; }
        const { error } = await notificationClient.rpc('register_agenda_push', {
          p_store_account_id: storeId, p_subscription: subscription.toJSON() as Json,
          ...(barberId ? { p_barber_id: barberId, p_session_token: sessionToken || '' } : {}),
        });
        if (!cancelled) setEnabled(!error);
      }).catch(() => {});
    };
    synchronize();
    window.addEventListener('agenda:client-enrolled', synchronize);
    if (supported) navigator.serviceWorker.addEventListener('controllerchange', synchronize);
    return () => {
      cancelled = true;
      window.removeEventListener('agenda:client-enrolled', synchronize);
      if (supported) navigator.serviceWorker.removeEventListener('controllerchange', synchronize);
    };
  }, [supported, storeId, barberId, sessionToken]);
  const enable = useCallback(async () => {
    if (!supported || !publicKey || !storeId) throw new Error('Notificações deste aparelho ainda não estão disponíveis.');
    setBusy(true);
    try {
      // Keep permission request inside the user's click for iOS standalone PWAs.
      if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') {
        throw new Error('Permita as notificações nas configurações do aparelho.');
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Abra o aplicativo instalado e tente novamente.');
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const { error } = await notificationClient.rpc('register_agenda_push', {
        p_store_account_id: storeId, p_subscription: subscription.toJSON() as Json,
        ...(barberId ? { p_barber_id: barberId, p_session_token: sessionToken || '' } : {}),
      });
      if (error) throw new Error('Não foi possível ativar as notificações. Tente novamente.');
      setEnabled(true);
    } finally { setBusy(false); }
  }, [supported, publicKey, storeId, barberId, sessionToken]);
  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error } = await notificationClient.rpc('unregister_agenda_push', {
          p_endpoint: subscription.endpoint,
          ...(barberId ? { p_barber_id: barberId, p_session_token: sessionToken || '' } : {}),
        });
        if (error) throw new Error('Não foi possível desativar as notificações.');
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } finally { setBusy(false); }
  }, [barberId, sessionToken]);
  return { supported, configured, busy, enabled, enable, disable };
}

// Call before signing out while the old identity/session is still available.
export async function removeNativePushForSession(barberId?: string, sessionToken?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await notificationClient.rpc('unregister_agenda_push', {
      p_endpoint: subscription.endpoint,
      ...(barberId ? { p_barber_id: barberId, p_session_token: sessionToken || '' } : {}),
    });
  } finally {
    // Stop delivery on this device even when the server cannot be reached.
    await subscription.unsubscribe();
  }
}
