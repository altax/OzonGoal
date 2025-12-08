import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants/theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signIn, signUp, continueAsGuest } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGuestLogin = () => {
    continueAsGuest();
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login')) {
          message = 'Неверный email или пароль';
        } else if (message.includes('User already registered')) {
          message = 'Пользователь с таким email уже существует';
        } else if (message.includes('Invalid email')) {
          message = 'Неверный формат email';
        }
        Alert.alert('Ошибка', message);
      } else if (!isLogin) {
        Alert.alert(
          'Регистрация успешна',
          'Проверьте почту для подтверждения аккаунта',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: theme.accentLight }]}>
            <Feather name="target" size={40} color={theme.accent} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            {isLogin ? 'Вход' : 'Регистрация'}
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isLogin 
              ? 'Войдите чтобы синхронизировать данные'
              : 'Создайте аккаунт для синхронизации'
            }
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Пароль"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <ThemedText type="body" style={styles.submitButtonText}>
                    {isLogin ? 'Войти' : 'Зарегистрироваться'}
                  </ThemedText>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          </ThemedText>
          <Pressable onPress={() => setIsLogin(!isLogin)}>
            <ThemedText type="body" style={[styles.switchText, { color: theme.accent }]}>
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.guestButton,
            { 
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              opacity: pressed ? 0.7 : 1 
            },
          ]}
          onPress={handleGuestLogin}
        >
          <Feather name="user" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Продолжить как гость
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    gap: Spacing.xs,
  },
  switchText: {
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
});
