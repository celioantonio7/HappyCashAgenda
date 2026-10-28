import { businessNow, businessSlots, timeMinutes } from "@/lib/businessTime";
import { isAgendaDemo, demoBusinessHours } from "@/lib/agendaDemo";
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

const EMPTY_BUSINESS_HOURS: BusinessHour[] = [];

const CLOSING_TOLERANCE_MINUTES = 0; // Serviços precisam terminar dentro do funcionamento

export function useBusinessHours(storeAccountId?: string) {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCurrentlyOpen, setIsCurrentlyOpen] = useState(false);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const requestRef = useRef(0);
  const scope = storeAccountId || '';
  const scopeReady = loadedScope === scope;
  const visibleHours = scopeReady ? businessHours : EMPTY_BUSINESS_HOURS;

  const fetchBusinessHours = useCallback(async () => {
    const request = ++requestRef.current;
    const nextScope = storeAccountId || '';
    setLoading(true);
    setLoadedScope(null);
    setBusinessHours([]);
    setIsCurrentlyOpen(false);
    if (isAgendaDemo) {
      setBusinessHours(demoBusinessHours);
      setLoadedScope(nextScope);
      setLoading(false);
      return;
    }
    if (!storeAccountId) {
      setLoadedScope(nextScope);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('store_account_id', storeAccountId)
        .order('day_of_week');
      if (request !== requestRef.current) return;
      setBusinessHours(!error && data ? data : []);
    } catch {
      if (request !== requestRef.current) return;
      setBusinessHours([]);
    } finally {
      if (request === requestRef.current) {
        setLoadedScope(nextScope);
        setLoading(false);
      }
    }
  }, [storeAccountId]);

  useEffect(() => {
    void fetchBusinessHours();
    return () => { ++requestRef.current; };
  }, [fetchBusinessHours]);

  useEffect(() => {
    const checkIfOpen = () => {
      const now = new Date();
      const business = businessNow(now);
      const dayOfWeek = new Date(`${business.date}T12:00:00`).getDay();
      const currentTime = business.time;

      const todayHours = visibleHours.find(h => h.day_of_week === dayOfWeek);
      if (todayHours && todayHours.is_open) {
        const isOpen = currentTime >= todayHours.open_time.slice(0, 5) && currentTime < todayHours.close_time.slice(0, 5);
        setIsCurrentlyOpen(isOpen);
      } else {
        setIsCurrentlyOpen(false);
      }
    };

    checkIfOpen();
    const interval = setInterval(checkIfOpen, 60000);
    return () => clearInterval(interval);
  }, [visibleHours]);

  const getHoursForDay = (dayOfWeek: number) => {
    return visibleHours.find(h => h.day_of_week === dayOfWeek);
  };

  /**
   * Verifica se um serviço com determinada duração pode ser agendado em um horário específico
   * Retorna: { canBook: boolean, reason?: string }
   */
  const canBookServiceAtTime = (
    date: Date,
    timeSlot: string,
    serviceDuration: number
  ): { canBook: boolean; reason?: string; suggestion?: string } => {
    const dayOfWeek = date.getDay();
    const hours = getHoursForDay(dayOfWeek);

    if (!hours || !hours.is_open) {
      return { canBook: false, reason: 'Estabelecimento fechado neste dia.' };
    }

    const [slotHour, slotMin] = timeSlot.split(':').map(Number);
    const [closeHour, closeMin] = hours.close_time.split(':').map(Number);

    const slotStartMinutes = slotHour * 60 + slotMin;
    const serviceEndMinutes = slotStartMinutes + serviceDuration;
    const closeMinutes = closeHour * 60 + closeMin;
    const maxAllowedEndMinutes = closeMinutes;
    if (slotStartMinutes < timeMinutes(hours.open_time)) return { canBook: false, reason: "O horário é anterior à abertura." };

    if (serviceEndMinutes > maxAllowedEndMinutes) {
      const exceedsBy = serviceEndMinutes - closeMinutes;
      return {
        canBook: false,
        reason: `O serviço de ${serviceDuration} minutos ultrapassa o horário de funcionamento em ${exceedsBy} minutos.`,
        suggestion: `Escolha outro dia ou um serviço com duração de até ${closeMinutes - slotStartMinutes + CLOSING_TOLERANCE_MINUTES} minutos.`
      };
    }

    return { canBook: true };
  };

  /**
   * Retorna os slots disponíveis para agendamento considerando:
   * - Horário de funcionamento
   * - Duração integral dentro do funcionamento
   */
  const getAvailableTimeSlots = (date: Date, serviceDuration: number = 30) => {
    const dayOfWeek = date.getDay();
    const hours = getHoursForDay(dayOfWeek);

    if (!hours || !hours.is_open) return [];

    return businessSlots(hours.open_time, hours.close_time, serviceDuration);
  };

  /**
   * Retorna TODOS os slots do horário de funcionamento, incluindo os que
   * excedem a tolerância. Útil para mostrar visualmente os slots "brancos"
   * (horários que existem mas o serviço ultrapassaria o fechamento).
   */
  const getAllBusinessSlots = (date: Date) => {
    const dayOfWeek = date.getDay();
    const hours = getHoursForDay(dayOfWeek);

    if (!hours || !hours.is_open) return [];

    return businessSlots(hours.open_time, hours.close_time);
  };

  return {
    businessHours: visibleHours,
    loading: loading || !scopeReady,
    isCurrentlyOpen: scopeReady && !loading && isCurrentlyOpen,
    getHoursForDay,
    getAvailableTimeSlots,
    getAllBusinessSlots,
    canBookServiceAtTime,
    refetch: fetchBusinessHours
  };
}
