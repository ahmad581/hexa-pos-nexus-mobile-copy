import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRole() {
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getUser();
        const user = (res as any)?.data?.user;
        if (!user) return;
        const { data } = await supabase.from('profiles').select('primary_role').eq('user_id', user.id).single();
        if (!mounted) return;
        setRole((data?.primary_role || '').toLowerCase());
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  return {
    role,
    isManager: () => role === 'manager' || role === 'super_manager' || role === 'systemmaster',
    isSuperManager: () => role === 'super_manager',
    isHallManager: () => role.includes('hall'),
    isDriver: () => role.includes('driver'),
  };
}

export default useRole;
