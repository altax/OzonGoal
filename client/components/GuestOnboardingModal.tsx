import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants/theme';

const ONBOARDING_SEEN_KEY = '@guest_onboarding_seen';

interface GuestOnboardingModalProps {
  isGuestMode: boolean;
  onOpenAuth: () => void;
}

export function GuestOnboardingModal({ isGuestMode, onOpenAuth }: GuestOnboardingModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isGuestMode) return;
      
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        if (!seen) {
          setVisible(true);
        }
      } catch (error) {
        console.log('[GuestOnboarding] Error checking status:', error);
      }
    };
    
    checkOnboarding();
  }, [isGuestMode]);

  const handleClose = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch (error) {
      console.log('[GuestOnboarding] Error saving status:', error);
    }
    setVisible(false);
  };

  const handleCreateAccount = async () => {
    await handleClose();
    onOpenAuth();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <GuestOnboardingContent 
        onClose={handleClose} 
        onCreateAccount={handleCreateAccount}
      />
    </Modal>
  );
}

function GuestOnboardingContent({ 
  onClose, 
  onCreateAccount 
}: { 
  onClose: () => void;
  onCreateAccount: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <BlurView
      intensity={30}
      tint={isDark ? "dark" : "light"}
      style={styles.blurContainer}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.backgroundContent,
            marginBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
          <Feather name="user" size={32} color="#F59E0B" />
        </View>

        <ThemedText type="h3" style={styles.title}>
          Гостевой режим
        </ThemedText>

        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Вы используете приложение в гостевом режиме. Ваши данные сохраняются только на этом устройстве.
        </ThemedText>

        <View style={styles.featuresList}>
          <FeatureItem 
            icon="cloud" 
            text="Для синхронизации между устройствами создайте аккаунт"
            theme={theme}
          />
          <FeatureItem 
            icon="upload-cloud" 
            text="Все локальные данные автоматически перенесутся в облако"
            theme={theme}
          />
          <FeatureItem 
            icon="shield" 
            text="Ваши данные не будут утеряны при регистрации"
            theme={theme}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.accent },
            pressed && { opacity: 0.8 },
          ]}
          onPress={onCreateAccount}
        >
          <Feather name="user-plus" size={18} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Создать аккаунт
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            pressed && { opacity: 0.8 },
          ]}
          onPress={onClose}
        >
          <ThemedText type="body" style={{ color: theme.text }}>
            Продолжить как гость
          </ThemedText>
        </Pressable>
      </View>
    </BlurView>
  );
}

function FeatureItem({ icon, text, theme }: { icon: keyof typeof Feather.glyphMap; text: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.accentLight }]}>
        <Feather name={icon} size={16} color={theme.accent} />
      </View>
      <ThemedText type="caption" style={[styles.featureText, { color: theme.textSecondary }]}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  featuresList: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
