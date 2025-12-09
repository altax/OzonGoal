import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useShifts, useUpdateShift, useGoals, useHiddenGoals, useUpdateGoal, useDeleteAllHiddenShifts, useDeleteAllHiddenGoals, useDeleteAllData } from "@/api";
import { PinSetupModal } from "@/components/PinSetupModal";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({ 
  icon, 
  iconColor,
  iconBgColor,
  title, 
  subtitle,
  value, 
  onPress, 
  showChevron = true,
  danger = false,
}: SettingsItemProps) {
  const { theme } = useTheme();
  const finalIconColor = danger ? "#EF4444" : (iconColor || theme.accent);
  const finalIconBgColor = danger ? "#FEE2E2" : (iconBgColor || theme.accentLight);
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        { 
          backgroundColor: pressed ? theme.backgroundSecondary : 'transparent',
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingsItemIcon, { backgroundColor: finalIconBgColor }]}>
        <Feather name={icon} size={14} color={finalIconColor} />
      </View>
      <ThemedText type="body" style={[styles.settingsItemText, danger && { color: "#EF4444" }]}>
        {title}
      </ThemedText>
      <View style={styles.settingsItemRight}>
        {value && (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {value}
          </ThemedText>
        )}
        {showChevron && (
          <Feather name="chevron-right" size={16} color={theme.textSecondary} style={{ marginLeft: Spacing.xs }} />
        )}
      </View>
    </Pressable>
  );
}

function HiddenShiftsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ThemeProvider>
        <HiddenShiftsModalContent onClose={onClose} />
      </ThemeProvider>
    </Modal>
  );
}

function HiddenShiftsModalContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { data: shifts = [] } = useShifts();
  const updateShift = useUpdateShift();
  const deleteAllHiddenShifts = useDeleteAllHiddenShifts();

  const hiddenShifts = useMemo(() => {
    return shifts.filter(s => s.status === "canceled").sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }, [shifts]);

  const handleRestoreShift = async (shiftId: string) => {
    try {
      await updateShift.mutateAsync({
        id: shiftId,
        status: "scheduled",
      });
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось восстановить смену");
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      "Удалить все скрытые смены?",
      "Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllHiddenShifts.mutateAsync();
              onClose();
            } catch (error) {
              Alert.alert("Ошибка", "Не удалось удалить смены");
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={modalStyles.blurContainer}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      
      <View
        style={[
          modalStyles.modalContent,
          {
            backgroundColor: theme.backgroundContent,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={modalStyles.handle} />
        
        <View style={modalStyles.header}>
          <ThemedText type="h4" style={modalStyles.title}>
            Скрытые смены
          </ThemedText>
          <Pressable onPress={onClose} style={modalStyles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={modalStyles.listContainer}
          contentContainerStyle={modalStyles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {hiddenShifts.length === 0 ? (
            <View style={modalStyles.emptyState}>
              <View style={[modalStyles.emptyIcon, { backgroundColor: theme.accentLight }]}>
                <Feather name="eye-off" size={32} color={theme.accent} />
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg, textAlign: "center" }}>
                Нет скрытых смен
              </ThemedText>
            </View>
          ) : (
            <>
              {hiddenShifts.map((shift) => (
                <View
                  key={shift.id}
                  style={[
                    modalStyles.listItem,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={modalStyles.listItemLeft}>
                    <View style={[modalStyles.listItemIcon, { backgroundColor: theme.accentLight }]}>
                      <Feather
                        name={shift.shiftType === "day" ? "sun" : "moon"}
                        size={18}
                        color={theme.accent}
                      />
                    </View>
                    <View>
                      <ThemedText type="body" style={{ fontWeight: "500" }}>
                        {shift.operationType === "returns" ? "Возвраты" : "Приёмка"}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {formatDate(shift.scheduledDate)} • {shift.shiftType === "day" ? "08:00 - 20:00" : "20:00 - 08:00"}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      modalStyles.restoreButton,
                      { backgroundColor: theme.accentLight },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleRestoreShift(shift.id)}
                  >
                    <Feather name="rotate-ccw" size={16} color={theme.accent} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={({ pressed }) => [
                  modalStyles.deleteAllButton,
                  { backgroundColor: "#FEE2E2" },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleDeleteAll}
              >
                <Feather name="trash-2" size={18} color="#EF4444" />
                <ThemedText type="body" style={{ color: "#EF4444", marginLeft: Spacing.sm }}>
                  Удалить все
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </BlurView>
  );
}

function HiddenGoalsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ThemeProvider>
        <HiddenGoalsModalContent onClose={onClose} />
      </ThemeProvider>
    </Modal>
  );
}

function HiddenGoalsModalContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { data: hiddenGoals = [] } = useHiddenGoals();
  const updateGoal = useUpdateGoal();
  const deleteAllHiddenGoals = useDeleteAllHiddenGoals();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestoreGoal = async (goalId: string) => {
    if (restoringId) return;
    setRestoringId(goalId);
    try {
      await updateGoal.mutateAsync({
        id: goalId,
        status: "active",
      });
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось восстановить цель");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      "Удалить все скрытые цели?",
      "Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllHiddenGoals.mutateAsync();
              onClose();
            } catch (error) {
              Alert.alert("Ошибка", "Не удалось удалить цели");
            }
          },
        },
      ]
    );
  };

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={modalStyles.blurContainer}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      
      <View
        style={[
          modalStyles.modalContent,
          {
            backgroundColor: theme.backgroundContent,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={modalStyles.handle} />
        
        <View style={modalStyles.header}>
          <ThemedText type="h4" style={modalStyles.title}>
            Скрытые цели
          </ThemedText>
          <Pressable onPress={onClose} style={modalStyles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={modalStyles.listContainer}
          contentContainerStyle={modalStyles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {hiddenGoals.length === 0 ? (
            <View style={modalStyles.emptyState}>
              <View style={[modalStyles.emptyIcon, { backgroundColor: theme.accentLight }]}>
                <Feather name="eye-off" size={32} color={theme.accent} />
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg, textAlign: "center" }}>
                Нет скрытых целей
              </ThemedText>
            </View>
          ) : (
            <>
              {hiddenGoals.map((goal) => (
                <View
                  key={goal.id}
                  style={[
                    modalStyles.listItem,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={modalStyles.listItemLeft}>
                    <View style={[modalStyles.listItemIcon, { backgroundColor: goal.iconBgColor || theme.accentLight }]}>
                      <Feather
                        name={(goal.iconKey || "target") as keyof typeof Feather.glyphMap}
                        size={18}
                        color={goal.iconColor || theme.accent}
                      />
                    </View>
                    <View>
                      <ThemedText type="body" style={{ fontWeight: "500" }}>
                        {goal.name}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {Math.round((Number(goal.currentAmount) / (Number(goal.targetAmount) || 1)) * 100)}% выполнено
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      modalStyles.restoreButton,
                      { backgroundColor: theme.accentLight },
                      (pressed || restoringId === goal.id) && { opacity: 0.5 },
                    ]}
                    onPress={() => handleRestoreGoal(goal.id)}
                    disabled={restoringId !== null}
                  >
                    <Feather name="rotate-ccw" size={16} color={theme.accent} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={({ pressed }) => [
                  modalStyles.deleteAllButton,
                  { backgroundColor: "#FEE2E2" },
                  (pressed || deleteAllHiddenGoals.isPending) && { opacity: 0.5 },
                ]}
                onPress={handleDeleteAll}
                disabled={deleteAllHiddenGoals.isPending}
              >
                <Feather name="trash-2" size={18} color="#EF4444" />
                <ThemedText type="body" style={{ color: "#EF4444", marginLeft: Spacing.sm }}>
                  Удалить все
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </BlurView>
  );
}

function AutoAllocationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemeProvider>
        <AutoAllocationModalContent onClose={onClose} />
      </ThemeProvider>
    </Modal>
  );
}

function AutoAllocationModalContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { data: goals = [] } = useGoals();
  const updateGoal = useUpdateGoal();
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === "active").sort((a, b) => a.orderIndex - b.orderIndex);
  }, [goals]);

  useEffect(() => {
    if (initialized || activeGoals.length === 0) return;
    
    const initial: Record<string, string> = {};
    activeGoals.forEach(g => {
      initial[g.id] = String(g.allocationPercentage || 0);
    });
    setPercentages(initial);
    setInitialized(true);
  }, [activeGoals, initialized]);

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  }, [percentages]);

  const handlePercentageChange = (goalId: string, value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    const num = Math.min(100, parseInt(cleaned) || 0);
    setPercentages(prev => ({ ...prev, [goalId]: String(num) }));
  };

  const handleSave = async () => {
    if (totalPercentage > 100) {
      Alert.alert("Ошибка", "Сумма процентов не может превышать 100%");
      return;
    }
    
    setSaving(true);
    try {
      for (const goal of activeGoals) {
        const newPercentage = parseInt(percentages[goal.id]) || 0;
        if (newPercentage !== goal.allocationPercentage) {
          await updateGoal.mutateAsync({
            id: goal.id,
            allocationPercentage: newPercentage,
          });
        }
      }
      onClose();
    } catch (error) {
      console.error('[AutoAllocation] Error saving:', error);
      Alert.alert("Ошибка", "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[autoAllocationStyles.fullScreenContainer, { backgroundColor: theme.backgroundRoot }]}
    >
      <View style={[autoAllocationStyles.fullScreenHeader, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            autoAllocationStyles.fullScreenCloseButton,
            { backgroundColor: theme.backgroundSecondary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onClose}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={autoAllocationStyles.fullScreenTitle}>
          Автораспределение
        </ThemedText>
        <View style={autoAllocationStyles.fullScreenHeaderSpacer} />
      </View>

      <ScrollView
        style={autoAllocationStyles.fullScreenContent}
        contentContainerStyle={[
          autoAllocationStyles.fullScreenContentContainer,
          { paddingBottom: insets.bottom + Spacing["4xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[autoAllocationStyles.infoCompact, { backgroundColor: theme.accentLight }]}>
          <Feather name="zap" size={14} color={theme.accent} />
          <ThemedText type="caption" style={{ color: theme.accent, marginLeft: Spacing.xs, flex: 1 }}>
            Суммы заполнятся автоматически при записи смены
          </ThemedText>
        </View>

        {activeGoals.length === 0 ? (
          <View style={modalStyles.emptyState}>
            <View style={[modalStyles.emptyIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name="target" size={32} color={theme.accent} />
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg, textAlign: "center" }}>
              Нет активных целей
            </ThemedText>
          </View>
        ) : (
          <>
            {activeGoals.map((goal) => (
              <View
                key={goal.id}
                style={[
                  autoAllocationStyles.goalRow,
                  { 
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={autoAllocationStyles.goalInfo}>
                  <View style={[autoAllocationStyles.goalIcon, { backgroundColor: goal.iconBgColor }]}>
                    <Feather
                      name={(goal.iconKey || "target") as keyof typeof Feather.glyphMap}
                      size={14}
                      color={goal.iconColor}
                    />
                  </View>
                  <ThemedText type="body" style={{ flex: 1 }} numberOfLines={1}>
                    {goal.name}
                  </ThemedText>
                </View>
                <View style={autoAllocationStyles.percentageInput}>
                  <TextInput
                    style={[
                      autoAllocationStyles.input,
                      { 
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={percentages[goal.id] || "0"}
                    onChangeText={(text) => handlePercentageChange(goal.id, text)}
                    keyboardType="numeric"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>%</ThemedText>
                </View>
              </View>
            ))}

            <View style={[autoAllocationStyles.totalRow, { borderColor: theme.border }]}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>Итого</ThemedText>
              <ThemedText 
                type="body" 
                style={{ 
                  fontWeight: '600',
                  color: totalPercentage > 100 ? '#EF4444' : (totalPercentage === 100 ? theme.success : theme.text),
                }}
              >
                {totalPercentage}%
              </ThemedText>
            </View>

            {totalPercentage < 100 && (
              <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {100 - totalPercentage}% останется в свободном балансе
              </ThemedText>
            )}
          </>
        )}
      </ScrollView>

      {activeGoals.length > 0 && (
        <View
          style={[
            autoAllocationStyles.fullScreenFooter,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              autoAllocationStyles.fullScreenSaveButton,
              { backgroundColor: theme.accent },
              (pressed || saving) && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={saving || totalPercentage > 100}
          >
            <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
            <ThemedText type="body" style={{ color: '#fff', fontWeight: '600' }}>
              {saving ? "Сохранение..." : "Сохранить"}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function GuestAuthModal({ 
  visible, 
  onClose,
  signIn,
  signUp,
}: { 
  visible: boolean; 
  onClose: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ThemeProvider>
        <GuestAuthModalContent onClose={onClose} signIn={signIn} signUp={signUp} />
      </ThemeProvider>
    </Modal>
  );
}

function GuestAuthModalContent({ 
  onClose,
  signIn,
  signUp,
}: { 
  onClose: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);
      
      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'Неверный email или пароль';
        } else if (message.includes('already registered') || message.includes('already exists')) {
          message = 'Этот email уже зарегистрирован';
        } else if (message.includes('Invalid email')) {
          message = 'Неверный формат email';
        }
        Alert.alert('Ошибка', message);
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={modalStyles.blurContainer}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ width: '100%' }}
      >
        <View
          style={[
            modalStyles.modalContent,
            {
              backgroundColor: theme.backgroundContent,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <View style={modalStyles.handle} />
          
          <View style={modalStyles.header}>
            <ThemedText type="h4" style={modalStyles.title}>
              {isSignUp ? 'Создать аккаунт' : 'Войти в аккаунт'}
            </ThemedText>
            <Pressable onPress={onClose} style={modalStyles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: Spacing.xl }}>
            <View style={[linkEmailStyles.infoBox, { backgroundColor: theme.accentLight }]}>
              <Feather name="info" size={16} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent, marginLeft: Spacing.sm, flex: 1 }}>
                Ваши локальные данные будут автоматически перенесены в облако
              </ThemedText>
            </View>

            <View style={linkEmailStyles.inputContainer}>
              <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="mail" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={[linkEmailStyles.input, { color: theme.text }]}
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

            <View style={linkEmailStyles.inputContainer}>
              <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="lock" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={[linkEmailStyles.input, { color: theme.text }]}
                  placeholder="Пароль"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>

            {isSignUp && (
              <View style={linkEmailStyles.inputContainer}>
                <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <Feather name="lock" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                  <TextInput
                    style={[linkEmailStyles.input, { color: theme.text }]}
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
                linkEmailStyles.submitButton,
                { backgroundColor: theme.accent },
                (pressed || loading) && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name={isSignUp ? 'user-plus' : 'log-in'} size={18} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
                  <ThemedText type="body" style={{ color: '#fff', fontWeight: '600' }}>
                    {isSignUp ? 'Зарегистрироваться' : 'Войти'}
                  </ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              style={{ alignItems: 'center', marginTop: Spacing.md }}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BlurView>
  );
}

function LinkEmailModal({ 
  visible, 
  onClose, 
  onLink 
}: { 
  visible: boolean; 
  onClose: () => void;
  onLink: (email: string, password: string) => Promise<{ error: Error | null }>;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ThemeProvider>
        <LinkEmailModalContent onClose={onClose} onLink={onLink} />
      </ThemeProvider>
    </Modal>
  );
}

function LinkEmailModalContent({ 
  onClose, 
  onLink 
}: { 
  onClose: () => void;
  onLink: (email: string, password: string) => Promise<{ error: Error | null }>;
}) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLink = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      const { error } = await onLink(email, password);
      if (error) {
        let message = error.message;
        if (message.includes('already registered') || message.includes('already exists')) {
          message = 'Этот email уже используется';
        } else if (message.includes('Invalid email')) {
          message = 'Неверный формат email';
        }
        Alert.alert('Ошибка', message);
      } else {
        Alert.alert(
          'Успешно!',
          'Email привязан к вашему аккаунту. Проверьте почту для подтверждения.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={modalStyles.blurContainer}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ width: '100%' }}
      >
        <View
          style={[
            modalStyles.modalContent,
            {
              backgroundColor: theme.backgroundContent,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <View style={modalStyles.handle} />
          
          <View style={modalStyles.header}>
            <ThemedText type="h4" style={modalStyles.title}>
              Привязать email
            </ThemedText>
            <Pressable onPress={onClose} style={modalStyles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: Spacing.xl }}>
            <View style={[linkEmailStyles.infoBox, { backgroundColor: theme.accentLight }]}>
              <Feather name="info" size={16} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent, marginLeft: Spacing.sm, flex: 1 }}>
                После привязки email вы сможете синхронизировать данные между устройствами
              </ThemedText>
            </View>

            <View style={linkEmailStyles.inputContainer}>
              <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="mail" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={[linkEmailStyles.input, { color: theme.text }]}
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

            <View style={linkEmailStyles.inputContainer}>
              <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="lock" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={[linkEmailStyles.input, { color: theme.text }]}
                  placeholder="Пароль"
                  placeholderTextColor={theme.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={linkEmailStyles.inputContainer}>
              <View style={[linkEmailStyles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="lock" size={18} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                <TextInput
                  style={[linkEmailStyles.input, { color: theme.text }]}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                linkEmailStyles.submitButton,
                { backgroundColor: theme.accent },
                (pressed || loading) && { opacity: 0.8 },
              ]}
              onPress={handleLink}
              disabled={loading}
            >
              <Feather name="link" size={18} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
              <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {loading ? 'Привязка...' : 'Привязать email'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BlurView>
  );
}

const linkEmailStyles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});

function DeleteConfirmationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemeProvider>
        <DeleteConfirmationModalContent onClose={onClose} />
      </ThemeProvider>
    </Modal>
  );
}

function DeleteConfirmationModalContent({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const deleteAllData = useDeleteAllData();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const CONFIRM_PHRASE = "Да, удалить";
  const isConfirmed = confirmText.trim() === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    
    setDeleting(true);
    try {
      await deleteAllData.mutateAsync();
      Alert.alert("Готово", "Все данные успешно удалены", [
        { text: "OK", onPress: onClose }
      ]);
    } catch (error) {
      console.error('[DeleteAllData] Error:', error);
      Alert.alert("Ошибка", "Не удалось удалить данные. Попробуйте ещё раз.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[deleteStyles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View style={[deleteStyles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            deleteStyles.closeButton,
            { backgroundColor: theme.backgroundSecondary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onClose}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={deleteStyles.headerTitle}>
          Очистить данные
        </ThemedText>
        <View style={deleteStyles.headerSpacer} />
      </View>

      <ScrollView
        style={deleteStyles.content}
        contentContainerStyle={[
          deleteStyles.contentContainer,
          { paddingBottom: insets.bottom + Spacing["4xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[deleteStyles.warningBox, { backgroundColor: '#FEE2E2' }]}>
          <Feather name="alert-triangle" size={24} color="#EF4444" />
          <ThemedText type="body" style={{ color: '#EF4444', marginTop: Spacing.md, textAlign: 'center', fontWeight: '600' }}>
            Внимание!
          </ThemedText>
          <ThemedText type="body" style={{ color: '#7F1D1D', marginTop: Spacing.sm, textAlign: 'center' }}>
            Это действие удалит все ваши цели, смены и распределения. Данные невозможно будет восстановить.
          </ThemedText>
        </View>

        <View style={deleteStyles.inputGroup}>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg }}>
            Для подтверждения введите:
          </ThemedText>
          <View style={[deleteStyles.phraseBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ fontWeight: '600', color: theme.text }}>
              {CONFIRM_PHRASE}
            </ThemedText>
          </View>
          <TextInput
            style={[
              deleteStyles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: isConfirmed ? '#10B981' : theme.border,
                borderWidth: isConfirmed ? 2 : 1,
              },
            ]}
            placeholder="Введите фразу..."
            placeholderTextColor={theme.textSecondary}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="sentences"
            autoCorrect={false}
          />
          {confirmText.length > 0 && !isConfirmed && (
            <ThemedText type="caption" style={{ color: '#EF4444', marginTop: Spacing.sm, textAlign: 'center' }}>
              Фраза не совпадает
            </ThemedText>
          )}
          {isConfirmed && (
            <ThemedText type="caption" style={{ color: '#10B981', marginTop: Spacing.sm, textAlign: 'center' }}>
              Фраза совпадает
            </ThemedText>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          deleteStyles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            deleteStyles.deleteButton,
            { backgroundColor: isConfirmed ? '#EF4444' : theme.backgroundSecondary },
            (pressed || deleting) && { opacity: 0.7 },
          ]}
          onPress={handleDelete}
          disabled={!isConfirmed || deleting}
        >
          <Feather 
            name="trash-2" 
            size={18} 
            color={isConfirmed ? "#FFFFFF" : theme.textSecondary} 
            style={{ marginRight: Spacing.sm }} 
          />
          <ThemedText 
            type="body" 
            style={{ 
              color: isConfirmed ? '#FFFFFF' : theme.textSecondary, 
              fontWeight: '600' 
            }}
          >
            {deleting ? "Удаление..." : "Удалить все данные"}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SettingsSection({ title, children }: { title?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={sectionStyles.container}>
      {title && (
        <ThemedText type="caption" style={[sectionStyles.title, { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
      )}
      <View style={[sectionStyles.card, { backgroundColor: theme.backgroundContent, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { balancePosition, setBalancePosition, isBalanceHidden, setIsBalanceHidden, isPinLockEnabled } = useSettings();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const { user, signOut, signIn, signUp, isAnonymous, isGuestMode, upgradeGuestToUser } = useAuth();
  const [showHiddenShifts, setShowHiddenShifts] = useState(false);
  const [showHiddenGoals, setShowHiddenGoals] = useState(false);
  const [showAutoAllocation, setShowAutoAllocation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showLinkEmail, setShowLinkEmail] = useState(false);
  const [showGuestAuth, setShowGuestAuth] = useState(false);
  const { data: shifts = [] } = useShifts();
  const { data: goals = [] } = useGoals();
  const { data: hiddenGoals = [] } = useHiddenGoals();

  const handleLogout = () => {
    Alert.alert(
      "Выйти из аккаунта?",
      "После выхода ваши данные не будут отображаться в гостевом режиме — прогресс сохранён только в вашем личном аккаунте.\n\nВы можете продолжить пользоваться приложением в гостевом режиме, а затем снова войти, чтобы синхронизировать данные.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  };

  const hiddenShiftsCount = useMemo(() => {
    return shifts.filter(s => s.status === "canceled").length;
  }, [shifts]);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === "active");
  }, [goals]);

  const totalAllocationPercentage = useMemo(() => {
    return activeGoals.reduce((sum, g) => sum + (g.allocationPercentage || 0), 0);
  }, [activeGoals]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection>
          <View style={styles.profileSection}>
            <View style={[styles.avatarContainer, { backgroundColor: (isAnonymous || isGuestMode) ? '#FEF3C7' : theme.accentLight }]}>
              <Feather name={(isAnonymous || isGuestMode) ? "user-x" : "user"} size={18} color={(isAnonymous || isGuestMode) ? '#F59E0B' : theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: '600', fontSize: 14 }}>
                {(isAnonymous || isGuestMode) ? 'Гостевой режим' : (user?.email?.split('@')[0] || 'Пользователь')}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 12 }}>
                {(isAnonymous || isGuestMode) ? 'Данные хранятся локально' : (user?.email || '')}
              </ThemedText>
            </View>
            {isGuestMode && (
              <Pressable
                style={({ pressed }) => [
                  styles.linkEmailButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setShowGuestAuth(true)}
              >
                <Feather name="log-in" size={12} color="#FFFFFF" />
                <ThemedText type="caption" style={{ color: '#FFFFFF', marginLeft: 4, fontWeight: '600', fontSize: 11 }}>
                  Войти
                </ThemedText>
              </Pressable>
            )}
            {isAnonymous && !isGuestMode && (
              <Pressable
                style={({ pressed }) => [
                  styles.linkEmailButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setShowLinkEmail(true)}
              >
                <Feather name="link" size={12} color="#FFFFFF" />
                <ThemedText type="caption" style={{ color: '#FFFFFF', marginLeft: 4, fontWeight: '600', fontSize: 11 }}>
                  Привязать
                </ThemedText>
              </Pressable>
            )}
          </View>
        </SettingsSection>

        <SettingsSection title="Финансы">
          <SettingsItem
            icon="pie-chart"
            iconColor="#10B981"
            iconBgColor="#D1FAE5"
            title="Автораспределение"
            value={totalAllocationPercentage > 0 ? `${totalAllocationPercentage}%` : "Выкл"}
            onPress={() => setShowAutoAllocation(true)}
          />
          <View style={[styles.itemDivider, { backgroundColor: theme.border }]} />
          <View style={styles.balanceSettingContainer}>
            <View style={styles.balanceSettingHeader}>
              <View style={[styles.settingsIconContainer, { backgroundColor: "#EDE9FE" }]}>
                <Feather name="credit-card" size={14} color="#8B5CF6" />
              </View>
              <ThemedText type="body" style={{ fontWeight: "500", fontSize: 14 }}>Баланс</ThemedText>
            </View>
            <View style={styles.balancePositionButtons}>
              {(["left", "center", "right"] as const).map((pos) => (
                <Pressable
                  key={pos}
                  style={[
                    styles.positionButton,
                    { 
                      backgroundColor: balancePosition === pos ? theme.accent : theme.backgroundSecondary,
                      borderColor: balancePosition === pos ? theme.accent : theme.border,
                    }
                  ]}
                  onPress={() => setBalancePosition(pos)}
                >
                  <Feather 
                    name={pos === "left" ? "align-left" : pos === "center" ? "align-center" : "align-right"} 
                    size={14} 
                    color={balancePosition === pos ? "#FFFFFF" : theme.textSecondary} 
                  />
                </Pressable>
              ))}
              <View style={styles.positionDivider} />
              <Pressable
                style={[
                  styles.hideButton,
                  { 
                    backgroundColor: isBalanceHidden ? theme.accent : theme.backgroundSecondary,
                    borderColor: isBalanceHidden ? theme.accent : theme.border,
                  }
                ]}
                onPress={() => setIsBalanceHidden(!isBalanceHidden)}
              >
                <Feather 
                  name={isBalanceHidden ? "eye-off" : "eye"} 
                  size={14} 
                  color={isBalanceHidden ? "#FFFFFF" : theme.textSecondary} 
                />
              </Pressable>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Данные">
          <SettingsItem
            icon="eye-off"
            iconColor="#6366F1"
            iconBgColor="#E0E7FF"
            title="Скрытые смены"
            value={hiddenShiftsCount > 0 ? `${hiddenShiftsCount}` : "—"}
            onPress={() => setShowHiddenShifts(true)}
          />
          <View style={[styles.itemDivider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="eye-off"
            iconColor="#6366F1"
            iconBgColor="#E0E7FF"
            title="Скрытые цели"
            value={hiddenGoals.length > 0 ? `${hiddenGoals.length}` : "—"}
            onPress={() => setShowHiddenGoals(true)}
          />
          <View style={[styles.itemDivider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="download"
            iconColor="#0EA5E9"
            iconBgColor="#E0F2FE"
            title="Экспорт данных"
            onPress={() => {}}
          />
        </SettingsSection>

        <SettingsSection title="Безопасность">
          <SettingsItem
            icon="lock"
            iconColor="#3B82F6"
            iconBgColor="#DBEAFE"
            title="PIN-код"
            value={isPinLockEnabled ? "Вкл" : "Выкл"}
            onPress={() => setShowPinSetup(true)}
          />
        </SettingsSection>

        <SettingsSection title="Приложение">
          <SettingsItem
            icon="help-circle"
            iconColor="#8B5CF6"
            iconBgColor="#EDE9FE"
            title="Помощь"
            onPress={() => {}}
          />
          <View style={[styles.itemDivider, { backgroundColor: theme.border }]} />
          <SettingsItem
            icon="info"
            iconColor="#64748B"
            iconBgColor="#F1F5F9"
            title="О приложении"
            value="1.0.0"
            showChevron={false}
          />
        </SettingsSection>

        {((goals.length > 0 || shifts.length > 0) || (!isAnonymous && !isGuestMode)) && (
          <SettingsSection>
            {(goals.length > 0 || shifts.length > 0) && (
              <>
                <SettingsItem
                  icon="trash-2"
                  title="Очистить данные"
                  danger
                  onPress={() => setShowDeleteConfirmation(true)}
                />
                {!isAnonymous && !isGuestMode && (
                  <View style={[styles.itemDivider, { backgroundColor: theme.border }]} />
                )}
              </>
            )}
            {!isAnonymous && !isGuestMode && (
              <SettingsItem
                icon="log-out"
                title="Выйти из аккаунта"
                danger
                onPress={handleLogout}
              />
            )}
          </SettingsSection>
        )}
      </ScrollView>

      <HiddenShiftsModal
        visible={showHiddenShifts}
        onClose={() => setShowHiddenShifts(false)}
      />

      <HiddenGoalsModal
        visible={showHiddenGoals}
        onClose={() => setShowHiddenGoals(false)}
      />

      <AutoAllocationModal
        visible={showAutoAllocation}
        onClose={() => setShowAutoAllocation(false)}
      />

      <DeleteConfirmationModal
        visible={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
      />

      <LinkEmailModal
        visible={showLinkEmail}
        onClose={() => setShowLinkEmail(false)}
        onLink={upgradeGuestToUser}
      />

      <GuestAuthModal
        visible={showGuestAuth}
        onClose={() => setShowGuestAuth(false)}
        signIn={signIn}
        signUp={signUp}
      />

      <PinSetupModal
        visible={showPinSetup}
        onClose={() => setShowPinSetup(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDivider: {
    height: 1,
    marginLeft: 44,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  settingsItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsItemText: {
    flex: 1,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceSettingContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  balanceSettingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  settingsIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  balancePositionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  positionButton: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  positionDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: Spacing.xs,
  },
  linkEmailButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  hideButton: {
    width: 44,
    height: 36,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const modalStyles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  title: {
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  listContainer: {
    maxHeight: 400,
  },
  listContent: {
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
});

const autoAllocationStyles = StyleSheet.create({
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  goalInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  goalIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  input: {
    width: 56,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
  infoSection: {
    marginBottom: Spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopLeftRadius: BorderRadius.sm,
    borderTopRightRadius: BorderRadius.sm,
  },
  infoContent: {
    padding: Spacing.md,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: BorderRadius.sm,
    borderBottomRightRadius: BorderRadius.sm,
  },
  infoCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing["2xl"],
  },
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing.lg,
  },
  fullScreenCloseButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenTitle: {
    flex: 1,
    textAlign: "center",
  },
  fullScreenHeaderSpacer: {
    width: 36,
  },
  fullScreenContent: {
    flex: 1,
  },
  fullScreenContentContainer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  fullScreenFooter: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  fullScreenSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
  },
});

const deleteStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  warningBox: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    marginTop: Spacing.lg,
  },
  phraseBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  input: {
    height: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
  },
});

