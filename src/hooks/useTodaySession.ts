// src/hooks/useTodaySession.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTodaySession(employeeId?: string) {
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    if (!employeeId) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from('employee_work_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('check_in_time', `${today}T00:00:00`)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSession(data));
  }, [employeeId]);
  return session;
}
