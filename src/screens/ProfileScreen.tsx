import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import MaterialIcon from '../lib/Icon';
import { supabase } from '../services/supabase';
import { toggleCheckInOut } from '../lib/session';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

type UserData = {
  profile_id: string;
  employee_id: string | null;
  email: string;
  full_name?: string;
  primary_role?: string;
  branch_id?: string | null;
};

type WorkSession = {
  id: string;
  check_in_time: string;
  check_out_time?: string;
};

const ProfileScreen = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingInOut, setIsCheckingInOut] = useState(false);
  const [todaySession, setTodaySession] = useState<WorkSession | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const navigation = useNavigation();

  const refreshTodaySession = useCallback(async (employeeId?: string | null) => {
    const empId = employeeId ?? userData?.employee_id;
    if (!empId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('employee_work_sessions')
      .select('*')
      .eq('employee_id', empId)
      .gte('check_in_time', `${today}T00:00:00`)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('refreshTodaySession error:', error.message);
    setTodaySession(data || null);
  }, [userData?.employee_id]);

  const loadRecentSessions = useCallback(async (employeeId: string) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('employee_work_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('check_in_time', since)
      .order('check_in_time', { ascending: false });
    if (error) {
      console.warn('loadRecentSessions error:', error.message);
      return;
    }
    if (data) setWorkSessions(data);
  }, []);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied. Please enable location to check in/out.');
    }
    // Check that location services are on
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      throw new Error('Location services are disabled. Please turn on GPS.');
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  };

  const handleToggleCheckInOut = async () => {
    if (!userData?.employee_id || !userData?.branch_id) {
      Alert.alert('Missing info', 'Employee or branch not loaded yet.');
      return;
    }

    try {
      setCheckInLoading(true);

      // Pre-warm permissions so the adapter sees 'granted'
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please enable location access to check in/out.');
        return;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        Alert.alert('Location off', 'Please turn on location services and try again.');
        return;
      }

      const result = await toggleCheckInOut(
        userData.employee_id,
        userData.branch_id,
        'manual'
      );

      // Refresh UI
      await refreshTodaySession();
      await loadRecentSessions(userData.employee_id);
    } catch (err: any) {
      console.error('toggleCheckInOut error:', err);
      Alert.alert('Check-in failed', err?.message ?? 'Unknown error');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Logout Error', error.message || 'Failed to logout');
        return;
      }
      setUserData(null);
      setWorkSessions([]);
      (navigation as any).reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err: any) {
      Alert.alert('Logout Error', err?.message || 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert('Error', 'Could not fetch user data');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, primary_role, branch_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profileError) console.warn('Profile fetch error:', profileError.message);

        const email = profile?.email || user.email || '';
        const profileBranchId = profile?.branch_id ?? null;

        let employeeId: string | null = null;
        let employeeBranchId: string | null = null;
        if (email) {
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, branch_id, is_active')
            .eq('email', email)
            .eq('is_active', true)
            .maybeSingle();
          if (empError) console.warn('Employee fetch error:', empError.message);
          if (employee) {
            employeeId = employee.id;
            employeeBranchId = employee.branch_id ?? null;
          }
        }

        const resolved: UserData = {
          profile_id: profile?.id ?? user.id,
          employee_id: employeeId,
          email,
          full_name: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
            : user.user_metadata?.full_name || 'User',
          primary_role: profile?.primary_role,
          branch_id: employeeBranchId || profileBranchId,
        };
        setUserData(resolved);

        if (employeeId) {
          await loadRecentSessions(employeeId);
          await refreshTodaySession(employeeId);
        }
      } catch (error: any) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [loadRecentSessions, refreshTodaySession]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>No user data available</Text>
      </View>
    );
  }

  const isCheckedIn = !!(todaySession && !todaySession.check_out_time);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>User Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcon name="logout" size={24} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Check In/Out</Text>
        <View style={styles.shiftCard}>
          <Text style={styles.shiftStatus}>{isCheckedIn ? '✓ Checked In' : '○ Checked Out'}</Text>
          <TouchableOpacity
            style={[styles.shiftButton, isCheckedIn ? styles.shiftButtonActive : styles.shiftButtonInactive]}
            onPress={handleToggleCheckInOut}
            disabled={isCheckingInOut || !userData.employee_id}
            activeOpacity={0.7}
          >
            {isCheckingInOut ? (
              <ActivityIndicator color={COLORS.text.primary} size="small" />
            ) : (
              <>
                <MaterialIcon name={isCheckedIn ? 'logout' : 'login'} size={20} color={COLORS.text.primary} />
                <Text style={styles.shiftButtonText}>{isCheckedIn ? 'Check Out' : 'Check In'}</Text>
              </>
            )}
          </TouchableOpacity>
          {!userData.employee_id && (
            <Text style={styles.lastEvent}>No employee record found for {userData.email}</Text>
          )}
          {todaySession && (
            <>
              <Text style={styles.lastEvent}>
                Check-in: {new Date(todaySession.check_in_time).toLocaleTimeString()}
              </Text>
              {todaySession.check_out_time && (
                <Text style={styles.lastEvent}>
                  Check-out: {new Date(todaySession.check_out_time).toLocaleTimeString()}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>User Information</Text>
        <Text style={styles.text}>Name: {userData.full_name || 'User'}</Text>
        <Text style={styles.text}>Email: {userData.email}</Text>
        {userData.primary_role && <Text style={styles.text}>Role: {userData.primary_role}</Text>}
        {userData.branch_id && <Text style={styles.text}>Branch: {userData.branch_id}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Work Sessions</Text>
        {workSessions.length > 0 ? (
          workSessions.map((session) => (
            <View key={session.id} style={styles.workHistoryItem}>
              <Text style={styles.workTitle}>
                Check-in: {new Date(session.check_in_time).toLocaleString()}
              </Text>
              <Text style={styles.workDate}>
                {session.check_out_time
                  ? `Check-out: ${new Date(session.check_out_time).toLocaleString()}`
                  : 'Check-out: —'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.text}>No work sessions available</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    color: COLORS.text.primary,
    flex: 1,
  },
  logoutButton: { padding: SPACING.md, marginLeft: SPACING.md },
  section: { marginBottom: SPACING.xl },
  shiftCard: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  shiftStatus: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  shiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 6,
    marginBottom: SPACING.md,
  },
  shiftButtonActive: { backgroundColor: COLORS.error },
  shiftButtonInactive: { backgroundColor: COLORS.primary.main },
  shiftButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  lastEvent: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.tertiary, fontStyle: 'italic' },
  sectionHeader: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  workHistoryItem: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  workTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  workDate: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.tertiary },
  loadingText: { fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.text.tertiary },
});

export default ProfileScreen;
