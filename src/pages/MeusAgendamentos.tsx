import { RingLoader as Loader2 } from '@/components/app/RingLoader';
import { AnimatedNumber } from '@/components/app/AnimatedNumber';
import { formatCurrency } from '@/lib/formatCurrency';
import { ListMore } from '@/components/app/ListMore';
import { saveAgendaBookingDraft } from '@/lib/agendaBookingDraft';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Scissors, X, Trophy, CalendarSync, CheckCircle, XCircle, ChevronRight, Plus } from '@/components/animated-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { supabase } from '@/integrations/supabase/client';
import { LoyaltyTab } from '@/components/admin/LoyaltyTab';
import { cn, parseLocalDate } from '@/lib/utils';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
import {
  buildAppointmentCancellationWhatsAppMessage,
  buildAppointmentRescheduleWhatsAppMessage,
  openAgendaWhatsAppTargets,
} from '@/lib/agendaWhatsApp';
import { playNotificationSound, shouldPlayAgendaSound } from '@/lib/notificationSound';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

interface ExtraService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Appointment {
  service_id: string;
  id: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type?: 'appointment' | 'queue';
  barber_id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  barber: { name: string; phone?: string | null; photo_url?: string | null };
  service: { name: string; price: number; duration_minutes: number };
  extraServices: ExtraService[];
}

interface AppointmentRealtimeRow {
  id?: string;
  store_account_id?: string;
  status?: Appointment['status'];
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: Appointment['appointment_type'];
  client_name?: string;
}

interface AppointmentServiceRealtimeRow {
  appointment_id?: string;
}

interface AppointmentExtraServiceRow {
  appointment_id: string;
  service_id: string;
  service_name: string;
  service_price: number | string | null;
  service_duration?: number | string | null;
}

type BookedSlotRow = {
  appointment_time: string | null;
  duration_minutes: number | null;
};

