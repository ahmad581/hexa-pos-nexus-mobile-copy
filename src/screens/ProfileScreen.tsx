import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { toggleCheckInOut } from '../lib/session';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

type UserData = {
  id: string;
  email: string;
  full_name?: string;
  primary_role?: string;
  branch_id?: string;
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
  const navigation = useNavigation();

  const refreshTodaySession = useCallback(async () => {
    if (!userData?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('employee_work_sessions')
      .select('*')
      .eq('employee_id', userData.id)
      .gte('check_in_time', `${today}T00:00:00`)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTodaySession(data || null);
  }, [userData?.id]);

  const handleToggleCheckInOut = async () => {
    if (!userData?.id || !userData?.branch_id) {
      Alert.alert('Error', 'User or branch information missing');
      return;
    }
    setIsCheckingInOut(true);
    try {
      const result = await toggleCheckInOut(userData.id, userData.branch_id, 'manual');
      Alert.alert('Success', result === 'checked_in' ? 'Checked in successfully' : 'Checked out successfully');
      await refreshTodaySession();
      // Refresh work sessions
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions } = await supabase
        .from('employee_work_sessions')
        .select('*')
        .eq('employee_id', userData.id)
        .gte('check_in_time', since)
        .order('check_in_time', { ascending: false });
      if (sessions) setWorkSessions(sessions);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in/out');
    } finally {
      setIsCheckingInOut(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert('Logout Error', error.message || 'Failed to logout');
        return;
      }

      // Clear local state
      setUserData(null);
      setWorkSessions([]);

      // Navigate back to Login
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err: any) {
      Alert.alert('Logout Error', err?.message || 'An unexpected error occurred');
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);

        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          Alert.alert('Error', 'Could not fetch user data');
          return;
        }

        // Fetch user profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, primary_role')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Use basic user info if profile doesn't exist
          setUserData({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || 'User',
          });
        } else if (profile) {
          setUserData({
            id: profile.id,
            email: profile.email || user.email || '',
            full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
            primary_role: profile.primary_role,
          });
        }

        // Fetch work sessions (check in/out) for the last month from employee_work_sessions table
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: sessions, error: sessionsError } = await supabase
          .from('employee_work_sessions')
          .select('*')
          .eq('employee_id', user.id)
          .gte('check_in_time', since)
          .order('check_in_time', { ascending: false });

        if (!sessionsError && sessions) {
          setWorkSessions(sessions);
        }
        await refreshTodaySession();
      } catch (error: any) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>User Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>
      
      {/* Check In/Out Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Check In/Out</Text>
        <View style={styles.shiftCard}>
          <Text style={styles.shiftStatus}>
            {todaySession && !todaySession.check_out_time ? '✓ Checked In' : '○ Checked Out'}
          </Text>
          <TouchableOpacity
            style={[styles.shiftButton, todaySession && !todaySession.check_out_time ? styles.shiftButtonActive : styles.shiftButtonInactive]}
            onPress={handleToggleCheckInOut}
            disabled={isCheckingInOut}
            activeOpacity={0.7}
          >
            {isCheckingInOut ? (
              <ActivityIndicator color={COLORS.text.primary} size="small" />
            ) : (
              <>
                <MaterialIcons 
                  name={todaySession && !todaySession.check_out_time ? 'logout' : 'login'} 
                  size={20} 
                  color={COLORS.text.primary} 
                />
                <Text style={styles.shiftButtonText}>
                  {todaySession && !todaySession.check_out_time ? 'Check Out' : 'Check In'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {todaySession && (
            <>
              <Text style={styles.lastEvent}>Check-in: {new Date(todaySession.check_in_time).toLocaleTimeString()}</Text>
              {todaySession.check_out_time && (
                <Text style={styles.lastEvent}>Check-out: {new Date(todaySession.check_out_time).toLocaleTimeString()}</Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>User Information</Text>
        <Text style={styles.text}>Name: {userData.full_name || 'User'}</Text>
        <Text style={styles.text}>Email: {userData.email}</Text>
        {userData.primary_role && (
          <Text style={styles.text}>Role: {userData.primary_role}</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Work Sessions</Text>
        {workSessions.length > 0 ? (
          workSessions.map((session) => (
            <View key={session.id} style={styles.workHistoryItem}>
              <Text style={styles.workTitle}>Check-in: {new Date(session.check_in_time).toLocaleString()}</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
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
  logoutButton: {
    padding: SPACING.md,
    marginLeft: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
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
  shiftButtonActive: {
    backgroundColor: COLORS.error,
  },
  shiftButtonInactive: {
    backgroundColor: COLORS.primary.main,
  },
  shiftButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  lastEvent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
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
  workDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  workDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.tertiary,
  },
});

export default ProfileScreen;
