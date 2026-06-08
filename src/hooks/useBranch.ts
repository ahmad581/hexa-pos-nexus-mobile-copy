import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Minimal branch hook: attempts to resolve a branch id from profile if available.
export function useBranch() {
  const [branch, setBranch] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getUser();
        const user = (res as any)?.data?.user;
        if (!user) return;
        // try to read branch_id from profiles table if present
        const { data } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single();
        if (!mounted) return;
        if (data?.branch_id) setBranch({ id: data.branch_id });
      } catch (e) {
        // ignore, leave branch null
      }
    })();
    return () => { mounted = false; };
  }, []);

  return branch;
}

export default useBranch;
