import { useEffect, useState, type ReactNode } from 'react';
import { format, subDays } from 'date-fns';
import { useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart } from '@/components/bklit/bar-chart';
import { Bar } from '@/components/bklit/bar';
import { BarYAxis } from '@/components/bklit/bar-y-axis';
import { AreaChart } from '@/components/bklit/area-chart';
import { Area } from '@/components/bklit/area';
import { XAxis } from '@/components/bklit/x-axis';
import { Grid } from '@/components/bklit/grid';
import { ChartTooltip } from '@/components/bklit/chart-tooltip';
import { supabase } from '@/integrations/supabase/client';
const primary = 'hsl(var(--primary))';
const secondary = '#7daaf8';
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function AnalysisCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => matchMedia('(min-width:768px)').matches);
  useEffect(() => {
    const media = matchMedia('(min-width:768px)');
    const change = () => setOpen(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return <Card className="business-chart"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><details className="mobile-chart" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{open ? 'Recolher gráfico' : 'Ver gráfico'}</summary>{children}</details></CardContent></Card>;
}
export function CommissionChart({ data }: { data: { name: string; value: number }[] }) {
  const reduced = useReducedMotion();
  return <AnalysisCard title="Comissões por profissional" description="Comissões calculadas sobre os serviços concluídos neste mês.">
    {data.some(row => row.value > 0) ? <><BarChart data={data} xDataKey="name" orientation="horizontal" aspectRatio="2.5 / 1" margin={{ left: 82, right: 16, top: 12, bottom: 12 }} animationDuration={reduced ? 0 : 500}><Grid vertical /><Bar dataKey="value" fill={primary} animate={!reduced} /><BarYAxis /><ChartTooltip showDatePill={false} rows={point => [{ label: 'Comissão', value: money(Number(point.value)), color: primary }]} /></BarChart><details><summary>Ver valores</summary><table><thead><tr><th>Profissional</th><th>Comissão</th></tr></thead><tbody>{data.map(row => <tr key={row.name}><th>{row.name}</th><td>{money(row.value)}</td></tr>)}</tbody></table></details></> : <p className="py-6 text-sm text-muted-foreground">Nenhuma comissão neste mês.</p>}
  </AnalysisCard>;
}

type Sale = { id: string; created_at: string; total_amount: number; order_status: string };
export function SalesRevenueChart({ storeAccountId, refreshSource }: { storeAccountId: string; refreshSource: unknown }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [rows, setRows] = useState<Sale[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setRows([]);
      if (!storeAccountId) { setState('ready'); return; }
      setState('loading');
      const all: Sale[] = [];
      const start = format(subDays(new Date(), days * 2 - 1), 'yyyy-MM-dd');
      const end = format(subDays(new Date(), -1), 'yyyy-MM-dd');
      try {
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from('agenda_product_orders').select('id,created_at,total_amount,order_status').eq('store_account_id', storeAccountId).eq('payment_status', 'paid').gte('created_at', `${start}T00:00:00-03:00`).lt('created_at', `${end}T00:00:00-03:00`).order('created_at').order('id').range(offset, offset + 499).abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          if (error) throw error;
          all.push(...(data ?? []));
          if (!data?.length || data.length < 500) break;
        }
        setRows(all.filter(row => !['cancelled', 'canceled'].includes(row.order_status)));
        setState('ready');
      } catch { if (!controller.signal.aborted) setState('error'); }
    };
    void load();
    return () => controller.abort();
  }, [storeAccountId, days, refreshSource, retry]);
  const amounts = new Map<string, number>();
  const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  rows.forEach(row => { const date = dateFormat.format(new Date(row.created_at)); amounts.set(date, (amounts.get(date) ?? 0) + Number(row.total_amount)); });
  const data = Array.from({ length: days }, (_, index) => {
    const date = subDays(new Date(), days - 1 - index);
    return { date, name: format(date, 'dd/MM'), current: amounts.get(format(date, 'yyyy-MM-dd')) ?? 0, previous: amounts.get(format(subDays(date, days), 'yyyy-MM-dd')) ?? 0 };
  });
  return <AnalysisCard title="Vendas por período" description="Pagamentos confirmados de produtos, comparados ao período anterior.">
    <div className="segmented-nav" aria-label="Período das vendas">{([7, 30] as const).map(value => <button type="button" key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{value} dias</button>)}</div>
    {state === 'loading' ? <p role="status" className="py-8 text-sm text-muted-foreground">Carregando vendas…</p> : state === 'error' ? <div role="alert" className="py-6 text-sm"><p>Não foi possível carregar as vendas.</p><button className="text-primary mt-3" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div> : !rows.length ? <p className="py-8 text-sm text-muted-foreground">Nenhum pagamento confirmado neste período ou no anterior.</p> : <>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3"><span>● Atual: {money(data.reduce((sum, row) => sum + row.current, 0))}</span><span style={{ color: secondary }}>● Anterior: {money(data.reduce((sum, row) => sum + row.previous, 0))}</span></div>
      <AreaChart data={data} xDataKey="date" aspectRatio="2.5 / 1" animationDuration={reduced ? 0 : 500} margin={{ left: 12, right: 12, top: 16, bottom: 32 }}><Grid horizontal /><Area dataKey="previous" fill={secondary} stroke={secondary} fillOpacity={.08} animate={!reduced} /><Area dataKey="current" fill={primary} stroke={primary} fillOpacity={.18} animate={!reduced} /><XAxis numTicks={4} /><ChartTooltip rows={point => [{ label: 'Atual', value: money(Number(point.current)), color: primary }, { label: 'Anterior', value: money(Number(point.previous)), color: secondary }]} /></AreaChart>
      <details><summary>Ver valores por dia</summary><table><thead><tr><th>Dia</th><th>Atual</th><th>Anterior</th></tr></thead><tbody>{data.map(row => <tr key={row.name}><th>{row.name}</th><td>{money(row.current)}</td><td>{money(row.previous)}</td></tr>)}</tbody></table></details>
    </>}
  </AnalysisCard>;
}
