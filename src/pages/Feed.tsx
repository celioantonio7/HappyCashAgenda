import { Layout } from '@/components/layout/Layout';
import { FanFeed, type FeedItem } from '@/components/app/FanFeed';
import hero from '@/assets/hero-barbershop.jpg';

// Visual preview only. No publication, customer activity or offer is persisted.
const previewPosts: FeedItem[] = [
  {id:'preview-style',title:'Degradê em dia',image:'/test-design/servico-corte.webp',category:'Inspiração',body:'Linhas definidas e transição suave para renovar o visual.'},
  {id:'preview-barba',title:'Seu ritual de cuidado',image:'/test-design/servico-barba.webp',category:'Barba',body:'Toalha quente, modelagem e acabamento para cuidar da sua barba.'},
  {id:'preview-space',title:'Uma pausa na rotina',image:hero,category:'Na barbearia',body:'Um momento para cuidar de você e do seu estilo.'},
  {id:'preview-team',title:'Conheça a equipe',image:'/test-design/barbeiro-lucas.jpg',category:'Equipe',body:'Técnica e atenção aos detalhes em cada corte e acabamento.'},
  {id:'preview-care',title:'O cuidado continua em casa',image:'/test-design/produto-cuidados.webp',category:'Cuidados',body:'Mantenha sua rotina de cuidados entre um atendimento e outro.'},
];
export default function Feed() {
  return <Layout><div className="feed-preview"><header className="feed-heading"><p className="page-eyebrow">Da sua barbearia</p><h1>Seu próximo <span className="text-primary">estilo.</span></h1><p>Inspirações, cuidados e novidades da equipe.</p></header><FanFeed items={previewPosts}/></div></Layout>;
}
