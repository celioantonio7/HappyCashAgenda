import { dailyAppointments } from "@/lib/agendaDailyQueue";
import { businessNow, businessClock } from "@/lib/businessTime";
import { AnimatedNumber } from '@/components/app/AnimatedNumber';
import { ListMore } from '@/components/app/ListMore';
import { useMemo, useState, useEffect } from 'react';
import { Briefcase, CheckCircle2, Clock, User } from '@/components/animated-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';

interface ExtraService {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: 'appointment' | 'queue';
  status: 'scheduled' | 'completed' | 'cancelled';
  payment_method: string | null;
  payment_status: string | null;
  barber: { name: string; id?: string; phone?: string | null };
  service: { name: string; price: number; id?: string; duration_minutes?: number };
  barber_id: string;
  service_id: string;
  created_at?: string;
  extraServices: ExtraService[];
}

interface AppointmentQueueTabProps {
  appointments: Appointment[];
  onConfirmPayment?: (appointmentId: string) => void | Promise<void>;
}

export function AppointmentQueueTab({ appointments, onConfirmPayment }: AppointmentQueueTabProps) {
  const [limit,setLimit]=useState(10);
  const { settings } = useAgendaBranding();
  const [view, setView] = useState<'queue' | 'appointments'>('queue');
  const [clock, setClock] = useState(() => businessNow());
  useEffect(() => { const timer = window.setInterval(() => setClock(businessNow()), 30000); return () => window.clearInterval(timer); }, []);
  const todayStr = clock.date;
  const today = appointments.filter(a => a.status === 'scheduled' && a.appointment_date === todayStr);
  const walkInCount = today.filter(a => a.appointment_type === 'queue').length;
  const scheduledCount = today.length - walkInCount;

  const queue = useMemo(() => dailyAppointments(appointments, todayStr, view), [appointments, todayStr, view]);

  const getTotalPrice = (apt: Appointment) => {
    const extras = apt.extraServices.reduce((s, e) => s + (e.price || 0), 0);
    return (apt.service?.price || 0) + extras;
  };

  const getTotalDuration = (apt: Appointment) => {
    const extras = apt.extraServices.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    return (apt.service?.duration_minutes || 0) + extras;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold">{view === 'queue' ? 'Ordem de chegada hoje' : 'Agendamentos de hoje'}</h2>
        <Badge variant="secondary" className="text-sm">{queue.length} {view === 'queue' ? 'na fila' : 'agendados'}</Badge>
      </div>

      <div role="tablist" aria-label="Tipo de atendimento" className="flex gap-2">
        <Button role="tab" aria-selected={view === 'queue'} variant={view === 'queue' ? 'default' : 'outline'} onClick={() => { setView('queue'); setLimit(10); }}>Ordem de chegada ({walkInCount})</Button>
        <Button role="tab" aria-selected={view === 'appointments'} variant={view === 'appointments' ? 'default' : 'outline'} onClick={() => { setView('appointments'); setLimit(10); }}>Com horário ({scheduledCount})</Button>
      </div>
      <p className="text-xs text-muted-foreground">Somente atendimentos de hoje, no horário de Brasília. Datas futuras ficam em Agendamentos.</p>
      {queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{view === 'queue' ? 'Nenhum cliente na fila de hoje' : 'Nenhum agendamento pendente hoje'}</p>
            <p className="text-sm">{view === 'queue' ? 'Clientes com horário marcado aparecem na aba Com horário.' : 'Consulte outras datas na seção Agendamentos.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.slice(0,limit).map((apt, index) => {
            const isToday = true;
            const professionalPosition = queue.slice(0, index + 1).filter(item => item.barber_id === apt.barber_id).length;
            const isNext = view === 'queue' && professionalPosition === 1;
            const isWalkIn = apt.appointment_type === 'queue';
            const allServices = [apt.service?.name, ...apt.extraServices.map(e => e.name)].filter(Boolean);

            return (
              <Card key={apt.id} className={`border-l-4 ${isNext ? 'border-l-primary bg-primary/5' : 'border-l-border'}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isNext ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                        {view === 'queue' ? professionalPosition : index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{apt.client_name}</span>
                          {isNext && <Badge className="text-[10px] px-1.5 py-0">Próximo</Badge>}
                          {!isWalkIn && apt.appointment_time.slice(0, 5) < clock.time && <Badge variant="outline" className="text-[10px]">Horário passado · pendente</Badge>}
                          {isWalkIn && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Ordem de chegada</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {settings.professionalLabel}: <span className="font-medium text-foreground">{apt.barber?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      {apt.payment_method === 'pix' && apt.payment_status === 'pending' && onConfirmPayment ? (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onConfirmPayment(apt.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Confirmar Pix
                        </Button>
                      ) : null}
                      <div className="text-sm font-medium">
                        {isWalkIn
                          ? `Entrada ${apt.created_at ? businessClock(apt.created_at) : apt.appointment_time.slice(0, 5)}`
                          : `${isToday ? 'Hoje' : format(parseLocalDate(apt.appointment_date), "dd/MM", { locale: ptBR })} às ${apt.appointment_time.slice(0, 5)}`}
                      </div>
                      <div className="text-lg font-bold text-primary">R$ <AnimatedNumber value={getTotalPrice(apt)} decimals={2}/></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3 ml-11">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5" />
                      {allServices.join(' + ')}
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <AnimatedNumber value={getTotalDuration(apt)}/> min
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ListMore total={queue.length} shown={limit} onMore={()=>setLimit(n=>n+10)}/>
    </div>
  );
}
