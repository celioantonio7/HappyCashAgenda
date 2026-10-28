import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { useLocation } from 'react-router-dom';
import { resolveAgendaRequestedSlug } from '@/lib/agendaSlug';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/** Authenticated customers keep their membership when returning through a shop link. */
export function ClientEnrollment() {
  const { user, isAdmin, isStaff, loading } = useAuth();
  const { settings, loading: brandingLoading, error } = useAgendaBranding();
  const location = useLocation();
  const completed = useRef(new Set<string>());
  const { toast } = useToast();
  useEffect(() => {
    if (!user || isAdmin || isStaff || loading || brandingLoading || error || !settings.storeAccountId ||
      !resolveAgendaRequestedSlug(location.pathname, location.search)) return;
    const key = `${user.id}:${settings.storeAccountId}`;
    if (completed.current.has(key)) return;
    completed.current.add(key);
    void supabase.rpc('register_agenda_client', { p_slug: settings.slug }).then(({ error: enrollmentError }) => {
      if (!enrollmentError) window.dispatchEvent(new Event('agenda:client-enrolled'));
      if (enrollmentError) {
        completed.current.delete(key);
        toast({ title: 'Não foi possível vincular sua conta à barbearia', description: 'Entre novamente pelo link da empresa para tentar de novo.', variant: 'destructive' });
      }
    });
  }, [user, isAdmin, isStaff, loading, brandingLoading, error, settings.storeAccountId, settings.slug, location.pathname, location.search, toast]);
  return null;
}
