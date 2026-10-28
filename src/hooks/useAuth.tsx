import { removeNativePushForSession } from "@/hooks/useNativePush";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  validateAgendaAdminAccess,
} from "@/lib/agendaAuth";
import { requestTurnstileToken } from "@/shared/security/turnstile";

type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  businessSlug?: string;
};

type AgendaProfileRow = {
  owner_user_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  ownerUserId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean; isStaff: boolean }>;
  signUp: (input: SignUpInput) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizePhone = (value?: string | null) => value?.replace(/\D/g, "").slice(0, 15) ?? "";

const getProfileMetadata = (user: User) => {
  const metadata = user.user_metadata ?? {};
  return {
    fullName:
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : "",
    phone: typeof metadata.phone === "string" ? metadata.phone : "",
    avatarUrl:
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : "",
  };
};

const getAgendaProfile = async (userId: string) => {
  const { data } = await supabase
    .from("profiles")
    .select("owner_user_id, full_name, phone, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as AgendaProfileRow | null) ?? null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const syncProfileMetadata = async (
    nextUser: User,
    profile: AgendaProfileRow | null,
    options?: {
      fullName?: string;
      phone?: string;
    },
  ) => {
    const metadata = getProfileMetadata(nextUser);
    const nextFullName =
      options?.fullName?.trim() ||
      metadata.fullName.trim() ||
      profile?.full_name?.trim() ||
      nextUser.email ||
      "";
    const nextPhone = normalizePhone(options?.phone ?? metadata.phone ?? profile?.phone);
    const nextAvatarUrl = metadata.avatarUrl.trim();
    const updates: Record<string, string> = {};

    if (nextFullName && nextFullName !== (profile?.full_name ?? "")) {
      updates.full_name = nextFullName;
    }

    if (nextPhone && nextPhone !== normalizePhone(profile?.phone)) {
      updates.phone = nextPhone;
    }

    if (nextAvatarUrl && nextAvatarUrl !== (profile?.avatar_url ?? "")) {
      updates.avatar_url = nextAvatarUrl;
    }

    if (Object.keys(updates).length === 0) return;

    await supabase.from("profiles").update(updates).eq("user_id", nextUser.id);
  };

  const syncUserAccess = async (nextUser: User) => {
    const [profile, { data: roles }] = await Promise.all([
      getAgendaProfile(nextUser.id),
      supabase.from('user_roles').select('role').eq('user_id', nextUser.id),
    ]);
    const adminProfile = roles?.some(row => row.role === 'admin') ?? false;
    const staff = roles?.some(row => row.role === 'barber') ?? false;
    setIsStaff(staff);
    let owner = profile?.owner_user_id ?? nextUser.id;
    if (staff && !adminProfile) {
      const { data: professional } = await supabase.from('barbers').select('owner_user_id').eq('user_id', nextUser.id).maybeSingle();
      owner = professional?.owner_user_id ?? owner;
    }
    setOwnerUserId(owner);

    if (!adminProfile) {
      setIsAdmin(false);
      await syncProfileMetadata(nextUser, profile);
      return { isAdmin: false, isStaff: staff };
    }

    const access = await validateAgendaAdminAccess(nextUser.id);
    if (!access.ok) {
      await syncProfileMetadata(nextUser, profile);
      setIsAdmin(false);
      return { isAdmin: false, isStaff: staff };
    }

    await syncProfileMetadata(nextUser, profile);
    setIsAdmin(true);
    return { isAdmin: true, isStaff: staff };
  };

  useEffect(() => {
    const applySession = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await syncUserAccess(nextSession.user);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setOwnerUserId(null);
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setLoading(true);
      setTimeout(() => {
        void applySession(nextSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      void applySession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const captchaToken = await requestTurnstileToken("agenda-login");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
        options: { captchaToken },
      });

      if (error || !data.user) {
        setIsAdmin(false);
        return { error: error ?? new Error("Nao foi possivel entrar."), isAdmin: false, isStaff: false };
      }

      const adminProfile = await syncUserAccess(data.user);
      return { error: null, ...adminProfile };
    } catch (error) {
      setIsAdmin(false);
      return { error: error instanceof Error ? error : new Error("Nao foi possivel concluir a verificacao de seguranca."), isAdmin: false, isStaff: false };
    }
  };

  const signUp = async ({ fullName, email, password, phone, businessSlug }: SignUpInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    const redirectUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      const captchaToken = await requestTurnstileToken("agenda-signup");
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          captchaToken,
          data: {
            role: "client",
            ...(businessSlug ? { agenda_business_slug: businessSlug } : {}),
            full_name: fullName.trim(),
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        return { error, needsEmailConfirmation: false };
      }

      if (data.user && data.session) {
        await syncProfileMetadata(data.user, await getAgendaProfile(data.user.id), {
          fullName,
          phone: normalizedPhone,
        });
        await syncUserAccess(data.user);
      }

      return {
        error: null,
        needsEmailConfirmation: !data.session,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Nao foi possivel concluir a verificacao de seguranca."),
        needsEmailConfirmation: false,
      };
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    try {
      const captchaToken = await requestTurnstileToken("agenda-password-reset");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        captchaToken,
      });
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Nao foi possivel concluir a verificacao de seguranca.") };
    }
  };

  const signOut = async () => {
    await removeNativePushForSession().catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsStaff(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isStaff,
        ownerUserId,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
