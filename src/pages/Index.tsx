import { LoadingState } from '@/components/app/RingLoader';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { resolveAgendaRequestedSlug } from '@/lib/agendaSlug';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
export default function Index() {
  const { user, isAdmin, isStaff, loading } = useAuth();
  const { settings, loading: brandingLoading } = useAgendaBranding();
  const location = useLocation();
  if (loading || brandingLoading) return <LoadingState fullScreen label="Abrindo sua agenda…"/>;
  const slug = resolveAgendaRequestedSlug(location.pathname, location.search);
  if (slug) return <Navigate to={withAgendaPublicSearch('/agendamento', settings)} replace />;
  return <Navigate to={!user ? '/login' : isAdmin ? '/painel' : isStaff ? '/painel-profissional' : withAgendaPublicSearch('/agendamento', settings)} replace />;
}
