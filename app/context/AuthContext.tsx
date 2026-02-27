"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  points: number;
  full_name: string | null;
  avatar_url: string | null;
  role?: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  /** 是否正在获取 session（首屏或登录状态变化） */
  loading: boolean;
  /** 是否仍在做首次初始化，未完成前不应执行业务逻辑或跳转 */
  isInitializing: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** 单例 client，避免每次渲染创建新实例导致 useEffect 依赖变化、死循环 */
const getSupabase = (() => {
  let instance: ReturnType<typeof createBrowserSupabase> | null = null;
  return () => {
    if (!instance) instance = createBrowserSupabase() as ReturnType<typeof createBrowserSupabase>;
    return instance;
  };
})();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const supabase = useMemo(() => getSupabase(), []);

  const fetchProfile = useCallback(async (accessToken: string): Promise<Profile | null> => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/api/me` : "/api/me";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        return data as Profile;
      }
    } catch (_e) {
      // 超时、Failed to fetch 等：不抛错，仅清空 profile
    } finally {
      clearTimeout(timeoutId);
    }
    setProfile(null);
    return null;
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    const token = tokenRef.current;
    if (token) return fetchProfile(token);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      tokenRef.current = session.access_token;
      return fetchProfile(session.access_token);
    }
    setProfile(null);
    return null;
  }, [supabase, fetchProfile]);

  // 仅依赖稳定的 supabase（单例），effect 只会在挂载时运行一次
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("auth_init_timeout")), 10000)
          ),
        ]);
        const session = result.data.session;
        if (!mounted) return;
        tokenRef.current = session?.access_token ?? null;
        setUser(session?.user ?? null);
        if (session?.access_token) {
          await fetchProfile(session.access_token);
        } else {
          setProfile(null);
        }
      } catch (_e) {
        if (mounted) setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      tokenRef.current = session?.access_token ?? null;
      setUser(session?.user ?? null);
      try {
        if (session?.access_token) {
          await fetchProfile(session.access_token);
        } else {
          setProfile(null);
        }
      } catch (_e) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.dir(
          { name: "Supabase 登录错误", status: (error as { status?: number }).status, message: error.message, __error: error },
          { depth: 4 }
        );
      }
      if (!error) return { error: null };
      const msg = error.message ?? "";
      if (msg.includes("Email not confirmed") || /email_not_confirmed/i.test(msg)) {
        return { error: "邮箱尚未确认，请查收邮件并点击确认链接后再登录。若需注册后直接登录，可在 Supabase Dashboard 关闭「Confirm email」。" };
      }
      return { error: msg };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        console.dir(
          { name: "Supabase 注册错误", status: (error as { status?: number }).status, message: error.message, __error: error },
          { depth: 4 }
        );
      }
      if (!error) return { error: null };
      return { error: error.message ?? null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    tokenRef.current = null;
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      tokenRef.current = session.access_token;
      return session.access_token;
    }
    return null;
  }, [supabase]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      isInitializing,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      getAccessToken,
    }),
    [user, profile, loading, isInitializing, signIn, signUp, signOut, refreshProfile, getAccessToken]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
