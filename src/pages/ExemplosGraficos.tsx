import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft } from '@/components/animated-icons';
import { AnimatedNumber } from '@/components/app/AnimatedNumber';
import { BarChart } from '@/components/bklit/bar-chart';
import { Bar } from '@/components/bklit/bar';
import { BarSquares } from '@/components/bklit/bar-squares';
import { BarXAxis } from '@/components/bklit/bar-x-axis';
import { BarYAxis } from '@/components/bklit/bar-y-axis';
import { AreaChart } from '@/components/bklit/area-chart';
import { Area } from '@/components/bklit/area';
import { XAxis } from '@/components/bklit/x-axis';
import { Grid } from '@/components/bklit/grid';
import { ChartTooltip } from '@/components/bklit/chart-tooltip';
import { Gauge } from '@/components/bklit/gauge/gauge';
import './exemplos-graficos.css';

const lime = '#b9ff39';
const blue = '#7daaf8';
const amber = '#e8b65b';
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const team = [
  { name: 'Lucas', paid: 840, pending: 210 },
  { name: 'Gabriel', paid: 680, pending: 170 },
  { name: 'Matheus', paid: 560, pending: 140 },
];
const sales = [180, 240, 160, 320, 260, 460, 380].map((value, i) => ({ date: new Date(2026, 9, 18 + i, 12), current: value, previous: [130, 160, 190, 200, 180, 300, 240][i] }));
const hours = [2, 4, 7, 6, 3, 5, 9, 12, 10].map((value, i) => ({ name: `${9 + i}h`, count: value, color: value >= 9 ? lime : '#53762d' }));

function Legend({ entries }: { entries: { color: string; label: string }[] }) {
  return <div className="chart-study-legend">{entries.map(entry => <span key={entry.label}><i style={{ background: entry.color }} />{entry.label}</span>)}</div>;
}
function Card({ number, area, title, subtitle, children, footer }: { number: string; area: string; title: string; subtitle: string; children: ReactNode; footer: string }) {
  return <section className="chart-study-card"><header><div className="chart-study-eyebrow"><span>{area}</span><span>{number}</span></div><h2>{title}</h2><p>{subtitle}</p></header>{children}<footer><span>{footer}</span></footer></section>;
}

