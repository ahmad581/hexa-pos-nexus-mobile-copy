// src/hooks/useEmployee.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useEmployee(employeeId?: string) {
  const [employee, setEmployee] = useState<any>(null);
  useEffect(() => {
    if (!employeeId) return;
    supabase.from('employees').select('*').eq('id', employeeId).single().then(({ data }) => setEmployee(data));
  }, [employeeId]);
  return employee;
}
