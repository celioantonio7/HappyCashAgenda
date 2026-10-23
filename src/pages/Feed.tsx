import { Layout } from '@/components/layout/Layout';
import { EmptyState } from '@/components/app/EmptyState';
import { FanFeed, type FeedItem } from '@/components/app/FanFeed';
import { isAgendaDemo } from '@/lib/agendaDemo';
import hero from '@/assets/hero-barbershop.jpg';
const demoPosts: FeedItem[] = [{id:'demo-feed-1',title:'Seu próximo estilo',image:hero,category:'Demonstração',body:'Exemplo visual de publicação. Este conteúdo não foi publicado pela barbearia.'},{id:'demo-feed-2',title:'Um momento para você',image:hero,category:'Demonstração',body:'Exemplo do carrossel em leque, com navegação por toque e teclado.'}];
export default function Feed() {
  return <Layout><div className="container px-4 py-8"><div className="page-intro"><div><p className="page-eyebrow">Da sua barbearia</p><h1>Novidades, <span className="text-primary">do seu jeito.</span></h1><p>Estilos, cuidados e comunicados em um só lugar.</p></div></div>{isAgendaDemo ? <FanFeed items={demoPosts}/> : <EmptyState title="Nenhuma publicação disponível" description="As novidades da barbearia aparecerão aqui quando a publicação de conteúdo estiver disponível."/>}</div></Layout>;
}
