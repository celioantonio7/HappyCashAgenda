import { formatCurrency } from '@/lib/formatCurrency';
import { ChevronRight } from '@/components/animated-icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ArrowRight } from '@/components/animated-icons';
import { useVisibleRefresh } from '@/hooks/useVisibleRefresh';
import { prepareProfileImage, uploadCollectionPhoto } from '@/lib/profileImage';
import { ListMore } from '@/components/app/ListMore';
import { CollectionPhoto } from '@/components/app/CollectionPhoto';
import { OperationalBarChart, OperationalPieChart, OperationalAreaChart } from '@/components/app/OperationalCharts';
import { ownerGroups } from '@/components/app/navigation';
/**
 * ==============================================================
 * PÁGINA: AdminDashboard (Painel Administrativo)
 * ==============================================================
 *
 * PROPÓSITO:
 * Painel de controle para administradores da barbearia.
 *
 * FUNCIONALIDADES:
 * - Visão geral com estatísticas e gráficos
 * - Listagem e filtros de agendamentos
 * - CRUD de barbeiros (com upload de foto)
 * - CRUD de serviços
 * - Marcar agendamentos como concluído/cancelado
 *
 * ACESSO:
 * Apenas usuários com role 'admin' na tabela user_roles
 *
 * ==============================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Users, Scissors, TrendingUp,
  Plus, Edit, Check, X, Loader2, Phone, Upload, Image,
  BarChart3, CalendarDays, Filter, Search, Trash2, DollarSign,
  Package, ShoppingBag, AlertCircle, CheckCircle, XCircle, Eye, EyeOff, Key,
  Trophy, MapPin, ClockIcon
} from '@/components/animated-icons';
import { LoyaltyTab } from '@/components/admin/LoyaltyTab';
import { AppointmentQueueTab } from '@/components/admin/AppointmentQueueTab';
import { ProductSalesTab } from '@/components/admin/ProductSalesTab';
import { ClientsTab } from '@/components/admin/ClientsTab';
import { LocationsTab } from '@/components/admin/LocationsTab';
import { BusinessHoursTab } from '@/components/admin/BusinessHoursTab';
import { BrandingTab } from '@/components/admin/BrandingTab';
import { PublicPageSettingsTab } from '@/components/admin/PublicPageSettingsTab';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { supabase } from '@/integrations/supabase/client';
import { cn, parseLocalDate } from '@/lib/utils';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
import { playNotificationSound, shouldPlayAgendaSound } from '@/lib/notificationSound';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';



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

interface Barber {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  commission: number;
  user_id: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

type PendingDeletion =
  | { kind: 'barber'; item: Barber }
  | { kind: 'service'; item: Service }
  | { kind: 'product'; item: Product }
  | null;

interface Service {
  updated_at?: string;
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

type AppointmentRealtimeRow = {
  client_phone?: string | null;
  id?: string;
  client_name?: string;
  appointment_date?: string;
  appointment_time?: string | null;
  appointment_type?: Appointment['appointment_type'];
  status?: Appointment['status'];
};

type AppointmentServiceRealtimeRow = {
  id?: string;
  service_id?: string;
  appointment_id?: string;
  added_by_barber?: boolean;
};

type BarberRelation = { name?: string | null } | { name?: string | null }[] | null;

type AppointmentServiceRpcRow = {
  appointment_id: string;
  service_id: string;
  service_name: string;
  service_price: number | string | null;
  service_duration?: number | string | null;
};

const isMissingColumnError = (message: string) =>
  /column|schema cache|does not exist|PGRST204/i.test(message);

// Cores para gráficos


export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [overviewSection,setOverviewSection]=useState<'operation'|'performance'>('operation');
  const [listLimit,setListLimit]=useState(10);
  useEffect(()=>{setListLimit(10);},[activeTab]);
  const setActiveTab = (tab: string) => setSearchParams(params => { params.set('tab', tab); return params; });

  // Filters
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [showBarberDialog, setShowBarberDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [barberName, setBarberName] = useState('');
  const [barberEmail, setBarberEmail] = useState('');
  const [barberPhone, setBarberPhone] = useState('');
  const [barberBio, setBarberBio] = useState('');
  const [barberCommission, setBarberCommission] = useState('0');
  const [barberUsername, setBarberUsername] = useState('');
  const [barberPassword, setBarberPassword] = useState('');
  const [barberPhoto, setBarberPhoto] = useState<File | null>(null);
  const [barberPhotoPreview, setBarberPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [servicePrice, setServicePrice] = useState('');
  const [servicePhoto,setServicePhoto]=useState<string|null>(null);
  const [photoVersion,setPhotoVersion]=useState(0);
  const [preparingServicePhoto,setPreparingServicePhoto]=useState(false);

  // Product form fields
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('0');
  const [productCategory, setProductCategory] = useState('');
  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null);

  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings } = useAgendaBranding();
  useVisibleRefresh(()=>{void Promise.all([fetchBarbers(),fetchServices(),fetchProducts()]);},!!settings.storeAccountId && isAdmin);
  const publicBookingPath = withAgendaPublicSearch('/agendamento', settings);
  const { toast } = useToast();
  const { requestPermission, sendNotification, permission } = usePushNotifications();
  const navigate = useNavigate();

  // Request notification permission on mount
  useEffect(() => {
    if (isAdmin && permission !== 'granted') {
      requestPermission();
    }
  }, [isAdmin, permission, requestPermission]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!settings.storeAccountId) {
      setLoading(false);
      return;
    }

    fetchAllData();

      // Subscribe to realtime changes in appointments
      const appointmentsChannel = supabase
        .channel('admin-appointments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter: `store_account_id=eq.${settings.storeAccountId}`,
          },
          (payload) => {
            const newApt = payload.new as AppointmentRealtimeRow;
            fetchAppointments();
            if (shouldPlayAgendaSound(settings, 'new_appointment')) {
              playNotificationSound();
            }

            // In-app toast notification
            toast({
              title: '🔔 Novo Agendamento',
              description: `${newApt.client_name} agendou para ${format(parseLocalDate(newApt.appointment_date), "dd/MM")} às ${newApt.appointment_time?.slice(0, 5)}`,
            });

            // Browser push notification (works even when tab is not focused)
            sendNotification('🔔 Novo Agendamento', {
              body: `${newApt.client_name} agendou para ${format(parseLocalDate(newApt.appointment_date), "dd/MM")} às ${newApt.appointment_time?.slice(0, 5)}`,
              tag: `appointment-${newApt.id}`,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `store_account_id=eq.${settings.storeAccountId}`,
          },
          (payload) => {
            const updatedApt = payload.new as AppointmentRealtimeRow;
            const oldApt = payload.old as AppointmentRealtimeRow;

            // Otimista: remove/atualiza imediatamente em tela
            if (updatedApt?.id) {
              setAppointments((prev) =>
                prev.map((a) =>
                  a.id === updatedApt.id
                    ? {
                        ...a,
                        status: updatedApt.status,
                        appointment_date: updatedApt.appointment_date ?? a.appointment_date,
                        appointment_time: updatedApt.appointment_time ?? a.appointment_time,
                        appointment_type: updatedApt.appointment_type ?? a.appointment_type,
                        client_name: updatedApt.client_name ?? a.client_name,
                        client_phone: updatedApt.client_phone ?? a.client_phone,
                      }
                    : a
                )
              );
            }

            fetchAppointments();

            if (oldApt.status !== 'cancelled' && updatedApt.status === 'cancelled') {
              if (shouldPlayAgendaSound(settings, 'cancellation')) {
                playNotificationSound('alert');
              }
              toast({
                title: '❌ Agendamento Cancelado',
                description: `${updatedApt.client_name} cancelou o agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}.`,
                variant: 'destructive',
              });

              // Browser push notification for cancellation
              sendNotification('❌ Agendamento Cancelado', {
                body: `${updatedApt.client_name} cancelou o agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}`,
                tag: `cancellation-${updatedApt.id}`,
              });
            } else if (oldApt.status !== 'completed' && updatedApt.status === 'completed') {
              // Notifica quando barbeiro conclui um agendamento
              if (shouldPlayAgendaSound(settings, 'completion')) {
                playNotificationSound('success');
              }
              toast({
                title: '✅ Agendamento Concluído',
                description: `${updatedApt.client_name} foi atendido.`,
              });
              sendNotification('✅ Agendamento Concluído', {
                body: `${updatedApt.client_name} - agendamento de ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)} foi concluído.`,
                tag: `completed-${updatedApt.id}`,
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
                title: '🔄 Agendamento Remarcado',
                description: `${updatedApt.client_name} mudou para ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}.`,
              });
              sendNotification('🔄 Agendamento Remarcado', {
                body: `${updatedApt.client_name} reagendou para ${format(parseLocalDate(updatedApt.appointment_date), "dd/MM")} às ${updatedApt.appointment_time?.slice(0, 5)}.`,
                tag: `rescheduled-${updatedApt.id}-${updatedApt.appointment_date}-${updatedApt.appointment_time}`,
              });
            }
          }
        )
        .subscribe();

      // Also listen for appointment_services changes (extra services added)
      const servicesChannel = supabase
        .channel('admin-appointment-services-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointment_services',
            filter: `store_account_id=eq.${settings.storeAccountId}`,
          },
          async (payload) => {
            const newService = payload.new as AppointmentServiceRealtimeRow;

            // Buscar dados do agendamento e barbeiro para notificar
            const { data: aptData } = await supabase
              .from('appointments')
              .select('client_name, barber_id, barbers(name)')
              .eq('id', newService.appointment_id)
              .single();

            if (aptData && newService.added_by_barber) {
              const barberRelation = aptData.barbers as BarberRelation;
              const barberName = Array.isArray(barberRelation)
                ? barberRelation[0]?.name
                : barberRelation?.name || settings.professionalLabel;
              const clientName = aptData.client_name;

              // Buscar nome do serviço adicionado
              const { data: serviceData } = await supabase
                .from('services')
                .select('name')
                .eq('id', newService.service_id)
                .single();

              const serviceName = serviceData?.name || 'serviço';

              toast({
                title: '✂️ Serviço Adicionado',
                description: `${barberName} adicionou "${serviceName}" para ${clientName}`,
              });

              sendNotification('✂️ Serviço Adicionado', {
                body: `${barberName} adicionou "${serviceName}" para ${clientName}`,
                tag: `service-added-${newService.id}`,
              });
            }

            fetchAppointments();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointment_services',
            filter: `store_account_id=eq.${settings.storeAccountId}`,
          },
          () => {
            fetchAppointments();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'appointment_services',
            filter: `store_account_id=eq.${settings.storeAccountId}`,
          },
          () => {
            fetchAppointments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(servicesChannel);
      };
  }, [authLoading, isAdmin, settings, settings.storeAccountId]);

  const confirmAppointmentPayment = async (appointmentId: string) => {
    const { error } = await supabase.rpc('confirm_agenda_appointment_payment', {
      p_appointment_id: appointmentId,
    });

    if (error) {
      toast({
        title: 'Erro ao confirmar pagamento',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Pagamento confirmado',
      description: 'O agendamento foi marcado como pago.',
    });
    fetchAppointments();
  };

  const fetchAllData = async () => {
    await Promise.all([fetchAppointments(), fetchBarbers(), fetchServices(), fetchProducts()]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    if (!settings.storeAccountId) return;

    const appointmentsSelect = `
        id,
        client_name,
        client_phone,
        appointment_date,
        appointment_time,
        created_at,
        status,
        payment_method,
        payment_status,
        barber_id,
        service_id,
        barber:barbers(id, name, phone),
        service:services(id, name, price, duration_minutes)
      `;
    const appointmentsSelectWithType = `
        id,
        client_name,
        client_phone,
        appointment_date,
        appointment_time,
        appointment_type,
        created_at,
        status,
        payment_method,
        payment_status,
        barber_id,
        service_id,
        barber:barbers(id, name, phone),
        service:services(id, name, price, duration_minutes)
      `;

    const queryAppointments = (select: string) =>
      supabase
        .from('appointments')
        .select(select)
        .eq('store_account_id', settings.storeAccountId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .returns<Omit<Appointment, 'extraServices'>[]>();

    let { data, error } = await queryAppointments(appointmentsSelectWithType);

    if (error && isMissingColumnError(error.message)) {
      const fallback = await queryAppointments(appointmentsSelect);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Erro ao buscar agendamentos:', error.message);
      return;
    }

    if (data) {
      // Buscar serviços extras via RPC (evita dependência de FK e mantém a soma correta)
      const appointmentIds = data.map((a) => a.id);
      const extraServicesMap: Record<string, ExtraService[]> = {};

      if (appointmentIds.length > 0) {
        const { data: extraData, error: extraError } = await supabase
          .rpc('get_appointment_extra_services', { p_appointment_ids: appointmentIds });

        if (!extraError && extraData) {
          (extraData as AppointmentServiceRpcRow[]).forEach((e) => {
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
        appointment_type: (apt as Partial<Appointment>).appointment_type ?? 'appointment',
        barber: apt.barber as unknown as { name: string; id?: string },
        service: apt.service as unknown as { name: string; price: number; id?: string; duration_minutes?: number },
        extraServices: extraServicesMap[apt.id] || [],
      }));
      setAppointments(formatted);
    }
  };

  const fetchBarbers = async () => {
    if (!settings.storeAccountId) return;
    const { data } = await supabase
      .from('barbers')
      .select('id, name, email, phone, photo_url, bio, is_active, created_at, updated_at, commission, user_id, username, owner_user_id, store_account_id')
      .eq('store_account_id', settings.storeAccountId)
      .order('name');
    if (data) setBarbers(data);
  };

  const fetchServices = async () => {
    if (!settings.storeAccountId) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('store_account_id', settings.storeAccountId)
      .order('name');
    if (data) setServices(data);
  };

  const fetchProducts = async () => {
    if (!settings.storeAccountId) return;
    const { data } = await supabase
      .from('agenda_products')
      .select('*')
      .eq('store_account_id', settings.storeAccountId)
      .order('name');
    if (data) setProducts(data);
  };

  // Calcula o preço total de um agendamento incluindo serviços extras
  const getAppointmentTotalPrice = (apt: Appointment) => {
    const extrasTotal = apt.extraServices.reduce((sum, s) => sum + (s.price || 0), 0);
    return (apt.service?.price || 0) + extrasTotal;
  };

  // Calcula a duração total de um agendamento incluindo serviços extras
  const getAppointmentTotalDuration = (apt: Appointment) => {
    const extrasDuration = apt.extraServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return (apt.service?.duration_minutes || 0) + extrasDuration;
  };

  // Stats
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Agendamentos na semana (apenas scheduled, para ver o que vem)
  const weeklyAppointments = appointments.filter(a => {
    const date = parseLocalDate(a.appointment_date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd }) && a.status === 'scheduled';
  });

  // Todos agendamentos do mês (não cancelados)
  const monthlyAppointments = appointments.filter(a => {
    const date = parseLocalDate(a.appointment_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd }) && a.status !== 'cancelled';
  });

  // Apenas concluídos do mês para cálculo de faturamento real
  const monthlyCompletedAppointments = appointments.filter(a => {
    const date = parseLocalDate(a.appointment_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd }) && a.status === 'completed';
  });

  const monthlyCancelledAppointments = appointments.filter(a => {
    const date = parseLocalDate(a.appointment_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd }) && a.status === 'cancelled';
  });

  // Faturamento semanal: apenas concluídos (incluindo serviços extras)
  const weeklyCompletedAppointments = appointments.filter(a => {
    const date = parseLocalDate(a.appointment_date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd }) && a.status === 'completed';
  });
  const weeklyRevenue = weeklyCompletedAppointments.reduce((sum, a) => sum + getAppointmentTotalPrice(a), 0);

  // Faturamento mensal: apenas concluídos (incluindo serviços extras)
  const monthlyRevenue = monthlyCompletedAppointments.reduce((sum, a) => sum + getAppointmentTotalPrice(a), 0);

  const todayAppointments = appointments.filter(
    a => a.appointment_date === format(today, 'yyyy-MM-dd') && a.status === 'scheduled'
  );

  const todayStr = format(today, 'yyyy-MM-dd');
  const monthlyTotalAppointmentsWithCancelled = monthlyAppointments.length + monthlyCancelledAppointments.length;
  const monthlyAverageTicket = monthlyCompletedAppointments.length > 0
    ? monthlyRevenue / monthlyCompletedAppointments.length
    : 0;
  const monthlyCancellationRate = monthlyTotalAppointmentsWithCancelled > 0
    ? (monthlyCancelledAppointments.length / monthlyTotalAppointmentsWithCancelled) * 100
    : 0;
  const pendingPixAppointments = appointments
    .filter(a => a.status === 'scheduled' && a.payment_method === 'pix' && a.payment_status === 'pending')
    .sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) return a.appointment_date.localeCompare(b.appointment_date);
      return a.appointment_time.localeCompare(b.appointment_time);
    });
  const lowStockAgendaProducts = products
    .filter(product => product.is_active && product.stock_quantity <= 3)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 5);
  const upcomingScheduledAppointments = appointments
    .filter(a => a.status === 'scheduled' && a.appointment_date >= todayStr)
    .sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) return a.appointment_date.localeCompare(b.appointment_date);
      return a.appointment_time.localeCompare(b.appointment_time);
    })
    .slice(0, 5);

  // Dados para gráficos
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAppointments = appointments.filter(
        a => a.appointment_date === dateStr && a.status !== 'cancelled'
      );
      const revenue = dayAppointments.reduce((sum, a) => sum + getAppointmentTotalPrice(a), 0);
      data.push({
        name: format(date, 'EEE', { locale: ptBR }),
        date: dateStr,
        agendamentos: dayAppointments.length,
        faturamento: revenue,
      });
    }
    return data;
  };

  const getServiceDistribution = () => {
    const distribution: Record<string, number> = {};
    monthlyAppointments.forEach(a => {
      const serviceName = a.service?.name || 'Outro';
      distribution[serviceName] = (distribution[serviceName] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getBarberPerformance = () => {
    const performance: Record<string, { count: number; revenue: number }> = {};
    // Filtrar apenas agendamentos concluídos para o gráfico de desempenho
    const completedOnly = appointments.filter(a => {
      const date = parseLocalDate(a.appointment_date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd }) && a.status === 'completed';
    });
    completedOnly.forEach(a => {
      const barberName = a.barber?.name || 'Outro';
      if (!performance[barberName]) {
        performance[barberName] = { count: 0, revenue: 0 };
      }
      performance[barberName].count += 1;
      performance[barberName].revenue += getAppointmentTotalPrice(a);
    });
    // Ordenar do maior para o menor
    return Object.entries(performance)
      .map(([name, data]) => ({
        name,
        agendamentos: data.count,
        faturamento: data.revenue,
      }))
      .sort((a, b) => b.agendamentos - a.agendamentos);
  };

  // Cálculo de comissões por barbeiro
  const getBarberCommissions = () => {
    const commissions: Record<string, { barber: Barber; totalServices: number; totalCommission: number; totalRevenue: number }> = {};

    // Apenas agendamentos concluídos do mês
    monthlyCompletedAppointments.forEach(apt => {
      const barber = barbers.find(b => b.id === apt.barber_id);
      if (!barber) return;

      if (!commissions[barber.id]) {
        commissions[barber.id] = {
          barber,
          totalServices: 0,
          totalCommission: 0,
          totalRevenue: 0
        };
      }

      // Contar serviço principal + extras
      const extrasCount = apt.extraServices.length;
      const servicesCount = 1 + extrasCount;

      commissions[barber.id].totalServices += servicesCount;
      commissions[barber.id].totalCommission += servicesCount * (barber.commission || 0);
      commissions[barber.id].totalRevenue += getAppointmentTotalPrice(apt);
    });

    return Object.values(commissions).sort((a, b) => b.totalCommission - a.totalCommission);
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesBarber = filterBarber === 'all' || apt.barber_id === filterBarber;
    const matchesService = filterService === 'all' || apt.service_id === filterService;
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchesSearch = !searchTerm ||
      apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.client_phone?.includes(searchTerm);

    return matchesBarber && matchesService && matchesStatus && matchesSearch;
  });

  // Handlers
  const updateAppointmentStatus = async (id: string, status: 'completed' | 'cancelled') => {
    // Otimista: atualiza imediatamente no estado local (remove da aba "agendados" na hora)
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      // Recarrega para reverter caso o update falhe
      fetchAppointments();
    } else {
      toast({ title: 'Atualizado', description: `Status alterado para ${status === 'completed' ? 'concluído' : 'cancelado'}.` });
      fetchAppointments();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBarberPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setBarberPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadBarberPhoto = async (barberId: string): Promise<string | null> => {
    if (!barberPhoto) return null;

    const fileExt = barberPhoto.name.split('.').pop();
    const fileName = `${settings.storeAccountId}/${barberId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('barber-photos')
      .upload(fileName, barberPhoto);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('barber-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const openBarberDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setBarberName(barber.name);
      setBarberEmail(barber.email || '');
      setBarberPhone(barber.phone || '');
      setBarberBio(barber.bio || '');
      setBarberCommission(String(barber.commission || 0));
      setBarberPhotoPreview(barber.photo_url);
      setBarberUsername('');
      setBarberPassword('');
    } else {
      setEditingBarber(null);
      setBarberName('');
      setBarberEmail('');
      setBarberPhone('');
      setBarberBio('');
      setBarberCommission('0');
      setBarberPhotoPreview(null);
      setBarberUsername('');
      setBarberPassword('');
    }
    setBarberPhoto(null);
    setShowBarberDialog(true);
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductDescription(product.description || '');
      setProductPrice(String(product.price));
      setProductStock(String(product.stock_quantity));
      setProductCategory(product.category || '');
      setProductPhotoPreview(product.image_url);
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductStock('0');
      setProductCategory('');
      setProductPhotoPreview(null);
    }
    setProductPhoto(null);
    setShowProductDialog(true);
  };

  const openServiceDialog = (service?: Service) => {
    setServicePhoto(null);
    if (service) {
      setEditingService(service);
      setServiceName(service.name);
      setServiceDescription(service.description || '');
      setServiceDuration(String(service.duration_minutes));
      setServicePrice(String(service.price));
    } else {
      setEditingService(null);
      setServiceName('');
      setServiceDescription('');
      setServiceDuration('30');
      setServicePrice('');
    }
    setShowServiceDialog(true);
  };

  // Password validation regex
  const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

  const saveBarber = async () => {
    if (!barberName.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }

    // Validate credentials if provided
    if (barberUsername || barberPassword) {
      if (!barberUsername || !barberPassword) {
        toast({ title: 'Erro', description: 'Para criar credenciais, preencha usuário e senha.', variant: 'destructive' });
        return;
      }
      if (barberUsername.length < 3) {
        toast({ title: 'Erro', description: 'Usuário deve ter no mínimo 3 caracteres.', variant: 'destructive' });
        return;
      }
      if (barberPassword.length < 12 || !passwordRegex.test(barberPassword)) {
        toast({ title: 'Erro', description: 'Senha deve ter mínimo 12 caracteres, 1 maiúscula e 1 símbolo.', variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);

    let photoUrl = editingBarber?.photo_url || null;

    // Upload da foto se houver nova
    if (barberPhoto) {
      const barberId = editingBarber?.id || crypto.randomUUID();
      const uploadedUrl = await uploadBarberPhoto(barberId);
      if (uploadedUrl) {
        photoUrl = uploadedUrl;
      }
    }

    const barberData = {
      name: barberName,
      email: barberEmail || null,
      phone: barberPhone || null,
      bio: barberBio || null,
      photo_url: photoUrl,
      commission: parseFloat(barberCommission) || 0,
    };

    let savedBarberId: string | null = null;

    if (editingBarber) {
      const { error } = await supabase
        .from('barbers')
        .update(barberData)
        .eq('id', editingBarber.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      savedBarberId = editingBarber.id;
      toast({ title: 'Sucesso', description: `${settings.professionalLabel} atualizado.` });
    } else {
      const { data, error } = await supabase
        .from('barbers')
        .insert(barberData)
        .select('id')
        .single();

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível cadastrar.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      savedBarberId = data.id;
      toast({ title: 'Sucesso', description: `${settings.professionalLabel} cadastrado.` });
    }

    // Set credentials if provided
    if (barberUsername && barberPassword && savedBarberId) {
      const { data: credResult, error: credError } = await supabase.rpc('set_barber_password', {
        p_barber_id: savedBarberId,
        p_username: barberUsername,
        p_password: barberPassword
      });

      if (credError) {
        toast({ title: 'Aviso', description: `${settings.professionalLabel} salvo, mas erro ao definir credenciais.`, variant: 'destructive' });
      } else {
        toast({ title: 'Credenciais definidas', description: `Usuário: ${barberUsername}` });
      }
    }

    setSubmitting(false);
    setShowBarberDialog(false);
    setBarberPhoto(null);
    setBarberPhotoPreview(null);
    setBarberUsername('');
    setBarberPassword('');
    fetchBarbers();
  };

  const saveService = async () => {
    if(submitting||preparingServicePhoto)return;
    if(!serviceName.trim() || !servicePrice || !Number.isFinite(Number(servicePrice)) || Number(servicePrice)<0){toast({title:'Confira os dados',description:'Informe nome e preço válido.',variant:'destructive'});return;}
    setSubmitting(true);
    const id=editingService?.id||crypto.randomUUID();
    const data={name:serviceName.trim(),description:serviceDescription||null,duration_minutes:parseInt(serviceDuration),price:Number(servicePrice)};
    try{
      const {error}=editingService?await supabase.from('services').update(data).eq('id',id):await supabase.from('services').insert({...data,id});
      if(error)throw error;
      if(servicePhoto){
        try{await uploadCollectionPhoto(settings.storeAccountId||'','services',id,servicePhoto);setPhotoVersion(Date.now());}
        catch(error){toast({title:'Serviço salvo; foto não enviada',description:error instanceof Error?error.message:'Abra Editar para tentar novamente.',variant:'destructive'});setEditingService({...data,id,is_active:editingService?.is_active??true});return;}
      }
      toast({title:editingService?'Serviço atualizado':'Serviço cadastrado'});setShowServiceDialog(false);setServicePhoto(null);
    }catch(error){toast({title:'Não foi possível salvar',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}
    finally{setSubmitting(false);void fetchServices();}
  };

  const toggleBarberActive = async (barber: Barber) => {
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: !barber.is_active })
      .eq('id', barber.id);

    if (!error) {
      toast({ title: 'Atualizado', description: `${settings.professionalLabel} ${barber.is_active ? 'desativado' : 'ativado'}.` });
      fetchBarbers();
    }
  };

  const toggleServiceActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (!error) {
      toast({ title: 'Atualizado', description: `${settings.serviceLabel} ${service.is_active ? 'desativado' : 'ativado'}.` });
      fetchServices();
    }
  };

  const deleteBarber = async (barber: Barber) => {
    setPendingDeletion({ kind: 'barber', item: barber });
  };

  const deleteService = async (service: Service) => {
    setPendingDeletion({ kind: 'service', item: service });
  };

  const deleteProduct = async (product: Product) => {
    setPendingDeletion({ kind: 'product', item: product });
  };

  const confirmDeletion = async () => {
    if (!pendingDeletion) return;

    setDeleteSubmitting(true);

    if (pendingDeletion.kind === 'barber') {
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', pendingDeletion.item.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir. Verifique se não há agendamentos vinculados.', variant: 'destructive' });
      } else {
        toast({ title: 'Excluído', description: `${settings.professionalLabel} excluído com sucesso.` });
        fetchBarbers();
      }
    } else if (pendingDeletion.kind === 'service') {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', pendingDeletion.item.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir. Verifique se não há agendamentos vinculados.', variant: 'destructive' });
      } else {
        toast({ title: 'Excluído', description: `${settings.serviceLabel} excluído com sucesso.` });
        fetchServices();
      }
    } else {
      const { error } = await supabase
        .from('agenda_products')
        .delete()
        .eq('id', pendingDeletion.item.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
      } else {
        toast({ title: 'Excluído', description: 'Produto excluído com sucesso.' });
        fetchProducts();
      }
    }

    setPendingDeletion(null);
    setDeleteSubmitting(false);
  };

  // Product handlers
  const handleProductPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProductPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProductPhoto = async (productId: string): Promise<string | null> => {
    if (!productPhoto) return null;

    const fileExt = productPhoto.name.split('.').pop();
    const fileName = `${settings.storeAccountId}/${productId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, productPhoto);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const saveProduct = async () => {
    if (!productName.trim() || !productPrice) {
      toast({ title: 'Erro', description: 'Nome e preço são obrigatórios.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    let imageUrl = editingProduct?.image_url || null;

    if (productPhoto) {
      const productId = editingProduct?.id || crypto.randomUUID();
      const uploadedUrl = await uploadProductPhoto(productId);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    const productData = {
      owner_user_id: settings.ownerUserId,
      store_account_id: settings.storeAccountId,
      name: productName,
      description: productDescription || null,
      price: parseFloat(productPrice),
      stock_quantity: parseInt(productStock) || 0,
      category: productCategory || "",
      image_url: imageUrl,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('agenda_products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Produto atualizado.' });
      }
    } else {
      const { error } = await supabase
        .from('agenda_products')
        .insert(productData);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível cadastrar.', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Produto cadastrado.' });
      }
    }

    setSubmitting(false);
    setShowProductDialog(false);
    setProductPhoto(null);
    setProductPhotoPreview(null);
    fetchProducts();
  };

  const toggleProductActive = async (product: Product) => {
    const { error } = await supabase
      .from('agenda_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);

    if (!error) {
      toast({ title: 'Atualizado', description: `Produto ${product.is_active ? 'desativado' : 'ativado'}.` });
      fetchProducts();
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const chartConfig = {
    agendamentos: { label: 'Agendamentos', color: 'hsl(220, 60%, 35%)' },
    faturamento: { label: 'Faturamento', color: 'hsl(38, 80%, 55%)' },
  };

  return (
    <Layout>
      <div className="owner-dashboard container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold">{ownerGroups.flatMap(group => group.items).find(item => item.tab === activeTab)?.label || "Visão geral"}</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie {settings.displayName}
              </p>
            </div>
          </div>

          <Tabs className="owner-tabs" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="owner-legacy-tabs" aria-label="Áreas administrativas">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3">Visão Geral</TabsTrigger>
              <TabsTrigger value="queue" className="text-xs sm:text-sm px-2 sm:px-3">Fila</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs sm:text-sm px-2 sm:px-3">Agendamentos</TabsTrigger>
              <TabsTrigger value="commissions" className="text-xs sm:text-sm px-2 sm:px-3">Comissões</TabsTrigger>
              <TabsTrigger value="barbers" className="text-xs sm:text-sm px-2 sm:px-3">{settings.professionalLabel}</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm px-2 sm:px-3">{settings.serviceLabel}</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm px-2 sm:px-3">Produtos</TabsTrigger>
              <TabsTrigger value="product-sales" className="text-xs sm:text-sm px-2 sm:px-3">Vendas</TabsTrigger>
              <TabsTrigger value="clients" className="text-xs sm:text-sm px-2 sm:px-3">Clientes</TabsTrigger>
              <TabsTrigger value="loyalty" className="text-xs sm:text-sm px-2 sm:px-3">Fidelidade</TabsTrigger>
              <TabsTrigger value="locations" className="text-xs sm:text-sm px-2 sm:px-3">Localizações</TabsTrigger>
              <TabsTrigger value="hours" className="text-xs sm:text-sm px-2 sm:px-3">Horários</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs sm:text-sm px-2 sm:px-3">Identidade</TabsTrigger>
              <TabsTrigger value="public-page" className="text-xs sm:text-sm px-2 sm:px-3">Agendamento e contato</TabsTrigger>
            </TabsList>

            {/* Queue Tab */}
            <TabsContent value="queue">
              <AppointmentQueueTab
                appointments={appointments}
                onConfirmPayment={confirmAppointmentPayment}
              />
            </TabsContent>

            {/* Product Sales Tab */}
            <TabsContent value="product-sales">
              <ProductSalesTab products={products} />
            </TabsContent>

            <TabsContent value="branding">
              <BrandingTab />
            </TabsContent>

            <TabsContent value="public-page">
              <PublicPageSettingsTab />
            </TabsContent>

            <TabsContent value="overview">
              {overviewSection==='operation'?<div className="overview-status-summary"><div><small>Hoje</small><strong>{todayAppointments.length}</strong></div><div><small>Pendentes</small><strong>{appointments.filter(a=>a.status==='scheduled').length}</strong></div><div><small>Pix a conferir</small><strong>{pendingPixAppointments.length}</strong></div></div>:<div>
              {/* Stats Cards */}
              <div className="owner-kpis">
                <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Hoje</p>
                        <p className="text-3xl font-bold text-accent">{todayAppointments.length}</p>
                        <p className="text-xs text-muted-foreground">agendamentos</p>
                      </div>
                      <div className="p-3 bg-accent/10 rounded-full">
                        <Calendar className="w-6 h-6 text-accent" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Esta Semana</p>
                        <p className="text-2xl font-bold">{weeklyAppointments.length}</p>
                        <p className="text-xs text-muted-foreground">R$ {weeklyRevenue.toFixed(0)}</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full">
                        <CalendarDays className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Este Mês</p>
                        <p className="text-2xl font-bold">{monthlyAppointments.length}</p>
                        <p className="text-xs text-muted-foreground">agendamentos</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                        <p className="text-2xl font-bold text-primary">R$ {monthlyRevenue.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">{monthlyCompletedAppointments.length} concluídos</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>

              </div>}
              <div className="segmented-nav" aria-label="Seção do painel"><Button variant="ghost" aria-pressed={overviewSection==='operation'} onClick={()=>setOverviewSection('operation')}>Operação</Button><Button variant="ghost" aria-pressed={overviewSection==='performance'} onClick={()=>setOverviewSection('performance')}>Desempenho</Button></div>
              {overviewSection==='operation'?<div className="operation-grid">
              {/* Today's Appointments */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="font-serif text-base sm:text-lg">Agendamentos de Hoje</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  {todayAppointments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6 text-sm">
                      Nenhum agendamento para hoje.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...todayAppointments].sort((a,b)=>a.appointment_time.localeCompare(b.appointment_time)).slice(0,5).map(apt=><details key={apt.id} className="appointment-summary">
                        <summary><time className="appointment-time">{apt.appointment_time.slice(0,5)}</time><span className="min-w-0 flex-1"><strong className="block truncate">{apt.client_name}</strong><small className="block truncate text-muted-foreground">{apt.service?.name} · {apt.barber?.name}</small></span><span className="text-right"><span className={`status-pill status-${apt.status}`}>{apt.status==='scheduled'?'Pendente':apt.status==='completed'?'Concluído':'Cancelado'}</span><small className="block mt-1">{formatCurrency(getAppointmentTotalPrice(apt))}</small></span></summary>
                        <div className="appointment-expanded"><p className="text-sm text-muted-foreground">{apt.client_phone||'Telefone não informado'}</p>{apt.extraServices.map(service=><p key={service.id} className="text-sm">+ {service.name} · {formatCurrency(service.price)}</p>)}<div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={()=>updateAppointmentStatus(apt.id,'completed')}><Check className="h-4 w-4 mr-1"/>Concluir</Button><Button size="sm" variant="outline" className="text-destructive" onClick={()=>updateAppointmentStatus(apt.id,'cancelled')}><X className="h-4 w-4 mr-1"/>Cancelar</Button></div></div>
                      </details>)}
                    </div>
                  )}
                  <Button variant="ghost" className="w-full mt-2 text-primary" onClick={()=>setActiveTab('appointments')}>Ver todos os agendamentos <ArrowRight className="h-4 w-4 ml-2"/></Button>
                </CardContent>
              </Card>
                <div className="grid lg:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2 p-3 sm:p-4">
                      <CardTitle className="font-serif text-sm sm:text-base">Pix para Conferir</CardTitle>
                      <CardDescription className="text-xs">Agendamentos que ainda aguardam confirmação</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                      {pendingPixAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum Pix pendente.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingPixAppointments.slice(0, 4).map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{apt.client_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(parseLocalDate(apt.appointment_date), "dd/MM", { locale: ptBR })} {apt.appointment_time.slice(0, 5)} • {formatCurrency(getAppointmentTotalPrice(apt))}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => confirmAppointmentPayment(apt.id)}>
                                Confirmar
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 p-3 sm:p-4">
                      <CardTitle className="font-serif text-sm sm:text-base">Estoque Baixo</CardTitle>
                      <CardDescription className="text-xs">Produtos que merecem reposição</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                      {lowStockAgendaProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum produto crítico.</p>
                      ) : (
                        <div className="space-y-2">
                          {lowStockAgendaProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate">{product.name}</span>
                              <span className="shrink-0 font-medium text-destructive">Estoque {product.stock_quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 p-3 sm:p-4">
                      <CardTitle className="font-serif text-sm sm:text-base">Próximos Horários</CardTitle>
                      <CardDescription className="text-xs">Fila de atendimento por ordem de horário</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                      {upcomingScheduledAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem horários futuros.</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingScheduledAppointments.map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{apt.client_name}</p>
                                <p className="text-xs text-muted-foreground">{apt.service?.name}</p>
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {apt.appointment_date === todayStr ? 'Hoje' : format(parseLocalDate(apt.appointment_date), "dd/MM", { locale: ptBR })} {apt.appointment_time.slice(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </div>:<section aria-label="Desempenho do negócio">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Ticket Médio</p>
                          <p className="text-2xl font-bold">R$ {monthlyAverageTicket.toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">serviços concluídos</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <DollarSign className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Cancelamento</p>
                          <p className="text-2xl font-bold">{monthlyCancellationRate.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">{monthlyCancelledAppointments.length} no mês</p>
                        </div>
                        <div className="p-3 bg-destructive/10 rounded-full">
                          <XCircle className="w-6 h-6 text-destructive" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Pix Pendente</p>
                          <p className="text-2xl font-bold">{pendingPixAppointments.length}</p>
                          <p className="text-xs text-muted-foreground">aguardando conferência</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-full">
                          <AlertCircle className="w-6 h-6 text-amber-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                          <p className="text-2xl font-bold">{lowStockAgendaProducts.length}</p>
                          <p className="text-xs text-muted-foreground">produtos com 3 ou menos</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts - Responsivo */}
                <div className="grid lg:grid-cols-2 gap-4 mb-6">
                {/* Weekly Chart */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <CardTitle className="font-serif text-sm sm:text-base">Últimos 7 Dias</CardTitle>
                    <CardDescription className="text-xs">Valor dos serviços agendados, incluindo os pendentes</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    <OperationalAreaChart data={getLast7DaysData()} />
                  </CardContent>
                </Card>

                {/* Service Distribution */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <CardTitle className="font-serif text-sm sm:text-base">{settings.serviceLabel} Mais Solicitados</CardTitle>
                    <CardDescription className="text-xs">Distribuição neste mês</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    {getServiceDistribution().length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">Nenhum dado ainda.</p>
                    ) : (
                      <OperationalPieChart data={getServiceDistribution()} />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Barber Performance */}
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="font-serif text-sm sm:text-base">Desempenho de {settings.professionalLabel}</CardTitle>
                  <CardDescription className="text-xs">Agendamentos por {settings.professionalLabel.toLowerCase()} neste mês</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <OperationalBarChart data={getBarberPerformance()} horizontal />
                </CardContent>
              </Card>

              </section>}
            </TabsContent>

            <TabsContent value="appointments">
              {/* Status Summary Cards */}
              <div className="compact-status-grid grid grid-cols-3 gap-2 mb-4">
                <Card className="cursor-pointer hover:ring-2 ring-accent transition-all" role="button" tabIndex={0} aria-pressed={filterStatus==='scheduled'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setFilterStatus('scheduled');}}} onClick={() => setFilterStatus('scheduled')}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-full">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'scheduled').length}</p>
                        <p className="text-sm text-muted-foreground">Agendados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 ring-emerald-500 transition-all" role="button" tabIndex={0} aria-pressed={filterStatus==='completed'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setFilterStatus('completed');}}} onClick={() => setFilterStatus('completed')}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <CheckCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{appointments.filter(a => a.status === 'completed').length}</p>
                        <p className="text-sm text-muted-foreground">Concluídos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 ring-destructive transition-all" role="button" tabIndex={0} aria-pressed={filterStatus==='cancelled'} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setFilterStatus('cancelled');}}} onClick={() => setFilterStatus('cancelled')}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-full">
                        <XCircle className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{appointments.filter(a => a.status === 'cancelled').length}</p>
                        <p className="text-sm text-muted-foreground">Cancelados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    {filterStatus === 'scheduled' ? 'Agendamentos Abertos' :
                     filterStatus === 'completed' ? 'Agendamentos Concluídos' :
                     filterStatus === 'cancelled' ? 'Agendamentos Cancelados' : 'Todos os Agendamentos'}
                  </CardTitle>
                  <CardDescription>
                    {filteredAppointments.length} agendamentos encontrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <details className="advanced-filters"><summary>Filtrar agendamentos</summary>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={filterBarber} onValueChange={setFilterBarber}>
                      <SelectTrigger>
                        <SelectValue placeholder={settings.professionalLabel} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        {barbers.filter(b => b.is_active).map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger>
                        <SelectValue placeholder={settings.serviceLabel} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        {services.filter(s => s.is_active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterBarber('all');
                        setFilterService('all');
                        setFilterStatus('all');
                        setSearchTerm('');
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>

                  </details>
                  {/* Appointments - Mobile (sem rolagem lateral) */}
                  <div className="sm:hidden space-y-3">
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum agendamento encontrado.
                      </div>
                    ) : (
                      filteredAppointments.slice(0,listLimit).map((apt) => {
                        const totalPrice = getAppointmentTotalPrice(apt);
                        const totalDuration = getAppointmentTotalDuration(apt);
                        return (
                          <details key={apt.id} className="appointment-summary"><summary><time className="appointment-time">{format(parseLocalDate(apt.appointment_date),'dd/MM')}<strong className="block mt-1">{apt.appointment_time.slice(0,5)}</strong></time><span className="min-w-0 flex-1"><strong className="block truncate">{apt.client_name}</strong><small className="block truncate text-muted-foreground">{apt.service?.name}</small></span><span className="text-right"><StatusBadge status={apt.status}/><small className="block text-primary mt-1">Gerenciar</small></span></summary><div className={cn(

                            "p-4 rounded-lg border bg-secondary/30",
                            apt.status === 'cancelled' && "opacity-60"
                          )}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {format(parseLocalDate(apt.appointment_date), "dd/MM/yyyy")} • {apt.appointment_time.slice(0, 5)}
                                </p>
                                <p className="text-sm mt-1 truncate"><span className="font-medium">{apt.client_name}</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {apt.barber?.name}
                                </p>
                                <div className="mt-2">
                                  <p className="text-sm">{apt.service?.name} <span className="text-muted-foreground">({formatCurrency(apt.service?.price)})</span></p>
                                  {apt.extraServices.length > 0 && apt.extraServices.map(s => (
                                    <p key={s.id} className="text-xs text-primary">
                                      + {s.name} ({formatCurrency(s.price)})
                                    </p>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="text-right">
                                  <p className="text-sm font-semibold">{formatCurrency(totalPrice)}</p>
                                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                    <Clock className="w-3 h-3" /> {totalDuration} min
                                  </p>
                                  {apt.extraServices.length > 0 && (
                                    <p className="text-xs text-primary">{apt.extraServices.length + 1} serviços</p>
                                  )}
                                </div>
                                <StatusBadge status={apt.status} />
                                {apt.status === 'scheduled' && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                      className="text-primary"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                      className="text-destructive"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                                {apt.status === 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(publicBookingPath)}
                                    className="gap-1"
                                  >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Encaixe
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div></details>
                        );
                      })
                    )}
                  </div>

                  {/* Appointments - Desktop */}
                  <div className="hidden sm:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Data/Hora</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                          <TableHead>{settings.serviceLabel}</TableHead>
                          <TableHead>{settings.professionalLabel}</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right w-[120px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Nenhum agendamento encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAppointments.slice(0,listLimit).map((apt) => {
                            const totalPrice = getAppointmentTotalPrice(apt);
                            const totalDuration = getAppointmentTotalDuration(apt);
                            return (
                              <TableRow key={apt.id} className={apt.status === 'cancelled' ? 'opacity-60' : ''}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-xs sm:text-sm">{format(parseLocalDate(apt.appointment_date), "dd/MM/yyyy")}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">{apt.appointment_time.slice(0, 5)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-xs sm:text-sm">{apt.client_name}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {apt.client_phone ? (
                                    <span className="flex items-center gap-1 text-xs">
                                      <Phone className="w-3 h-3" />
                                      {apt.client_phone}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-xs sm:text-sm">{apt.service?.name} <span className="text-muted-foreground">({formatCurrency(apt.service?.price)})</span></p>
                                    {apt.extraServices.length > 0 && apt.extraServices.map(s => (
                                      <p key={s.id} className="text-xs text-primary">
                                        + {s.name} ({formatCurrency(s.price)})
                                      </p>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{apt.barber?.name}</TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-medium text-xs sm:text-sm">{formatCurrency(totalPrice)}</span>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {totalDuration} min
                                    </p>
                                    {apt.extraServices.length > 0 && (
                                      <p className="text-xs text-primary">{apt.extraServices.length + 1} serviços</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={apt.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  {apt.status === 'scheduled' && (
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                        title="Marcar como concluído"
                                      >
                                        <Check className="w-4 h-4 text-primary" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                        title="Cancelar agendamento"
                                      >
                                        <X className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                  {apt.status === 'cancelled' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => navigate(publicBookingPath)}
                                      title="Criar encaixe neste horario liberado"
                                    >
                                      <CalendarDays className="w-4 h-4 text-primary" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Monthly Summary */}
                  <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
                    <h3 className="font-semibold mb-3">Resumo do Mês ({format(today, 'MMMM yyyy', { locale: ptBR })})</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                        <p className="text-xl font-bold">{monthlyAppointments.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Concluídos</p>
                        <p className="text-xl font-bold text-primary">
                          {appointments.filter(a => {
                            const date = new Date(a.appointment_date);
                            return isWithinInterval(date, { start: monthStart, end: monthEnd }) && a.status === 'completed';
                          }).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Faturamento Estimado</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(monthlyRevenue)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Comissões */}
            <TabsContent value="commissions">
              <div className="space-y-6">
                {/* Resumo Geral */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total a Pagar</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(getBarberCommissions().reduce((sum, c) => sum + c.totalCommission, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">neste mês</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <DollarSign className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{settings.serviceLabel} Concluídos</p>
                          <p className="text-2xl font-bold">
                            {getBarberCommissions().reduce((sum, c) => sum + c.totalServices, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">no mês</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Scissors className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Faturamento Bruto</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(getBarberCommissions().reduce((sum, c) => sum + c.totalRevenue, 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">concluídos</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de Comissões por profissional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif">Comissões por {settings.professionalLabel}</CardTitle>
                    <CardDescription>
                      {format(today, "MMMM 'de' yyyy", { locale: ptBR })} - Baseado em {settings.serviceLabel.toLowerCase()} concluídos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getBarberCommissions().length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum {settings.serviceLabel.toLowerCase()} concluído neste mês.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {getBarberCommissions().map(({ barber, totalServices, totalCommission, totalRevenue }) => (
                          <div
                            key={barber.id}
                            className="p-4 rounded-lg bg-secondary/50 border border-border"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                {barber.photo_url ? (
                                  <img
                                    src={barber.photo_url}
                                    alt={barber.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-primary shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Scissors className="w-6 h-6 text-primary" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{barber.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Comissão: {formatCurrency(barber.commission)}/{settings.serviceLabel.toLowerCase()}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(totalCommission)}
                                </p>
                                <p className="text-xs text-muted-foreground">a pagar</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                              <div className="text-center">
                                <p className="text-lg font-semibold">{totalServices}</p>
                                <p className="text-xs text-muted-foreground">serviços</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-semibold">{formatCurrency(totalRevenue)}</p>
                                <p className="text-xs text-muted-foreground">faturou</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-semibold text-primary">
                                  {((totalCommission / totalRevenue) * 100 || 0).toFixed(0)}%
                                </p>
                                <p className="text-xs text-muted-foreground">comissão</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="barbers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-serif">{settings.professionalLabel}</CardTitle>
                    <CardDescription>Gerencie a equipe</CardDescription>
                  </div>
                  <Button onClick={() => openBarberDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo {settings.professionalLabel}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {barbers.slice(0,listLimit).map(barber=><div key={barber.id} className={cn('collection-row',!barber.is_active&&'opacity-60')}>
                      {barber.photo_url?<img className="collection-photo object-cover" src={barber.photo_url} alt={barber.name}/>:<span className="collection-photo"><Users/></span>}<span className="min-w-0 flex-1"><strong className="block truncate font-medium text-sm">{barber.name}</strong><small className="block text-xs text-muted-foreground mt-1">Comissão: R$ {barber.commission?.toFixed(2)||'0,00'}</small>{!barber.is_active&&<small className="text-xs text-destructive">Inativo</small>}</span>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Gerenciar ${barber.name}`}><ChevronRight className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>openBarberDialog(barber)}><Edit className="h-4 w-4 mr-2"/>Editar dados e foto</DropdownMenuItem><DropdownMenuItem onSelect={()=>toggleBarberActive(barber)}>{barber.is_active?'Desativar':'Ativar'}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={()=>deleteBarber(barber)}><Trash2 className="h-4 w-4 mr-2"/>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </div>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
                  <div>
                    <CardTitle className="font-serif text-base sm:text-lg">{settings.serviceLabel}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Gerencie as opções oferecidas</CardDescription>
                  </div>
                  <Button onClick={() => openServiceDialog()} size="sm" className="text-xs sm:text-sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Novo {settings.serviceLabel}</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-3">
                    {services.slice(0,listLimit).map(service=><div key={service.id} className={cn('collection-row',!service.is_active&&'opacity-60')}>
                      <CollectionPhoto store={settings.storeAccountId||''} kind="services" id={service.id} name={service.name} version={String(photoVersion)}/><span className="min-w-0 flex-1"><strong className="block truncate font-medium text-sm">{service.name}</strong><small className="block text-xs text-muted-foreground mt-1">{service.duration_minutes} min · {formatCurrency(service.price)}</small>{!service.is_active&&<small className="text-xs text-destructive">Inativo</small>}</span>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Gerenciar ${service.name}`}><ChevronRight className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>openServiceDialog(service)}><Edit className="h-4 w-4 mr-2"/>Editar dados e foto</DropdownMenuItem><DropdownMenuItem onSelect={()=>toggleServiceActive(service)}>{service.is_active?'Desativar':'Ativar'}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={()=>deleteService(service)}><Trash2 className="h-4 w-4 mr-2"/>Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </div>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-serif">Produtos</CardTitle>
                    <CardDescription>Gerencie os produtos da loja</CardDescription>
                  </div>
                  <Button onClick={() => openProductDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Button>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</p>
                  ) : (
                    <div className="admin-product-list grid gap-3 lg:grid-cols-2">
                      {products.slice(0,listLimit).map((product) => (
                        <div
                          key={product.id}
                          className={`p-4 rounded-lg border ${
                            product.is_active ? 'bg-secondary/30 border-border' : 'bg-muted/30 border-border opacity-60'
                          }`}
                        >
                          <div className="aspect-square rounded-lg bg-secondary mb-3 overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="mb-3">
                            <p className="font-medium">{product.name}</p>
                            {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                              <span className="text-sm text-muted-foreground">Estoque: {product.stock_quantity}</span>
                            </div>
                            {!product.is_active && <span className="text-xs text-destructive">Inativo</span>}
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openProductDialog(product)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleProductActive(product)}
                              title={product.is_active ? 'Desativar' : 'Ativar'}
                            >
                              {product.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteProduct(product)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients">
              <ClientsTab />
            </TabsContent>

            {/* Loyalty Tab */}
            <TabsContent value="loyalty">
              <LoyaltyTab isAdmin={true} />
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations">
              <LocationsTab isAdmin={true} />
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="hours">
              <BusinessHoursTab isAdmin={true} />
            </TabsContent>
            <ListMore total={activeTab==='appointments'?filteredAppointments.length:activeTab==='barbers'?barbers.length:activeTab==='services'?services.length:activeTab==='products'?products.length:0} shown={listLimit} onMore={()=>setListLimit(n=>n+10)} />
          </Tabs>
        </motion.div>
      </div>

      {/* Barber Dialog with Photo Upload - Mobile Optimized */}
      <Dialog open={showBarberDialog} onOpenChange={setShowBarberDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {editingBarber ? `Editar ${settings.professionalLabel}` : `Novo ${settings.professionalLabel}`}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Preencha os dados de {settings.professionalLabel.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveBarber();
            }}
          >
            {/* Photo Upload - Compact */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border shrink-0">
                {barberPhotoPreview ? (
                  <img src={barberPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                {barberPhotoPreview ? 'Trocar' : 'Foto'}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Nome *</Label>
              <Input value={barberName} onChange={(e) => setBarberName(e.target.value)} placeholder={`Nome do ${settings.professionalLabel.toLowerCase()}`} className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input value={barberEmail} onChange={(e) => setBarberEmail(e.target.value)} placeholder="email@exemplo.com" type="email" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Telefone</Label>
                <Input value={barberPhone} onChange={(e) => setBarberPhone(e.target.value)} placeholder="(00) 00000-0000" className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Bio</Label>
              <Textarea value={barberBio} onChange={(e) => setBarberBio(e.target.value)} placeholder={`Descrição do ${settings.professionalLabel.toLowerCase()}`} rows={2} className="text-sm resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Comissão por {settings.serviceLabel} (R$)</Label>
              <Input
                value={barberCommission}
                onChange={(e) => setBarberCommission(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                className="h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Credentials Section */}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Credenciais de Acesso</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {editingBarber ? 'Preencha para redefinir as credenciais (deixe em branco para manter)' : `Defina login para o ${settings.professionalLabel.toLowerCase()} acessar seu painel`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Usuário</Label>
                  <Input
                    value={barberUsername}
                    onChange={(e) => setBarberUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="usuario"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{editingBarber ? 'Nova Senha' : 'Senha'}</Label>
                  <Input
                    value={barberPassword}
                    onChange={(e) => setBarberPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mín. 8 caracteres, 1 maiúscula, 1 símbolo (!@#$%^&*...)
              </p>
              {editingBarber && (
                <p className="text-xs text-amber-600 mt-1">
                  💡 Esqueceu a senha? Preencha uma nova senha acima para redefinir.
                </p>
              )}
            </div>
            <DialogFooter className="flex-row gap-2 sm:justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBarberDialog(false)} size="sm" className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="flex-1 sm:flex-none">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingService ? `Editar ${settings.serviceLabel}` : `Novo ${settings.serviceLabel}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados de {settings.serviceLabel.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">{servicePhoto?<img src={servicePhoto} alt="Prévia do serviço" className="h-14 w-14 rounded-lg object-cover"/>:editingService?<CollectionPhoto store={settings.storeAccountId||''} kind="services" id={editingService.id} name={editingService.name} version={String(photoVersion)}/>:null}<div><Label htmlFor="service-photo" className="inline-flex items-center min-h-11 cursor-pointer text-primary underline">{preparingServicePhoto?'Preparando…':'Escolher foto do serviço'}</Label><Input id="service-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={submitting||preparingServicePhoto} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setPreparingServicePhoto(true);try{setServicePhoto(await prepareProfileImage(file,320));}catch(error){toast({title:'Confira a foto',description:error instanceof Error?error.message:'Imagem inválida.',variant:'destructive'});}finally{setPreparingServicePhoto(false);}}}/></div></div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder={`Nome do ${settings.serviceLabel.toLowerCase()}`} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} placeholder={`Descrição do ${settings.serviceLabel.toLowerCase()}`} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (minutos) *</Label>
                <Select value={serviceDuration} onValueChange={setServiceDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDialog(false)}>Cancelar</Button>
            <Button onClick={saveService} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog - Mobile Optimized */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Preencha os dados do produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Photo Upload - Compact */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border shrink-0">
                {productPhotoPreview ? (
                  <img src={productPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={productFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProductPhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => productFileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                {productPhotoPreview ? 'Trocar' : 'Foto'}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Nome *</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nome do produto" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Descrição</Label>
              <Textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Descrição do produto" rows={2} className="text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Preço (R$) *</Label>
                <Input
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Estoque</Label>
                <Input
                  value={productStock}
                  onChange={(e) => setProductStock(e.target.value)}
                  placeholder="0"
                  type="number"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Categoria</Label>
              <Input value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="Ex: Gel, Tintas" className="h-9" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end pt-2">
            <Button variant="outline" onClick={() => setShowProductDialog(false)} size="sm" className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={saveProduct} disabled={submitting} size="sm" className="flex-1 sm:flex-none">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeletion}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) {
            setPendingDeletion(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeletion?.kind === 'barber'
                ? `Excluir ${settings.professionalLabel.toLowerCase()}?`
                : pendingDeletion?.kind === 'service'
                  ? `Excluir ${settings.serviceLabel.toLowerCase()}?`
                  : 'Excluir produto?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeletion?.kind === 'barber'
                ? `Tem certeza que deseja excluir ${settings.professionalLabel.toLowerCase()} "${pendingDeletion.item.name}"? Esta ação não pode ser desfeita.`
                : pendingDeletion?.kind === 'service'
                  ? `Tem certeza que deseja excluir ${settings.serviceLabel.toLowerCase()} "${pendingDeletion.item.name}"? Esta ação não pode ser desfeita.`
                  : pendingDeletion
                    ? `Tem certeza que deseja excluir o produto "${pendingDeletion.item.name}"? Esta ação não pode ser desfeita.`
                    : 'Confirme a exclusão.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeletion()} disabled={deleteSubmitting}>
              {deleteSubmitting ? 'Excluindo...' : 'Confirmar exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
