import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THEME } from '../theme';
import { BrandHeader, FormField, LoginButton } from '../components';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { supabase } from '../services/supabase';

interface LoginFormState {
  username: string;
  password: string;
  isLoading: boolean;
}

interface FormErrors {
  username?: string;
  password?: string;
}

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const [formState, setFormState] = useState<LoginFormState>({
    username: '',
    password: '',
    isLoading: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigation.replace('App');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    checkAuthStatus();
  }, [navigation]);

  const handleUsernameChange = (text: string) => {
    setFormState((prev) => ({ ...prev, username: text }));
    if (errors.username) {
      setErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setFormState((prev) => ({ ...prev, password: text }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.username.trim()) {
      newErrors.username = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.username)) {
      newErrors.username = 'Please enter a valid email';
    }

    if (!formState.password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    console.log('handleLogin called', { username: formState.username, loading: formState.isLoading });
    if (!validateForm()) {
      return;
    }

    setFormState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formState.username,
        password: formState.password,
      });

      console.log('supabase.signInWithPassword ->', { authData, authError });

      if (authError) {
        Alert.alert('Login Failed', authError.message || 'Invalid email or password');
        setFormState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      if (!authData.session) {
        Alert.alert('Login Failed', 'No session created. Please try again.');
        setFormState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch user profile to check if account is active
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('primary_role, is_active')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        Alert.alert('Error', 'Could not fetch user profile');
        await supabase.auth.signOut();
        setFormState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. Please contact your administrator.'
        );
        setFormState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      Alert.alert('Login Successful', `Welcome back, ${formState.username}!`);
      navigation.replace('App');
    } catch (error: any) {
      Alert.alert('Login Error', error?.message || 'An unexpected error occurred');
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background.primary} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          <BrandHeader iconText="HX" brandName="Hexa Business Kit" />

          <FormField
            label="Username"
            placeholder="business@hexa.com"
            value={formState.username}
            onChangeText={handleUsernameChange}
            editable={!formState.isLoading}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.username}
          />

          <FormField
            label="Password"
            placeholder="Enter your password"
            value={formState.password}
            onChangeText={handlePasswordChange}
            editable={!formState.isLoading}
            secureTextEntry
            error={errors.password}
          />

          <LoginButton
            onPress={handleLogin}
            isLoading={formState.isLoading}
            disabled={formState.isLoading}
            title="Login"
            variant="primary"
            // showArrow
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  cardContainer: {
    backgroundColor: THEME.colors.surface.primary,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xxl,
    width: '100%',
    maxWidth: 420,
    ...THEME.shadows.shadowLg,
  },
});
