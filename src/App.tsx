import { LoadingState } from '@/components/app/RingLoader';
import { lazy, Suspense } from "react";
import { PwaStatus } from "@/components/app/PwaStatus";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AgendaBrandingProvider } from "@/hooks/useAgendaBranding";
import { ThemeProvider } from "@/hooks/useTheme";
import { CartProvider } from "@/hooks/useCart";
import { CartDrawer } from "@/components/cart/CartDrawer";
import Seo from "@/components/Seo";
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Agendamento = lazy(() => import("./pages/Agendamento"));
const MeusAgendamentos = lazy(() => import("./pages/MeusAgendamentos"));
const Painel = lazy(() => import("./pages/Painel"));
const PainelBarbeiro = lazy(() => import("./pages/PainelBarbeiro"));
const Produtos = lazy(() => import("./pages/Produtos"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Feed = lazy(() => import("./pages/Feed"));
const Assinatura = lazy(() => import("./pages/Assinatura"));
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AgendaBrandingProvider>
            <CartProvider>
              <TooltipProvider>
                <PwaStatus />
                <Toaster />
                <Sonner />
                <CartDrawer />
                <Seo />
                <Suspense fallback={<LoadingState fullScreen label="Abrindo sua agenda…"/>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/assinatura" element={<Assinatura />} />
                  <Route path="/agendamento" element={<Agendamento />} />
                  <Route
                    path="/meus-agendamentos"
                    element={<MeusAgendamentos />}
                  />
                  <Route path="/painel" element={<Painel />} />
                  <Route path="/painel-barbeiro" element={<PainelBarbeiro />} />
                  <Route path="/painel-profissional" element={<PainelBarbeiro />} />
                  <Route path="/produtos" element={<Produtos />} />
                  <Route path="/auth" element={<Login />} />
                  <Route path="/booking" element={<Agendamento />} />
                  <Route path="/my-appointments" element={<MeusAgendamentos />} />
                  <Route path="/admin" element={<Painel />} />
                  <Route path="/barber" element={<Navigate to="/?empresa=barber" replace />} />
                  <Route path="/barber/agendamento" element={<Navigate to="/agendamento?empresa=barber" replace />} />
                  <Route path="/barber/login" element={<Navigate to="/login?empresa=barber" replace />} />
                  <Route path="/barber/meus-agendamentos" element={<Navigate to="/meus-agendamentos?empresa=barber" replace />} />
                  <Route path="/barber/produtos" element={<Navigate to="/produtos?empresa=barber" replace />} />
                  <Route path="/professional" element={<PainelBarbeiro />} />
                  <Route path="/products" element={<Produtos />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/:businessSlug" element={<Index />} />
                  <Route path="/:businessSlug/perfil" element={<Perfil />} />
                  <Route path="/:businessSlug/feed" element={<Feed />} />
                  <Route path="/:businessSlug/assinatura" element={<Assinatura />} />
                  <Route path="/:businessSlug/agendamento" element={<Agendamento />} />
                  <Route path="/:businessSlug/login" element={<Login />} />
                  <Route path="/:businessSlug/meus-agendamentos" element={<MeusAgendamentos />} />
                  <Route path="/:businessSlug/produtos" element={<Produtos />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </TooltipProvider>
            </CartProvider>
          </AgendaBrandingProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
