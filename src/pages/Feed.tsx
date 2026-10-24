import { Layout } from '@/components/layout/Layout';
import { FanFeed, type FeedItem } from '@/components/app/FanFeed';
import hero from '@/assets/hero-barbershop.jpg';

// Visual preview only. No publication, customer activity or offer is persisted.
const previewPosts: FeedItem[] = [
  {id:'preview-style',title:'Degradê em dia',image:'/test-design/servico-corte.webp',category:'Inspiração',body:'Um exemplo de publicação para apresentar cortes e acabamentos da equipe. Aqui, o administrador poderá mostrar o resultado de um atendimento, com a autorização do cliente.'},
  {id:'preview-barba',title:'Seu ritual de cuidado',image:'/test-design/servico-barba.webp',category:'Barba',body:'Uma publicação fictícia sobre o atendimento com toalha quente e modelagem de barba. A foto é ilustrativa e não representa um atendimento realizado pela barbearia.'},
  {id:'preview-space',title:'Uma pausa na rotina',image:hero,category:'Na barbearia',body:'Este espaço pode receber novidades e comunicados: mudanças de horário, apresentação de serviços ou uma nova unidade. Este comunicado é apenas uma prévia visual.'},
  {id:'preview-team',title:'Conheça a equipe',image:'/test-design/barbeiro-lucas.jpg',category:'Equipe',body:'Lucas Martins é um personagem do nosso ambiente de teste. Esta publicação demonstra como apresentar os profissionais, suas especialidades e o jeito de trabalhar.'},
  {id:'preview-care',title:'O cuidado continua em casa',image:'/test-design/produto-cuidados.webp',category:'Cuidados',body:'Exemplo de conteúdo sobre produtos e cuidados diários. Nenhuma promoção, preço ou disponibilidade está sendo anunciada nesta demonstração.'},
];
export default function Feed() {
  return <Layout><div className="feed-preview"><header className="feed-heading"><p className="page-eyebrow">Da sua barbearia</p><h1>Seu próximo <span className="text-primary">estilo.</span></h1><p>Inspirações, cuidados e novidades da equipe.</p></header><div className="feed-preview-notice"><span>Prévia fictícia</span><p>Fotos ilustrativas. Publicações de exemplo para testar o design.</p></div><FanFeed items={previewPosts}/></div></Layout>;
}
