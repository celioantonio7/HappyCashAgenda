import { Layout } from '@/components/layout/Layout';
import { EmptyState } from '@/components/app/EmptyState';
export default function Assinatura() {
  return <Layout><div className="container px-4 py-8"><div className="page-intro"><div><p className="page-eyebrow">Seu cuidado, sua rotina</p><h1>Minha <span className="text-primary">assinatura.</span></h1><p>Planos de atendimento da sua barbearia.</p></div></div><EmptyState title="Nenhum plano de serviços disponível" description="A barbearia ainda não disponibilizou planos recorrentes neste aplicativo. Seus agendamentos continuam disponíveis na aba Agendar."/></div></Layout>;
}
