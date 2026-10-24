import { AnimatedNumber } from '@/components/app/AnimatedNumber';
import { useState } from 'react';
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
import { PieCenter } from '@/components/bklit/pie-center';
export const chartPalette = ['#b9ff39','#8fd927','#a1aba3','#e8b65b','#f16d70'];
const integer = new Intl.NumberFormat('pt-BR');
type Point = {name:string; [key:string]:string|number};
export function OperationalBarChart({data,measure='agendamentos',horizontal=false}:{data:Point[];measure?:string;horizontal?:boolean}) {
  const reduced=useReducedMotion();
  if(!data.some(d=>Number(d[measure])>0)) return <p className="py-12 text-center text-xs text-muted-foreground">Nenhum atendimento neste período.</p>;
  return <div className="min-w-0" aria-label="Atendimentos por período"><BarChart data={data} xDataKey="name" orientation={horizontal?'horizontal':'vertical'} aspectRatio="2.4 / 1" margin={{top:12,right:12,bottom:32,left:horizontal?76:16}} animationDuration={reduced?0:500}><Grid horizontal={!horizontal} vertical={horizontal}/><Bar dataKey={measure} fill="#b9ff39" lineCap="round" animate={!reduced}/>{horizontal?<BarYAxis/>:<BarXAxis maxLabels={{base:7,sm:10}}/>}<ChartTooltip showDatePill={false}/></BarChart><table className="sr-only"><caption>Atendimentos por período</caption><thead><tr><th>Período</th><th>Atendimentos</th></tr></thead><tbody>{data.map(d=><tr key={d.name}><td>{d.name}</td><td>{integer.format(Number(d[measure]))}</td></tr>)}</tbody></table></div>;
}
export function OperationalPieChart({data}:{data:{name:string;value:number}[]}) {
  const reduced=useReducedMotion();
  const [selected,setSelected]=useState<number|null>(null);
  const [hovered,setHovered]=useState<number|null>(null);
  const active=hovered??selected;
  const total=data.reduce((sum,item)=>sum+item.value,0);
  const slices=data.map((d,i)=>({label:d.name,value:d.value,color:chartPalette[i%chartPalette.length]}));
  return <div className="interactive-pie">
    <div className="interactive-pie-plot" aria-label="Distribuição dos atendimentos">
      <PieChart data={slices} size={140} innerRadius={40} padAngle={.04} hoveredIndex={active} onHoverChange={setHovered}>
        {slices.map((_,i)=><PieSlice key={i} index={i} showGlow={false} animate={!reduced}/>)}<PieCenter defaultLabel="atendimentos" valueClassName="text-lg font-semibold" labelClassName="text-[9px] leading-tight max-w-full truncate"/>
      </PieChart>
    </div>
    <div className="interactive-pie-legend" aria-label="Destacar serviço no gráfico">
      {data.map((item,index)=><button type="button" key={item.name} aria-pressed={selected===index} onClick={()=>setSelected(current=>current===index?null:index)} onMouseEnter={()=>setHovered(index)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(index)} onBlur={()=>setHovered(null)} className={active===index?'is-active':''}>
        <span className="pie-legend-dot" style={{backgroundColor:slices[index].color}}/>
        <span className="pie-legend-name">{item.name}</span><strong><AnimatedNumber value={item.value}/></strong><span className="pie-legend-percent"><AnimatedNumber value={total?Math.round(item.value/total*100):0}/>%</span>
      </button>)}
    </div>
  </div>;
}

export function OperationalAreaChart({data}:{data:{name:string;date:string;faturamento:number}[]}) {
  const reduced=useReducedMotion();
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const points=data.map(d=>({...d,date:new Date(`${d.date}T12:00:00`)}));
  if(!data.some(d=>d.faturamento>0)) return <p className="py-16 text-center text-xs text-muted-foreground">Nenhum valor agendado neste período.</p>;
  return <div aria-label="Valor dos serviços agendados nos últimos sete dias"><AreaChart data={points} xDataKey="date" aspectRatio="2.7 / 1" animationDuration={reduced?0:500} margin={{top:15,right:15,bottom:32,left:15}}><Grid horizontal/><Area dataKey="faturamento" fill="#b9ff39" stroke="#b9ff39" fillOpacity={.2} animate={!reduced}/><XAxis/><ChartTooltip rows={point=>[{label:'Valor agendado',value:money.format(Number(point.faturamento)),color:'#b9ff39'}]}/></AreaChart><table className="sr-only"><caption>Valor agendado por dia</caption><tbody>{data.map(d=><tr key={d.date}><th>{d.name}</th><td>{money.format(d.faturamento)}</td></tr>)}</tbody></table></div>;
}