export default function ExemplosGraficos() {
  const [period, setPeriod] = useState<7 | 30>(7);
  const reduced = useReducedMotion();
  const multiplier = period === 7 ? 1 : 4;
  const commissions = team.map(item => ({ ...item, paid: item.paid * multiplier, pending: item.pending * multiplier }));
  const revenue = sales.map(item => ({ ...item, current: item.current * multiplier, previous: item.previous * multiplier }));
  const distribution = hours.map(item => ({ ...item, count: item.count * multiplier }));
  const totalPaid = commissions.reduce((sum, item) => sum + item.paid, 0);
  const totalPending = commissions.reduce((sum, item) => sum + item.pending, 0);
  const currentSales = revenue.reduce((sum, item) => sum + item.current, 0);
  const previousSales = revenue.reduce((sum, item) => sum + item.previous, 0);
  const appointmentCount = distribution.reduce((sum, item) => sum + item.count, 0);
  const returning = period === 7 ? 34 : 128;
  const enrolled = period === 7 ? 48 : 180;
  const retention = Math.round(returning / enrolled * 100);
  const duration = reduced ? 0 : 500;
  return <main className="chart-study">
    <div className="chart-study-container">
      <nav className="chart-study-nav"><Link to="/painel"><ArrowLeft className="h-4 w-4" />Voltar ao painel</Link><span>BKLIT / HAPPY CASH</span></nav>
      <header className="chart-study-heading"><div><p className="chart-study-eyebrow">Indicadores do negócio</p><h1>Seu negócio,<br /><span>em números.</span></h1><p>Comissões, vendas, movimento e relacionamento.</p></div><div className="chart-study-period" aria-label="Período">{([7, 30] as const).map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} dias</button>)}</div></header>
      <div className="chart-study-grid">
        <Card number="01" area="Comissões" title="Comissões por profissional" subtitle="Comissões pagas e a pagar no período." footer={`${currency(totalPending)} a pagar`}>
          <div className="chart-study-stat"><AnimatedNumber value={totalPaid + totalPending} currency /><small>em comissões</small></div>
          <Legend entries={[{ color: lime, label: 'Pagas' }, { color: amber, label: 'A pagar' }]} />
          <div className="chart-study-plot" role="img" aria-label={`Comissões: ${currency(totalPaid)} pagas e ${currency(totalPending)} a pagar`}><BarChart data={commissions} orientation="horizontal" stacked xDataKey="name" aspectRatio="2.1 / 1" margin={{ left: 70, top: 12, right: 20, bottom: 12 }} animationDuration={duration}><Grid vertical /><Bar dataKey="paid" fill={lime} animate={!reduced} /><Bar dataKey="pending" fill={amber} animate={!reduced} /><BarYAxis /><ChartTooltip showDatePill={false} rows={point => [{ label: 'Pagas', value: currency(Number(point.paid)), color: lime }, { label: 'A pagar', value: currency(Number(point.pending)), color: amber }]} /></BarChart></div>
          <details className="chart-study-data"><summary>Ver valores por profissional</summary><table><thead><tr><th>Profissional</th><th>Pagas</th><th>A pagar</th></tr></thead><tbody>{commissions.map(item => <tr key={item.name}><th>{item.name}</th><td>{currency(item.paid)}</td><td>{currency(item.pending)}</td></tr>)}</tbody></table></details>
        </Card>
        <Card number="02" area="Vendas de produtos" title="Vendas no período" subtitle="Comparação com o período anterior." footer={`${((currentSales / previousSales - 1) * 100).toFixed(1).replace('.', ',')}% acima do período anterior`}>
          <div className="chart-study-stat"><AnimatedNumber value={currentSales} currency /><small>em produtos vendidos</small></div>
          <Legend entries={[{ color: lime, label: 'Atual' }, { color: blue, label: 'Anterior' }]} />
          <div className="chart-study-plot" role="img" aria-label={`Vendas atuais ${currency(currentSales)}, anteriores ${currency(previousSales)}`}><AreaChart data={revenue} aspectRatio="2.1 / 1" animationDuration={duration} margin={{ top: 18, left: 12, right: 12, bottom: 30 }}><Grid horizontal /><Area dataKey="previous" fill={blue} stroke={blue} fillOpacity={.08} animate={!reduced} /><Area dataKey="current" fill={lime} stroke={lime} fillOpacity={.2} animate={!reduced} /><XAxis labels={period === 7 ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : ['1–4', '5–8', '9–12', '13–16', '17–20', '21–24', '25–30']} numTicks={4} /><ChartTooltip showDatePill={false} rows={point => [{ label: 'Atual', value: currency(Number(point.current)), color: lime }, { label: 'Anterior', value: currency(Number(point.previous)), color: blue }]} /></AreaChart></div>
          <details className="chart-study-data"><summary>Ver valores por intervalo</summary><table><thead><tr><th>Intervalo</th><th>Atual</th><th>Anterior</th></tr></thead><tbody>{revenue.map((item, i) => <tr key={i}><th>{i + 1}</th><td>{currency(item.current)}</td><td>{currency(item.previous)}</td></tr>)}</tbody></table></details>
        </Card>
        <Card number="03" area="Agendamentos" title="Movimento por horário" subtitle="Atendimentos agrupados pela hora de início." footer="16h concentra o maior movimento">
          <div className="chart-study-stat"><AnimatedNumber value={appointmentCount} /><small>atendimentos no período</small></div>
          <Legend entries={[{ color: lime, label: 'Maior movimento' }, { color: '#53762d', label: 'Demais horários' }]} />
          <div className="chart-study-plot" role="img" aria-label={`${appointmentCount} atendimentos; pico às 16h`}><BarChart data={distribution} xDataKey="name" aspectRatio="2.1 / 1" barGap={.45} animationDuration={duration} margin={{ left: 12, top: 12, right: 12, bottom: 30 }}><Grid horizontal /><BarSquares dataKey="count" colorKey="color" fill={lime} squareGap={3} squareRadius={.15} animate={!reduced} /><BarXAxis maxLabels={{ base: 5, sm: 9 }} /><ChartTooltip showDatePill={false} rows={point => [{ label: 'Atendimentos', value: String(point.count), color: lime }]} /></BarChart></div>
          <details className="chart-study-data"><summary>Ver valores por horário</summary><table><thead><tr><th>Horário</th><th>Atendimentos</th></tr></thead><tbody>{distribution.map(item => <tr key={item.name}><th>{item.name}</th><td>{item.count}</td></tr>)}</tbody></table></details>
        </Card>
        <Card number="04" area="Fidelidade" title="Retorno dos clientes" subtitle="Clientes do programa que retornaram no período." footer={`${enrolled - returning} clientes ainda sem retorno no período`}>
          <div className="chart-study-stat"><AnimatedNumber value={returning} /><small>clientes voltaram</small></div>
          <Legend entries={[{ color: lime, label: 'Retornaram' }, { color: '#29332b', label: 'Sem retorno' }]} />
          <div className="chart-study-gauge" role="img" aria-label={`${retention}% de retorno: ${returning} de ${enrolled} clientes`}><Gauge value={retention} centerValue={retention} suffix="%" defaultLabel="de retorno" totalNotches={40} activeFill={lime} inactiveFill="#29332b" useGradient={false} height={220} /></div>
          <div className="chart-study-ratio"><span>Clientes no programa<strong><AnimatedNumber value={enrolled} /></strong></span><span>Retornaram<strong><AnimatedNumber value={returning} /></strong></span></div>
        </Card>
      </div>
    </div>
  </main>;
}
