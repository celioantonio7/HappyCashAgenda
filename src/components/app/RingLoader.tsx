import type { CSSProperties, SVGProps } from 'react';
import { cn } from '@/lib/utils';
import './ring-loader.css';

// Adapted from the Uiverse.io loading animation by Nawsome, supplied by the owner.
const rings = [
  {r:60,width:8,dash:377,full:376.237129776,quarter:94.247778,color:'#b9ff39'},
  {r:52.5,width:7,dash:329.9,full:329.207488554,quarter:82.46680575,color:'#abed32'},
  {r:46,width:6,dash:289,full:288.4484661616,quarter:72.2566298,color:'#9cdd2c'},
  {r:40.5,width:5,dash:254.5,full:253.9600625988,quarter:63.61725015,color:'#8fd927'},
  {r:36,width:4,dash:226.2,full:225.7422778656,quarter:56.5486668,color:'#75b72c'},
  {r:32.5,width:3,dash:204.2,full:203.795111962,quarter:51.05087975,color:'#5e962b'},
];
export function RingLoader({className,...props}:SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="24" height="24" role="img" aria-label="Carregando" className={cn('hc-ring-loader',className)} {...props}>{rings.map((ring,index)=><circle key={ring.r} cx="64" cy="64" r={ring.r} fill="none" stroke={ring.color} strokeWidth={ring.width} strokeLinecap="round" strokeDasharray={`${ring.dash} ${ring.dash}`} strokeDashoffset={-ring.full} style={{'--ring-full':-ring.full,'--ring-quarter':-ring.quarter,animationDelay:`${index*.04}s`} as CSSProperties}/>)}</svg>;
}
export function LoadingState({label='Carregando…',fullScreen=false}:{label?:string;fullScreen?:boolean}) {
  return <div className={cn('app-loading-state',fullScreen&&'app-loading-screen')} role="status" aria-busy="true"><RingLoader className={fullScreen?'loading-large':'loading-panel'} aria-hidden="true"/><span>{label}</span></div>;
}
