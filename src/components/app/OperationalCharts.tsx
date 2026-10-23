import { AreaChart } from '@/components/bklit/area-chart';
import { Area } from '@/components/bklit/area';
import { XAxis } from '@/components/bklit/x-axis';
import { useReducedMotion } from 'framer-motion';
import { BarChart } from '@/components/bklit/bar-chart';
import { Bar } from '@/components/bklit/bar';
import { BarXAxis } from '@/components/bklit/bar-x-axis';
import { BarYAxis } from '@/components/bklit/bar-y-axis';
import { Grid } from '@/components/bklit/grid';
import { ChartTooltip } from '@/components/bklit/chart-tooltip';
import { PieChart } from '@/components/bklit/pie-chart';
import { PieSlice } from '@/components/bklit/pie-slice';
import { usePie } from '@/components/bklit/pie-context';
export const chartPalette = ['#b9ff39','#8fd927','#a1aba3','#e8b65b','#f16d70'];
const integer = new Intl.NumberFormat('pt-BR');
type Point = {name:string; [key:string]:string|number};
export function OperationalBarChart({data,measure='agendamentos',horizontal=false}:{data:Point[];measure?:string;horizontal?:boolean}) {
  const reduced=useReducedMotion();
  if(!data.some(d=>Number(d[measure])>0)) return <p className="py-12 text-center text-xs text-muted-foreground">Nenhum atendimento neste período.</p>;
  return <div className="min-w-0" aria-label="Atendimentos por período"><BarChart data={data} xDataKey="name" orientation={horizontal?'horizontal':'vertical'} aspectRatio="2.4 / 1" margin={{top:12,right:12,bottom:32,left:horizontal?76:16}} animationDuration={reduced?0:500}><Grid horizontal={!horizontal} vertical={horizontal}/><Bar dataKey={measure} fill="#b9ff39" lineCap="round" animate={!reduced}/>{horizontal?<BarYAxis/>:<BarXAxis/>}<ChartTooltip showDatePill={false}/></BarChart><table className="sr-only"><caption>Atendimentos por período</caption><thead><tr><th>Período</th><th>Atendimentos</th></tr></thead><tbody>{data.map(d=><tr key={d.name}><td>{d.name}</td><td>{integer.format(Number(d[measure]))}</td></tr>)}</tbody></table></div>;
}
function PieLabel() {
  const {hoveredIndex,data,totalValue}=usePie();
  const item=hoveredIndex===null?null:data[hoveredIndex];
  return <g aria-hidden="true"><text textAnchor="middle" y="-2" fill="#f5f7f4" fontSize="18" fontWeight="600">{integer.format(item?.value??totalValue)}</text><text textAnchor="middle" y="16" fill="#a1aba3" fontSize="8">{item?.label?.slice(0,18)||'atendimentos'}</text></g>;
}
export function OperationalPieChart({data}:{data:{name:string;value:number}[]}) {
  const reduced=useReducedMotion();const slices=data.map((d,i)=>({label:d.name,value:d.value,color:chartPalette[i%chartPalette.length]}));
  return <div className="w-[140px] shrink-0" aria-label={data.map(d=>`${d.name}: ${integer.format(d.value)}`).join('; ')}><PieChart data={slices} size={140} innerRadius={40} padAngle={.04}>{slices.map((_,i)=><PieSlice key={i} index={i} showGlow={false} animate={!reduced}/>)}<PieLabel/></PieChart></div>;
}

export function OperationalAreaChart({data}:{data:{name:string;date:string;faturamento:number}[]}) {
  const reduced=useReducedMotion();
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const points=data.map(d=>({...d,date:new Date(`${d.date}T12:00:00`)}));
  if(!data.some(d=>d.faturamento>0)) return <p className="py-16 text-center text-xs text-muted-foreground">Nenhum valor agendado neste período.</p>;
  return <div aria-label="Valor dos serviços agendados nos últimos sete dias"><AreaChart data={points} xDataKey="date" aspectRatio="2.7 / 1" animationDuration={reduced?0:500} margin={{top:15,right:15,bottom:32,left:15}}><Grid horizontal/><Area dataKey="faturamento" fill="#b9ff39" stroke="#b9ff39" fillOpacity={.2} animate={!reduced}/><XAxis/><ChartTooltip rows={point=>[{label:'Valor agendado',value:money.format(Number(point.faturamento)),color:'#b9ff39'}]}/></AreaChart><table className="sr-only"><caption>Valor agendado por dia</caption><tbody>{data.map(d=><tr key={d.date}><th>{d.name}</th><td>{money.format(d.faturamento)}</td></tr>)}</tbody></table></div>;
}