export default function MyAppointments() {
  const [clientSection,setClientSection]=useState<'upcoming'|'history'|'loyalty'>('upcoming');
  const [viewAppointment,setViewAppointment]=useState<Appointment|null>(null);
  const [upcomingLimit,setUpcomingLimit]=useState(3);
  const [historyLimit,setHistoryLimit]=useState(10);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all'|'completed'|'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleAllSlots, setRescheduleAllSlots] = useState<string[]>([]);
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<string[]>([]);
  const [rescheduleExceededSlots, setRescheduleExceededSlots] = useState<string[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { requestPermission, sendNotification, permission } = usePushNotifications();
  const { settings } = useAgendaBranding();
  const { getAvailableTimeSlots, getAllBusinessSlots, getHoursForDay } = useBusinessHours(settings.storeAccountId);
  const navigate = useNavigate();
  const publicLoginPath = withAgendaPublicSearch('/login', settings);
  const publicBookingPath = withAgendaPublicSearch('/agendamento', settings);
  const rescheduleNoticeHours = Math.max(0, settings.rescheduleNoticeHours ?? 2);
  const cancellationNoticeHours = Math.max(0, settings.cancellationNoticeHours ?? 0);

  // Cache para saber quais agendamentos pertencem ao cliente (usado no realtime de serviços)
  const appointmentIdsRef = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if (user && permission !== 'granted') {
      requestPermission();
    }
  }, [user, permission, requestPermission]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(publicLoginPath);
    }
  }, [user, authLoading, navigate, publicLoginPath]);

  useEffect(() => {
    if (user && settings.storeAccountId) {
      fetchAppointments();
      fetchProfileName();

      // Subscribe to realtime changes for this client's appointments
      const appointmentsChannel = supabase
        .channel('client-appointments-changes')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'appointments',filter:`client_id=eq.${user.id}`},()=>{void fetchAppointments();})
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `client_id=eq.${user.id}`
          },
          (payload) => {
            const updatedApt = payload.new as AppointmentRealtimeRow;
            const oldApt = payload.old as AppointmentRealtimeRow;
            if (
              updatedApt.store_account_id &&
              updatedApt.store_account_id !== settings.storeAccountId
            ) {
              return;
            }

            // Otimista: tira instantaneamente de "Próximos" ao cancelar/concluir
            if (updatedApt?.id) {
              setAppointments((prev) =>
                prev.map((a) =>
                  a.id === updatedApt.id
                    ? {
                        ...a,
                        status: updatedApt.status,
                        appointment_date: updatedApt.appointment_date ?? a.appointment_date,
                        appointment_time: updatedApt.appointment_time ?? a.appointment_time,
                      }
                    : a
                )
              );
            }

            fetchAppointments();

            // Notify client when their appointment status changes
            if (oldApt.status !== 'completed' && updatedApt.status === 'completed') {
              if (shouldPlayAgendaSound(settings, 'completion')) {
                playNotificationSound('success');
              }
              toast({
                title: '✅ Atendimento Concluído',
                description: `Seu agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} foi concluído!`,
              });
              sendNotification('✅ Atendimento Concluído', {
                body: `Seu agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)} foi concluído!`,
                tag: `completed-${updatedApt.id}`,
              });
            } else if (oldApt.status !== 'cancelled' && updatedApt.status === 'cancelled') {
              if (shouldPlayAgendaSound(settings, 'cancellation')) {
                playNotificationSound('alert');
              }
              toast({
                title: '❌ Agendamento Cancelado',
                description: `Seu agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} foi cancelado.`,
                variant: 'destructive',
              });
              sendNotification('❌ Agendamento Cancelado', {
                body: `Seu agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)} foi cancelado.`,
                tag: `cancelled-${updatedApt.id}`,
              });
            } else if (
              updatedApt.status === 'scheduled' &&
              oldApt.status === 'scheduled' &&
              (
                oldApt.appointment_date !== updatedApt.appointment_date ||
                oldApt.appointment_time !== updatedApt.appointment_time
              )
            ) {
              if (shouldPlayAgendaSound(settings, 'reschedule')) {
                playNotificationSound();
              }
              toast({
                title: '🔄 Horário Remarcado',
                description: `Seu novo horário ficou para ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}.`,
              });
              sendNotification('🔄 Horário Remarcado', {
                body: `Novo horário: ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}.`,
                tag: `rescheduled-${updatedApt.id}-${updatedApt.appointment_date}-${updatedApt.appointment_time}`,
              });
            }
          }
        )
        .subscribe();

      // Realtime para serviços extras adicionados/removidos (atualiza total e lista imediatamente)
      const servicesChannel = supabase
        .channel('client-appointment-services-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointment_services',
          },
          (payload) => {
            const newRow = payload.new as AppointmentServiceRealtimeRow;
            const oldRow = payload.old as AppointmentServiceRealtimeRow;
            const aptId = newRow?.appointment_id ?? oldRow?.appointment_id;
            if (aptId && appointmentIdsRef.current.has(aptId)) {
              fetchAppointments();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(servicesChannel);
      };
    } else if (user && !settings.storeAccountId) {
      setAppointments([]);
      setLoading(false);
    }
  }, [settings, settings.storeAccountId, user]);

  const fetchAppointments = async () => {
    if (!user || !settings.storeAccountId) return;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        appointment_date,
        appointment_time,
        appointment_type,
        barber_id,
        service_id,
        status,
        barber:barbers(name, phone, photo_url),
        service:services(name, price, duration_minutes)
      `)
      .eq('client_id', user.id)
      .eq('store_account_id', settings.storeAccountId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (!error && data) {
      const appointmentIds = data.map((a) => a.id);
      appointmentIdsRef.current = new Set(appointmentIds);

      // Buscar serviços extras via RPC (evita dependência de FK e garante dados completos)
      const extraServicesMap: Record<string, ExtraService[]> = {};

      if (appointmentIds.length > 0) {
        const { data: extraData, error: extraError } = await supabase
          .rpc('get_appointment_extra_services', { p_appointment_ids: appointmentIds });

        if (!extraError && extraData) {
          (extraData as AppointmentExtraServiceRow[]).forEach((e) => {
            if (!extraServicesMap[e.appointment_id]) extraServicesMap[e.appointment_id] = [];
            extraServicesMap[e.appointment_id].push({
              id: e.service_id,
              name: e.service_name,
              price: Number(e.service_price) || 0,
              duration_minutes: Number(e.service_duration) || 0,
            });
          });
        }
      }

      const formatted = data.map((apt) => ({
        ...apt,
        appointment_type: apt.appointment_type === "queue" ? "queue" as const : "appointment" as const,
        barber: apt.barber as unknown as { name: string; phone?: string | null; photo_url?: string | null },
        service: apt.service as unknown as { name: string; price: number; duration_minutes: number },
        extraServices: extraServicesMap[apt.id] || [],
      }));
      setAppointments(formatted);
    }
    setLoading(false);
  };

  const fetchProfileName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setProfileName(data.full_name || data.username || '');
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    setCancellingId(selectedAppointment.id);
    const { error } = await supabase.rpc('cancel_client_appointment', {
      p_appointment_id: selectedAppointment.id,
    });

    setCancellingId(null);
    setShowCancelDialog(false);

    if (error) {
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar o agendamento.',
        variant: 'destructive',
      });
      fetchAppointments();
    } else {
      const serviceNames = [
        selectedAppointment.service?.name,
        ...selectedAppointment.extraServices.map((service) => service.name),
      ].filter((serviceName): serviceName is string => Boolean(serviceName));
      const cancellationMessage = buildAppointmentCancellationWhatsAppMessage({
        businessName: settings.displayName,
        clientName: selectedAppointment.client_name,
        professionalName: selectedAppointment.barber?.name || settings.professionalLabel,
        serviceNames,
        appointmentDate: selectedAppointment.appointment_date,
        appointmentTime: selectedAppointment.appointment_time,
        totalAmount: getTotalPrice(selectedAppointment),
      });

      openAgendaWhatsAppTargets({
        professionalPhone: selectedAppointment.barber?.phone,
        adminPhone: settings.adminWhatsapp || settings.whatsapp,
        clientMessage: cancellationMessage,
        adminMessage: cancellationMessage,
      });

      toast({
        title: 'Agendamento cancelado',
        description: 'Seu agendamento foi cancelado e o WhatsApp foi aberto para avisar a empresa.',
      });
      fetchAppointments();
    }
  };

  const openCancelDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelDialog(true);
  };

  const getAppointmentStart = (appointment: Appointment) =>
    new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);

  const canRescheduleAppointment = (appointment: Appointment) => {
    if (appointment.status !== 'scheduled' || appointment.appointment_type === 'queue') {
      return false;
    }

    return getAppointmentStart(appointment).getTime() - Date.now() > rescheduleNoticeHours * 60 * 60 * 1000;
  };

  const canCancelAppointment = (appointment: Appointment) => {
    if (appointment.status !== 'scheduled') {
      return false;
    }

    return getAppointmentStart(appointment).getTime() - Date.now() > cancellationNoticeHours * 60 * 60 * 1000;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const dayHours = getHoursForDay(date.getDay());
    return !dayHours?.is_open;
  };

  // Ordenar: Agendados primeiro, depois concluídos, depois cancelados
  const sortByStatus = (a: Appointment, b: Appointment) => {
    const statusOrder = { scheduled: 0, completed: 1, cancelled: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    // Dentro do mesmo status, ordenar por data (mais recente primeiro para histórico)
    return new Date(`${b.appointment_date}T${b.appointment_time}`).getTime() -
           new Date(`${a.appointment_date}T${a.appointment_time}`).getTime();
  };

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'scheduled' && new Date(`${apt.appointment_date}T${apt.appointment_time}`) >= new Date())
    .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`).getTime() -
                    new Date(`${b.appointment_date}T${b.appointment_time}`).getTime());

  const pastAppointments = appointments
    .filter(apt => apt.status !== 'scheduled' || new Date(`${apt.appointment_date}T${apt.appointment_time}`) < new Date())
    .sort(sortByStatus);
  const filteredHistory = pastAppointments.filter(appointment => historyFilter === 'all' || appointment.status === historyFilter);
  const bookAgain = (appointment: Appointment) => {
    saveAgendaBookingDraft({ returnPath: publicBookingPath, storeSlug: settings.slug, step: 'datetime', bookingFlow: 'appointment', serviceIds: [appointment.service_id, ...appointment.extraServices.map(service => service.id)], barberId: appointment.barber_id, appointmentDate: null, appointmentTime: null, clientName: appointment.client_name, clientPhone: '' });
    navigate(publicBookingPath);
  };

  // Calcula preço total incluindo serviços extras
  const getTotalPrice = (apt: Appointment) => {
    const extrasTotal = apt.extraServices.reduce((sum, s) => sum + (s.price || 0), 0);
    return (apt.service?.price || 0) + extrasTotal;
  };

  // Calcula duração total incluindo serviços extras
  const getTotalDuration = (apt: Appointment) => {
    const extrasDuration = apt.extraServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return (apt.service?.duration_minutes || 0) + extrasDuration;
  };

  const fetchRescheduleSlots = async (appointment: Appointment, date: Date) => {
    setRescheduleLoadingSlots(true);

    const dateString = format(date, 'yyyy-MM-dd');
    const totalDuration = getTotalDuration(appointment);
    const validSlots = getAvailableTimeSlots(date, totalDuration);
    const allBusinessSlots = getAllBusinessSlots(date);

    const { data: booked, error: bookedError } = await supabase.rpc('get_barber_booked_slots', {
      p_barber_id: appointment.barber_id,
      p_appointment_date: dateString,
    });

    const appointmentsWithDuration: { time: string; duration: number }[] = [];
    if (!bookedError && booked) {
      for (const row of booked as BookedSlotRow[]) {
        const timeStr = String(row.appointment_time).slice(0, 5);
        const duration = Number(row.duration_minutes) || 0;
        if (timeStr && duration > 0) {
          appointmentsWithDuration.push({ time: timeStr, duration });
        }
      }
    }

    const now = new Date();
    const todayString = format(now, 'yyyy-MM-dd');
    const isToday = dateString === todayString;
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const originalTime = appointment.appointment_time.slice(0, 5);
    const sameDayAsOriginal = dateString === appointment.appointment_date;

    const filterPast = (slot: string) => {
      if (!isToday) return true;
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m > currentTotalMinutes;
    };

    const filteredValidSlots = validSlots.filter(filterPast);
    const filteredAllSlots = allBusinessSlots.filter(filterPast);
    const exceededSet = new Set(filteredAllSlots.filter((slot) => !filteredValidSlots.includes(slot)));

    const occupiedSlots: string[] = [];
    const freeSlots: string[] = [];

    filteredValidSlots.forEach((slot) => {
      const isCurrentSlot = sameDayAsOriginal && slot === originalTime;
      if (isCurrentSlot) {
        freeSlots.push(slot);
        return;
      }

      const [slotHour, slotMin] = slot.split(':').map(Number);
      const slotStartMinutes = slotHour * 60 + slotMin;
      const slotEndMinutes = slotStartMinutes + totalDuration;

      let hasConflict = false;
      for (const bookedSlot of appointmentsWithDuration) {
        const [bookedHour, bookedMin] = bookedSlot.time.split(':').map(Number);
        const bookedStartMinutes = bookedHour * 60 + bookedMin;
        const bookedEndMinutes = bookedStartMinutes + bookedSlot.duration;
        if (slotStartMinutes < bookedEndMinutes && slotEndMinutes > bookedStartMinutes) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        occupiedSlots.push(slot);
      } else {
        freeSlots.push(slot);
      }
    });

    setRescheduleAllSlots([...filteredValidSlots, ...Array.from(exceededSet)].sort());
    setRescheduleBookedSlots(occupiedSlots);
    setRescheduleExceededSlots(Array.from(exceededSet));
    if (!freeSlots.includes(rescheduleTime)) {
      setRescheduleTime((current) =>
        current && freeSlots.includes(current) ? current : sameDayAsOriginal ? originalTime : '',
      );
    }
    setRescheduleLoadingSlots(false);
  };

  useEffect(() => {
    if (!showRescheduleDialog || !rescheduleAppointment || !rescheduleDate) {
      return;
    }

    void fetchRescheduleSlots(rescheduleAppointment, rescheduleDate);
  }, [showRescheduleDialog, rescheduleAppointment, rescheduleDate]);

  const openRescheduleDialog = (appointment: Appointment) => {
    setRescheduleAppointment(appointment);
    setRescheduleDate(parseLocalDate(appointment.appointment_date));
    setRescheduleTime(appointment.appointment_time.slice(0, 5));
    setRescheduleAllSlots([]);
    setRescheduleBookedSlots([]);
    setRescheduleExceededSlots([]);
    setShowRescheduleDialog(true);
  };

  const closeRescheduleDialog = () => {
    setShowRescheduleDialog(false);
    setRescheduleAppointment(null);
    setRescheduleDate(undefined);
    setRescheduleTime('');
    setRescheduleAllSlots([]);
    setRescheduleBookedSlots([]);
    setRescheduleExceededSlots([]);
    setRescheduleLoadingSlots(false);
  };

  const handleRescheduleAppointment = async () => {
    if (!rescheduleAppointment || !rescheduleDate || !rescheduleTime) {
      toast({
        title: 'Selecione o novo horário',
        description: 'Escolha uma data e um horário disponíveis para continuar.',
        variant: 'destructive',
      });
      return;
    }

    const nextDate = format(rescheduleDate, 'yyyy-MM-dd');
    const nextTime = `${rescheduleTime}:00`;
    if (
      nextDate === rescheduleAppointment.appointment_date &&
      nextTime === rescheduleAppointment.appointment_time
    ) {
      toast({
        title: 'Nenhuma alteração detectada',
        description: 'Escolha um novo horário para concluir a remarcação.',
        variant: 'destructive',
      });
      return;
    }

    setReschedulingId(rescheduleAppointment.id);

    const { error } = await supabase.rpc('reschedule_client_appointment', {
      p_appointment_id: rescheduleAppointment.id,
      p_appointment_date: nextDate,
      p_appointment_time: nextTime,
    });

    setReschedulingId(null);

    if (error) {
      toast({
        title: 'Erro ao remarcar',
        description: error.message || 'Não foi possível alterar o horário.',
        variant: 'destructive',
      });
      return;
    }

    const serviceNames = [
      rescheduleAppointment.service?.name,
      ...rescheduleAppointment.extraServices.map((service) => service.name),
    ].filter((serviceName): serviceName is string => Boolean(serviceName));
    const rescheduleMessage = buildAppointmentRescheduleWhatsAppMessage({
      businessName: settings.displayName,
      clientName: rescheduleAppointment.client_name,
      professionalName: rescheduleAppointment.barber?.name || settings.professionalLabel,
      serviceNames,
      previousAppointmentDate: rescheduleAppointment.appointment_date,
      previousAppointmentTime: rescheduleAppointment.appointment_time,
      appointmentDate: nextDate,
      appointmentTime: nextTime,
    });

    openAgendaWhatsAppTargets({
      professionalPhone: rescheduleAppointment.barber?.phone,
      adminPhone: settings.adminWhatsapp || settings.whatsapp,
      clientMessage: rescheduleMessage,
      adminMessage: rescheduleMessage,
    });

    toast({
      title: 'Horário remarcado',
      description: 'Seu novo horário foi salvo e o WhatsApp foi aberto para avisar a empresa.',
    });

    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === rescheduleAppointment.id
          ? {
              ...appointment,
              appointment_date: nextDate,
              appointment_time: nextTime,
            }
          : appointment,
      ),
    );
    closeRescheduleDialog();
    fetchAppointments();
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-16 h-16 text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="history-page client-agenda container px-4 py-5">
        <header className="client-agenda-heading"><h1>Meus <span className="text-primary">agendamentos</span></h1><p>Acompanhe seus próximos horários e histórico.</p><Button className="w-full" onClick={()=>navigate(publicBookingPath)}><Plus className="h-4 w-4 mr-2"/>Novo Agendamento</Button></header>
        <div className="metric-actions client-agenda-metrics" aria-label="Filtrar meus agendamentos">
          {([{value:'upcoming',label:'Próximos',count:upcomingAppointments.length,icon:Calendar},{value:'completed',label:'Concluídos',count:appointments.filter(a=>a.status==='completed').length,icon:CheckCircle},{value:'cancelled',label:'Cancelados',count:appointments.filter(a=>a.status==='cancelled').length,icon:XCircle}] as const).map(metric=><button key={metric.value} className={`metric-action metric-${metric.value}`} aria-pressed={metric.value==='upcoming'?clientSection==='upcoming':clientSection==='history'&&historyFilter===metric.value} onClick={()=>{if(metric.value==='upcoming')setClientSection('upcoming');else{setClientSection('history');setHistoryFilter(metric.value);setHistoryLimit(10);}}}><span className="metric-icon"><metric.icon aria-hidden="true" className="h-4 w-4"/></span><span><small>{metric.label}</small><strong><AnimatedNumber value={metric.count}/></strong></span></button>)}
        </div>
        <Button variant="outline" className="client-loyalty-button" aria-pressed={clientSection==='loyalty'} onClick={()=>setClientSection(current=>current==='loyalty'?'upcoming':'loyalty')}>{clientSection==='loyalty'?'Voltar aos agendamentos':'Fidelidade'}</Button>
        <section className="client-agenda-panel" aria-label={clientSection==='upcoming'?'Próximos agendamentos':clientSection==='history'?'Histórico de agendamentos':'Fidelidade'}>
          {clientSection==='loyalty'?<LoyaltyTab isAdmin={false} clientName={profileName||undefined}/>:<>
            {clientSection==='history'&&<div className="history-filter-chips" aria-label="Filtrar histórico">{([{value:'all',label:'Todos'},{value:'completed',label:'Concluídos'},{value:'cancelled',label:'Cancelados'}] as const).map(filter=><Button size="sm" variant={historyFilter===filter.value?'secondary':'ghost'} key={filter.value} aria-pressed={historyFilter===filter.value} onClick={()=>{setHistoryFilter(filter.value);setHistoryLimit(10);}}>{filter.label}</Button>)}</div>}
            <div className="client-appointment-list">
              {(clientSection==='upcoming'?upcomingAppointments.slice(0,upcomingLimit):filteredHistory.slice(0,historyLimit)).map(apt=><button className="client-appointment-row" key={apt.id} aria-label={`Detalhes de ${apt.service?.name}, ${format(parseLocalDate(apt.appointment_date),'dd/MM')} às ${apt.appointment_time.slice(0,5)}`} onClick={()=>setViewAppointment(apt)}>
                <time className="client-date-tile"><span>{format(parseLocalDate(apt.appointment_date),'dd/MM')}</span><strong>{apt.appointment_time.slice(0,5)}</strong><small>{format(parseLocalDate(apt.appointment_date),'EEE',{locale:ptBR})}</small></time>
                <span className="client-appointment-content"><strong>{apt.service?.name}</strong><span className="client-barber-line">{apt.barber?.photo_url?<img src={apt.barber.photo_url} alt=""/>:<User className="h-3 w-3"/>}<span>{apt.barber?.name}</span></span><small className="client-appointment-meta"><Clock className="h-3 w-3"/><AnimatedNumber value={getTotalDuration(apt)}/> min<span className="meta-divider"/><AnimatedNumber value={getTotalPrice(apt)??0} currency decimals={2}/></small></span>
                <span className="client-appointment-trailing"><span className={`status-pill status-${apt.status}`}>{apt.status==='scheduled'?'Agendado':apt.status==='completed'?'Concluído':'Cancelado'}</span><span className="row-arrow"><ChevronRight className="h-4 w-4" aria-hidden="true"/></span></span>
              </button>)}
            </div>
            {(clientSection==='upcoming'?upcomingAppointments.length:filteredHistory.length)===0&&<div className="empty-panel"><Calendar aria-hidden="true"/><h2 className="text-base font-semibold">{clientSection==='upcoming'?'Nenhum horário por aqui':'Nenhum atendimento neste filtro'}</h2><p>{clientSection==='upcoming'?'Seu próximo agendamento aparecerá aqui.':'Mude o filtro para consultar outros atendimentos.'}</p>{clientSection==='upcoming'&&<Button className="mt-4" onClick={()=>navigate(publicBookingPath)}>Agendar horário</Button>}</div>}
            {clientSection==='upcoming'&&upcomingAppointments.length>upcomingLimit&&<Button variant="outline" className="history-show-all" onClick={()=>setUpcomingLimit(upcomingAppointments.length)}>Ver todos os agendamentos <ChevronRight className="h-4 w-4 ml-2"/></Button>}
            {clientSection==='history'&&<ListMore total={filteredHistory.length} shown={historyLimit} onMore={()=>setHistoryLimit(n=>n+10)}/>}
          </>}
        </section>
      </div>
      <Dialog open={!!viewAppointment} onOpenChange={open=>{if(!open)setViewAppointment(null);}}><DialogContent><DialogHeader><DialogTitle>Detalhes do agendamento</DialogTitle><DialogDescription>Confira seu atendimento e gerencie o horário.</DialogDescription></DialogHeader>{viewAppointment&&<div className="space-y-4"><StatusBadge status={viewAppointment.status}/><p className="font-medium">{format(parseLocalDate(viewAppointment.appointment_date),"dd 'de' MMMM",{locale:ptBR})} · {viewAppointment.appointment_time.slice(0,5)}</p><p className="text-sm text-muted-foreground">{viewAppointment.barber?.name}</p><div className="space-y-2 text-sm"><p>{viewAppointment.service?.name} · <AnimatedNumber value={viewAppointment.service?.price??0} currency decimals={2}/></p>{viewAppointment.extraServices.map(extra=><p key={extra.id}>+ {extra.name} · <AnimatedNumber value={extra.duration_minutes}/> min · <AnimatedNumber value={extra.price??0} currency decimals={2}/></p>)}<p className="font-semibold border-t border-border pt-3"><AnimatedNumber value={getTotalDuration(viewAppointment)}/> min · <AnimatedNumber value={getTotalPrice(viewAppointment)??0} currency decimals={2}/></p></div><div className="form-actions flex-wrap">{canRescheduleAppointment(viewAppointment)&&<Button variant="outline" onClick={()=>{setViewAppointment(null);openRescheduleDialog(viewAppointment);}}><CalendarSync className="h-4 w-4 mr-1"/>Remarcar</Button>}{canCancelAppointment(viewAppointment)&&<Button variant="outline" className="text-destructive" onClick={()=>{setViewAppointment(null);openCancelDialog(viewAppointment);}}><X className="h-4 w-4 mr-1"/>Cancelar</Button>}{!upcomingAppointments.some(a=>a.id===viewAppointment.id)&&<Button onClick={()=>bookAgain(viewAppointment)}>Agendar novamente</Button>}</div></div>}</DialogContent></Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
              {cancellationNoticeHours > 0 ? ` Cancelamentos ficam disponíveis até ${cancellationNoticeHours} hora(s) antes do atendimento.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingId ? (
                <Loader2 className="w-6 h-6" />
              ) : (
                'Cancelar Agendamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRescheduleDialog} onOpenChange={(open) => !open && closeRescheduleDialog()}>
        <DialogContent className="max-h-[90svh] max-w-[95vw] overflow-hidden p-0 sm:max-w-3xl">
          <div className="max-h-[90svh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Remarcar agendamento</DialogTitle>
              <DialogDescription>
                O mesmo {settings.professionalLabel.toLowerCase()} e os mesmos serviços serão mantidos.
                Remarcações ficam disponíveis até <AnimatedNumber value={rescheduleNoticeHours}/> hora(s) antes do atendimento.
              </DialogDescription>
            </DialogHeader>

            {rescheduleAppointment && (
              <div className="mt-4 space-y-5">
                <div className="rounded-xl border bg-secondary/40 p-4 text-sm">
                  <p className="font-medium">{rescheduleAppointment.barber?.name}</p>
                  <p className="text-muted-foreground">
                    Horário atual: {format(parseLocalDate(rescheduleAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                    {" "}às {rescheduleAppointment.appointment_time.slice(0, 5)}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">Nova data</Label>
                    <CalendarComponent
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={(date) => {
                        setRescheduleDate(date);
                        setRescheduleTime('');
                      }}
                      disabled={isDateDisabled}
                      locale={ptBR}
                      className="rounded-xl border pointer-events-auto"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Novo horário</Label>
                    {!rescheduleDate ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Selecione uma data para ver os horários.
                      </p>
                    ) : rescheduleLoadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : rescheduleAllSlots.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum horário disponível nesta data para a duração total do atendimento.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span>Disponível</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-destructive"></span>
                            <span>Ocupado</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-border"></span>
                            <span>Excede horário</span>
                          </div>
                        </div>
                        <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto p-1">
                          {rescheduleAllSlots.map((slot) => {
                            const isBooked = rescheduleBookedSlots.includes(slot);
                            const isExceeded = rescheduleExceededSlots.includes(slot);
                            const isFree = !isBooked && !isExceeded;

                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => isFree && setRescheduleTime(slot)}
                                disabled={!isFree}
                                className={cn(
                                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                                  isBooked
                                    ? 'cursor-not-allowed border-destructive/30 bg-destructive/10 text-destructive opacity-60'
                                    : isExceeded
                                      ? 'cursor-not-allowed border-border bg-background text-muted-foreground opacity-50'
                                      : rescheduleTime === slot
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-emerald-500/30 bg-primary/10 text-foreground hover:border-emerald-500/60'
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-2 w-2 shrink-0 rounded-full',
                                    isBooked ? 'bg-destructive' : isExceeded ? 'bg-border' : 'bg-emerald-500',
                                  )}
                                ></span>
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-end">
                  <Button variant="outline" type="button" onClick={closeRescheduleDialog}>
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRescheduleAppointment}
                    disabled={!rescheduleDate || !rescheduleTime || reschedulingId === rescheduleAppointment.id}
                  >
                    {reschedulingId === rescheduleAppointment.id ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6" />
                        Salvando...
                      </>
                    ) : (
                      'Confirmar novo horário'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
