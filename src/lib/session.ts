import { supabase } from './supabase';
import { distanceMeters } from './geo';
import { requestGeolocationPermission, getCurrentPosition, getDeviceId } from './locationDeviceAdapter';

export async function toggleCheckInOut(employeeId: string, branchId: string, method: 'qr'|'biometric'|'manual') {
  // 1. Geofence verify
  const { data: branch } = await supabase.from('branches')
    .select('latitude, longitude, geofence_radius_m').eq('id', branchId).single();

  const status = await requestGeolocationPermission();
  if (status !== 'granted') throw new Error('Location required');

  const pos = await getCurrentPosition();
  if (branch?.latitude && distanceMeters(pos.coords as any, branch) > (branch.geofence_radius_m ?? 150)) {
    throw new Error('You are not at the branch');
  }

  // 2. Find open session today
  const today = new Date().toISOString().slice(0, 10);
  const { data: open } = await supabase.from('employee_work_sessions')
    .select('id').eq('employee_id', employeeId)
    .gte('check_in_time', `${today}T00:00:00`).is('check_out_time', null)
    .order('check_in_time', { ascending: false }).limit(1).maybeSingle();

  if (open) {
    await supabase.from('employee_work_sessions')
      .update({ check_out_time: new Date().toISOString() }).eq('id', open.id);
    return 'checked_out';
  }

  const deviceId = await getDeviceId();
  await supabase.from('employee_work_sessions').insert({
    employee_id: employeeId, branch_id: branchId,
    check_in_time: new Date().toISOString(),
    check_in_lat: (pos.coords as any).latitude, check_in_lng: (pos.coords as any).longitude,
    check_in_method: method, device_id: deviceId,
  });
  return 'checked_in';
}
