import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type Profile = {
  id: string;
  business_id: string | null;
  branch_id: string | null;
  primary_role: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(data?.session?.user ?? null);
      } catch {}
    })();

    const { data: sub } = (supabase.auth as any).onAuthStateChange?.(
      (_: any, session: any) => setUser(session?.user ?? null)
    ) || { data: null };

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, business_id, branch_id, primary_role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn('useAuth: profile load failed', error.message);
          setProfile(null);
        } else {
          setProfile((data as Profile) ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return {
    user,
    profile,
    profileId: profile?.id ?? null,
    businessId: profile?.business_id ?? null,
    branchId: profile?.branch_id ?? null,
    primaryRole: profile?.primary_role ?? null,
    loading,
  };
}
