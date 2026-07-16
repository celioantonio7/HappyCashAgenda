import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Permite controlar quais origens podem chamar esta função (evita CORS aberto)
const defaultOrigin = Deno.env.get("DEFAULT_ORIGIN") ?? "http://localhost:5173";
const allowedOrigins = new Set([
  defaultOrigin,
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
]);

function getRequestOrigin(req: Request): string {
  return req.headers.get("origin") ?? defaultOrigin;
}

function isOriginAllowed(origin: string) {
  return allowedOrigins.has(origin);
}

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Basic rate limiting (per IP) to reduce risk of accidental spikes / low-volume DDoS
const rateLimitWindowMs = Number(
  Deno.env.get("RATE_LIMIT_WINDOW_MS") ?? "60000",
);
const rateLimitMaxRequests = Number(Deno.env.get("RATE_LIMIT_MAX") ?? "30");
const rateLimitStore = new Map<string, { count: number; expires: number }>();

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function enforceRateLimit(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.expires < now) {
    rateLimitStore.set(ip, { count: 1, expires: now + rateLimitWindowMs });
    return true;
  }
  entry.count += 1;
  if (entry.count > rateLimitMaxRequests) {
    return false;
  }
  return true;
}

interface NotificationRequest {
  appointmentId: string;
}

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string | null;
  barber: {
    name: string;
    phone: string | null;
  };
  service: {
    name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  const origin = getRequestOrigin(req);
  if (!isOriginAllowed(origin)) {
    return new Response("Origin not allowed", {
      status: 403,
      headers: getCorsHeaders(origin),
    });
  }

  // Basic rate limiting (per IP) to reduce risk of spikes / low-volume DDoS
  if (!enforceRateLimit(req)) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        ...getCorsHeaders(origin),
        "Retry-After": String(Math.ceil(rateLimitWindowMs / 1000)),
      },
    });
  }

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { appointmentId }: NotificationRequest = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: "appointmentId is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        },
      );
    }

    // Busca detalhes do agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        appointment_time,
        client_name,
        client_phone,
        barber:barbers(name, phone),
        service:services(name)
      `,
      )
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("Error fetching appointment:", appointmentError);
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      });
    }

    const details = appointment as unknown as AppointmentDetails;

    // Formata a data
    const [year, month, day] = details.appointment_date.split("-");
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = details.appointment_time.slice(0, 5);

    // Mensagem para o barbeiro
    const barberMessage = `🔔 *Novo Agendamento!*

👤 Cliente: ${details.client_name}
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
✂️ Serviço: ${details.service?.name || "N/A"}
📞 Telefone do cliente: ${details.client_phone || "Não informado"}

_Mensagem automática - BarberPro_`;

    // Mensagem para o cliente
    const clientMessage = `✅ *Agendamento Confirmado!*

Olá ${details.client_name}! 👋

Seu agendamento foi confirmado:

✂️ Barbeiro: ${details.barber?.name || "N/A"}
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
💈 Serviço: ${details.service?.name || "N/A"}

Te esperamos! 🙌

_BarberPro - A melhor experiência em barbearia_`;

    // TODO: Integrar com API do WhatsApp (Evolution API, Twilio, etc.)
    // Abaixo está um exemplo de como seria a integração:

    // const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
    // const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");

    // if (WHATSAPP_API_URL && WHATSAPP_API_KEY) {
    //   // Enviar para o barbeiro
    //   if (details.barber?.phone) {
    //     await fetch(`${WHATSAPP_API_URL}/message/sendText`, {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //         "apikey": WHATSAPP_API_KEY,
    //       },
    //       body: JSON.stringify({
    //         number: details.barber.phone,
    //         text: barberMessage,
    //       }),
    //     });
    //   }
    //
    //   // Enviar para o cliente
    //   if (details.client_phone) {
    //     await fetch(`${WHATSAPP_API_URL}/message/sendText`, {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //         "apikey": WHATSAPP_API_KEY,
    //       },
    //       body: JSON.stringify({
    //         number: details.client_phone,
    //         text: clientMessage,
    //       }),
    //     });
    //   }
    // }

    // Log only non-sensitive summary information for debugging
    console.log(
      "WhatsApp notification prepared for appointment:",
      appointmentId,
    );
    console.log("Recipients: barber, client");
    console.log("Status: messages ready for delivery");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification prepared (API not configured yet)",
        details: {
          barberPhone: details.barber?.phone,
          clientPhone: details.client_phone,
          barberMessage,
          clientMessage,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp-notification:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    });
  }
};

serve(handler);
