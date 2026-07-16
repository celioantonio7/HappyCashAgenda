/**
 * ==============================================================
 * EDGE FUNCTION: create-payment
 * ==============================================================
 *
 * PROPÓSITO:
 * Esta função cria uma sessão de checkout do Stripe para pagamentos online.
 * Permite que clientes paguem seus serviços de barbearia via cartão de crédito.
 *
 * CONFIGURAÇÃO NECESSÁRIA:
 * - STRIPE_SECRET_KEY: Chave secreta da sua conta Stripe
 *   (Obter em: https://dashboard.stripe.com/apikeys)
 *
 * FLUXO:
 * 1. Recebe os dados do agendamento (serviço, preço, etc.)
 * 2. Cria ou recupera o cliente no Stripe
 * 3. Cria uma sessão de checkout
 * 4. Retorna a URL para redirecionamento
 *
 * USO:
 * POST /create-payment
 * Body: { serviceName, price, appointmentId }
 *
 * ==============================================================
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

// Interface para tipagem dos dados da requisição
interface PaymentRequest {
  serviceName: string;
  price: number;
  appointmentId?: string;
  paymentMethod: "online" | "in_person";
}

serve(async (req) => {
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

  // Tratamento de requisições CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    console.log("[CREATE-PAYMENT] Iniciando processamento de pagamento...");

    // Inicializa cliente Supabase para autenticação
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Verifica autenticação do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Autenticação necessária");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("Usuário não autenticado");
    }

    console.log(`[CREATE-PAYMENT] Usuário autenticado: ${user.email}`);

    // Parse do body da requisição
    const { serviceName, price, appointmentId, paymentMethod }: PaymentRequest =
      await req.json();

    // Se o pagamento é presencial, apenas registra e retorna sucesso
    if (paymentMethod === "in_person") {
      console.log("[CREATE-PAYMENT] Pagamento presencial selecionado");
      return new Response(
        JSON.stringify({
          success: true,
          paymentMethod: "in_person",
          message: "Pagamento será realizado presencialmente",
        }),
        {
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    // Verifica se a chave do Stripe está configurada
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.log("[CREATE-PAYMENT] STRIPE_SECRET_KEY não configurada");
      throw new Error(
        "Stripe não configurado. Configure a chave secreta do Stripe.",
      );
    }

    // Inicializa o Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    console.log("[CREATE-PAYMENT] Stripe inicializado");

    // Verifica/cria cliente no Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(
        `[CREATE-PAYMENT] Cliente existente encontrado: ${customerId}`,
      );
    } else {
      console.log("[CREATE-PAYMENT] Novo cliente será criado no checkout");
    }

    // Converte preço para centavos (Stripe usa centavos)
    const priceInCents = Math.round(price * 100);

    // Cria sessão de checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: serviceName,
              description: `Serviço de barbearia - ${serviceName}`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/my-appointments?payment=success`,
      cancel_url: `${origin}/booking?payment=cancelled`,
      metadata: {
        appointmentId: appointmentId || "",
        userId: user.id,
      },
    });

    console.log(`[CREATE-PAYMENT] Sessão de checkout criada: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar pagamento";
    console.error("[CREATE-PAYMENT] Erro:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
