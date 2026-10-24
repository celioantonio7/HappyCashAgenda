import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from '@/components/animated-icons';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
export type FeedItem = { id: string; title: string; image: string; category: string; body: string };
/** Web adaptation of dohooo/react-native-reanimated-carousel's Card Fan (MIT). */
export function FanFeed({ items }: { items: FeedItem[] }) {
  const [current, setCurrent] = useState(0);
  const [drag, setDrag] = useState(0);
  const [opened, setOpened] = useState<FeedItem|null>(null);
  const swiped = useRef(false);
  const reduced = useReducedMotion();
  const move = (direction: number) => { setDrag(0); setCurrent(index => (index + direction + items.length) % items.length); };
  if (!items.length) return null;
  return <section className="fan-feed" aria-roledescription="carrossel" aria-label="Publicações da barbearia" onKeyDown={e => { if(e.key === 'ArrowRight') {e.preventDefault(); move(1);} if(e.key === 'ArrowLeft') {e.preventDefault(); move(-1);} }}>
    <motion.div className="fan-stage" onPanStart={()=>{swiped.current=false;}} onPan={(_,info)=>{if(Math.abs(info.offset.x)>8)swiped.current=true;setDrag(Math.max(-1,Math.min(1,info.offset.x/120)));}} onPanEnd={(_,info) => { if (Math.abs(info.offset.x)>35||Math.abs(info.velocity.x)>400) move(info.offset.x<0 ? 1 : -1);else setDrag(0);window.setTimeout(()=>{swiped.current=false;},0); }}>
      {items.map((item,index) => {
        const distance=((index-current+items.length+Math.floor(items.length/2))%items.length)-Math.floor(items.length/2);
        const position=distance+drag;
        return <motion.button type="button" className="fan-card" key={item.id} tabIndex={index===current?0:-1} aria-label={`${item.title}. ${index===current?'Abrir publicação':'Selecionar publicação'}`} onClick={()=>{if(swiped.current)return;if(index===current)setOpened(item);else setCurrent(index);}} initial={false} animate={{ x:`calc(-50% + ${position*56}px)`, rotate:position*9, y:Math.min(Math.abs(position)*24,60), opacity:Math.abs(position)>2.7?0:1, zIndex:20-Math.round(Math.abs(position)*5) }} transition={{type:'tween',duration:reduced?0:drag?0:.35}}><img src={item.image} alt="" draggable={false}/><div className="fan-caption"><p>{item.category}</p><h2>{item.title}</h2><span>Ver publicação <ArrowRight className="h-4 w-4" aria-hidden="true"/></span></div></motion.button>;
      })}
    </motion.div>
    <div className="fan-controls"><button className="icon-button" aria-label="Publicação anterior" onClick={() => move(-1)}><ArrowLeft /></button><div className="fan-dots">{items.map((item,index)=><button key={item.id} aria-label={`Ver publicação ${index+1}: ${item.title}`} aria-current={index===current?'true':undefined} onClick={()=>{setDrag(0);setCurrent(index);}}><span/></button>)}</div><button className="icon-button" aria-label="Próxima publicação" onClick={() => move(1)}><ArrowRight /></button></div>
    <Dialog open={!!opened} onOpenChange={open=>{if(!open)setOpened(null);}}><DialogContent className="feed-post-detail"><header className="feed-post-toolbar"><DialogClose asChild><button type="button" className="feed-post-back"><ArrowLeft className="h-5 w-5" aria-hidden="true"/>Voltar</button></DialogClose></header>{opened&&<article><DialogDescription className="feed-post-category">{opened.category}</DialogDescription><DialogTitle>{opened.title}</DialogTitle><img src={opened.image} alt={opened.title}/><p>{opened.body}</p></article>}</DialogContent></Dialog>
  </section>;
}
