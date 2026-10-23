import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from '@/components/animated-icons';
export type FeedItem = { id: string; title: string; image: string; category: string; body: string };
/** Web adaptation of dohooo/react-native-reanimated-carousel's Card Fan (MIT). */
export function FanFeed({ items }: { items: FeedItem[] }) {
  const [current, setCurrent] = useState(0);
  const reduced = useReducedMotion();
  const move = (direction: number) => setCurrent(index => (index + direction + items.length) % items.length);
  if (!items.length) return null;
  return <section aria-roledescription="carrossel" aria-label="Publicações da barbearia" tabIndex={0} onKeyDown={e => { if(e.key === 'ArrowRight') {e.preventDefault(); move(1);} if(e.key === 'ArrowLeft') {e.preventDefault(); move(-1);} }}>
    <motion.div className="fan-stage" onPanEnd={(_,info) => { if (Math.abs(info.offset.x)>35) move(info.offset.x<0 ? 1 : -1); }}>
      {items.map((item,index) => { const distance = index-current; return <motion.article className="fan-card" key={item.id} aria-hidden={index!==current} animate={{ x: `calc(-50% + ${distance*58}px)`, rotate: distance*9, y: index===current ? 0 : 24, opacity: Math.abs(distance)>2 ? 0 : 1, zIndex: 20-Math.abs(distance) }} transition={{duration: reduced ? 0 : .35}}><img src={item.image} alt="" draggable={false}/><div className="fan-caption"><p className="text-[10px] text-primary uppercase tracking-widest">{item.category}</p><h2 className="text-xl font-semibold mt-2">{item.title}</h2></div></motion.article>; })}
    </motion.div>
    <div className="flex justify-between items-center"><button className="icon-button" aria-label="Publicação anterior" onClick={() => move(-1)}><ArrowLeft /></button><span className="text-xs text-muted-foreground" aria-live="polite">{current+1} de {items.length}</span><button className="icon-button" aria-label="Próxima publicação" onClick={() => move(1)}><ArrowRight /></button></div>
    <p className="text-sm text-muted-foreground mt-6 leading-relaxed">{items[current].body}</p>
  </section>;
}
