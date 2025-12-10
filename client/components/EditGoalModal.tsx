import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useUpdateGoal, useDeleteGoal, useSetPrimaryGoal, useEarningsStats } from "@/api";

interface Goal {
  id: string;
  name: string;
  targetAmount: string | number;
  currentAmount: string | number;
  iconKey: string;
  iconColor: string;
  iconBgColor: string;
  status: string;
  isPrimary?: boolean;
  deadline?: Date | null;
}

interface EditGoalModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
}

const iconOptions: { key: string; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: "target", icon: "target", label: "Цель" },
  { key: "send", icon: "send", label: "Поездка" },
  { key: "monitor", icon: "monitor", label: "Техника" },
  { key: "home", icon: "home", label: "Дом" },
  { key: "truck", icon: "truck", label: "Авто" },
  { key: "heart", icon: "heart", label: "Здоровье" },
  { key: "gift", icon: "gift", label: "Подарок" },
  { key: "book", icon: "book-open", label: "Учёба" },
  { key: "briefcase", icon: "briefcase", label: "Работа" },
  { key: "star", icon: "star", label: "Мечта" },
  { key: "dollar", icon: "dollar-sign", label: "Деньги" },
  { key: "credit", icon: "credit-card", label: "Карта" },
  { key: "shopping", icon: "shopping-cart", label: "Покупки" },
  { key: "camera", icon: "camera", label: "Фото" },
  { key: "music", icon: "music", label: "Музыка" },
  { key: "smartphone", icon: "smartphone", label: "Телефон" },
  { key: "watch", icon: "watch", label: "Часы" },
  { key: "coffee", icon: "coffee", label: "Кофе" },
  { key: "globe", icon: "globe", label: "Мир" },
  { key: "umbrella", icon: "umbrella", label: "Зонт" },
  { key: "map", icon: "map-pin", label: "Место" },
  { key: "award", icon: "award", label: "Награда" },
  { key: "zap", icon: "zap", label: "Энергия" },
  { key: "sun", icon: "sun", label: "Солнце" },
];

function formatAmountStatic(value: string | number): string {
  const text = String(value ?? "");
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return "";
  const number = parseInt(cleaned, 10);
  return new Intl.NumberFormat("ru-RU").format(number);
}

export function EditGoalModal({ visible, goal, onClose }: EditGoalModalProps) {
  const { theme } = useTheme();
  
  if (!goal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <EditGoalModalContent goal={goal} onClose={onClose} />
      </View>
    </Modal>
  );
}

function formatDeadlineForDisplay(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseDeadlineInput(input: string): Date | null {
  const cleaned = input.replace(/[^\d]/g, '');
  if (cleaned.length < 8) return null;
  const day = parseInt(cleaned.substring(0, 2), 10);
  const month = parseInt(cleaned.substring(2, 4), 10) - 1;
  const year = parseInt(cleaned.substring(4, 8), 10);
  
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2024) {
    return null;
  }
  
  const date = new Date(year, month, day, 23, 59, 59);
  
  if (isNaN(date.getTime())) return null;
  
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date.getTime() < today.getTime()) return null;
  
  return date;
}

function formatDeadlineInput(text: string): string {
  const cleaned = text.replace(/[^\d]/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.substring(0, 2)}.${cleaned.substring(2)}`;
  return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 4)}.${cleaned.substring(4, 8)}`;
}

function EditGoalModalContent({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const setPrimaryGoal = useSetPrimaryGoal();
  const { data: earningsStats } = useEarningsStats('month');

  const isCompleted = goal.status === "completed";

  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(formatAmountStatic(goal.targetAmount));
  const [currentAmount, setCurrentAmount] = useState(formatAmountStatic(goal.currentAmount));
  const [selectedIcon, setSelectedIcon] = useState(goal.iconKey || "target");
  const [useDeadline, setUseDeadline] = useState(!!goal.deadline);
  const [deadlineInput, setDeadlineInput] = useState(formatDeadlineForDisplay(goal.deadline));
  const [error, setError] = useState("");

  const smartDeadlineInfo = useMemo(() => {
    const target = parseFloat(targetAmount.replace(/\s/g, "").replace(",", ".")) || 0;
    const current = parseFloat(currentAmount.replace(/\s/g, "").replace(",", ".")) || 0;
    const remaining = Math.max(0, target - current);
    
    const avgPerShift = earningsStats?.averagePerShift || 0;
    const hasEarningsData = avgPerShift > 0;
    
    if (remaining <= 0) {
      return { shiftsNeeded: 0, shiftsPerWeek: 0, weeksToGoal: 0, deadlineDate: null, dailyEarningsNeeded: 0, daysUntilDeadline: 0, hasEarningsData };
    }
    
    const shiftsNeeded = hasEarningsData ? Math.ceil(remaining / avgPerShift) : 0;
    const deadlineDate = parseDeadlineInput(deadlineInput);
    
    if (!deadlineDate) {
      return { shiftsNeeded, shiftsPerWeek: 0, weeksToGoal: 0, deadlineDate: null, dailyEarningsNeeded: 0, daysUntilDeadline: 0, hasEarningsData };
    }
    
    const now = new Date();
    const daysUntilDeadline = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksToGoal = Math.max(1, daysUntilDeadline / 7);
    const shiftsPerWeek = hasEarningsData ? Math.ceil(shiftsNeeded / weeksToGoal) : 0;
    const dailyEarningsNeeded = Math.ceil(remaining / daysUntilDeadline);
    
    return { shiftsNeeded, shiftsPerWeek, weeksToGoal: Math.ceil(weeksToGoal), deadlineDate, dailyEarningsNeeded, daysUntilDeadline, hasEarningsData };
  }, [targetAmount, currentAmount, deadlineInput, earningsStats?.averagePerShift]);

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Введите название цели");
      return;
    }

    const target = parseFloat(targetAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(target) || target <= 0) {
      setError("Введите корректную целевую сумму");
      return;
    }

    let current = parseFloat(currentAmount.replace(/\s/g, "").replace(",", ".")) || 0;

    if (current > target) {
      setError("Сумма накопления не может превышать целевую сумму");
      return;
    }

    const shouldBeCompleted = current >= target;
    const newStatus = shouldBeCompleted ? "completed" : "active";

    if (useDeadline) {
      if (deadlineInput.length < 10) {
        setError("Введите полную дату дедлайна (ДД.ММ.ГГГГ)");
        return;
      }
      if (!smartDeadlineInfo.deadlineDate) {
        setError("Укажите корректную дату в будущем");
        return;
      }
    }

    try {
      const deadlineDate = useDeadline ? parseDeadlineInput(deadlineInput) : null;
      await updateGoal.mutateAsync({
        id: goal.id,
        name: name.trim(),
        targetAmount: target.toString(),
        currentAmount: current.toString(),
        iconKey: selectedIcon,
        status: newStatus,
        deadline: deadlineDate ? deadlineDate.toISOString() : null,
      });
      handleClose();
    } catch (e) {
      setError("Не удалось обновить цель. Попробуйте ещё раз.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Удалить цель?",
      `Вы уверены, что хотите удалить цель "${goal.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoal.mutateAsync(goal.id);
              handleClose();
            } catch (e) {
              setError("Не удалось удалить цель");
            }
          },
        },
      ]
    );
  };

  const handleTogglePrimary = async () => {
    try {
      if (goal.isPrimary) {
        await updateGoal.mutateAsync({
          id: goal.id,
          isPrimary: false,
        });
      } else {
        await setPrimaryGoal.mutateAsync(goal.id);
      }
      handleClose();
    } catch (e) {
      setError("Не удалось изменить статус закрепления");
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return new Intl.NumberFormat("ru-RU").format(number);
  };

  const handleAmountChange = (setter: (value: string) => void) => (text: string) => {
    setter(formatAmount(text));
    setError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: theme.backgroundSecondary },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleClose}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={styles.headerTitle}>
          {isCompleted ? "Просмотр цели" : "Редактировать"}
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.errorLight },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>

      {isCompleted && (
        <View style={[styles.completedBanner, { backgroundColor: theme.successLight || '#D1FAE5' }]}>
          <Feather name="check-circle" size={18} color={theme.success || '#10B981'} />
          <ThemedText style={{ color: theme.success || '#10B981', marginLeft: Spacing.sm, fontWeight: '500' }}>
            Цель достигнута! Редактирование недоступно.
          </ThemedText>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            НАЗВАНИЕ ЦЕЛИ
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Например: Отпуск в Турции"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError("");
            }}
            editable={!isCompleted}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            ЦЕЛЕВАЯ СУММА (₽)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="100 000"
            placeholderTextColor={theme.textSecondary}
            value={targetAmount}
            onChangeText={handleAmountChange(setTargetAmount)}
            keyboardType="numeric"
            editable={!isCompleted}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            НАКОПЛЕНО (₽)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            value={currentAmount}
            onChangeText={handleAmountChange(setCurrentAmount)}
            keyboardType="numeric"
            editable={!isCompleted}
          />
        </View>

        {!isCompleted && (
        <View style={styles.inputGroup}>
          <View style={styles.deadlineToggleRow}>
            <View style={styles.deadlineToggleLeft}>
              <Feather name="calendar" size={18} color={theme.accent} />
              <ThemedText style={[styles.deadlineToggleLabel, { color: theme.text }]}>
                Дедлайн
              </ThemedText>
            </View>
            <Switch
              value={useDeadline}
              onValueChange={(value) => {
                setUseDeadline(value);
                if (!value) {
                  setDeadlineInput("");
                }
              }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          {useDeadline && (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                    marginTop: Spacing.md,
                  },
                ]}
                placeholder="31.12.2025"
                placeholderTextColor={theme.textSecondary}
                value={deadlineInput}
                onChangeText={(text) => {
                  setDeadlineInput(formatDeadlineInput(text));
                  setError("");
                }}
                keyboardType="numeric"
                maxLength={10}
              />
              
              {smartDeadlineInfo.deadlineDate && smartDeadlineInfo.hasEarningsData && smartDeadlineInfo.shiftsNeeded > 0 && (
                <View style={[styles.smartDeadlineInfo, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.sm }]}>
                  <Feather name="briefcase" size={16} color={theme.textSecondary} />
                  <View style={styles.smartDeadlineTextContainer}>
                    <ThemedText style={[styles.smartDeadlineText, { color: theme.text }]}>
                      <ThemedText style={{ fontWeight: '600', color: theme.accent }}>
                        {smartDeadlineInfo.shiftsPerWeek}
                      </ThemedText>
                      {' смен/нед за '}
                      <ThemedText style={{ fontWeight: '600' }}>
                        {smartDeadlineInfo.weeksToGoal}
                      </ThemedText>
                      {' нед'}
                    </ThemedText>
                  </View>
                </View>
              )}
              
              {!smartDeadlineInfo.hasEarningsData && (
                <View style={[styles.smartDeadlineInfo, { backgroundColor: theme.warningLight || '#FEF3C7', marginTop: Spacing.xs }]}>
                  <Feather name="info" size={16} color={theme.warning || '#F59E0B'} />
                  <ThemedText style={[styles.smartDeadlineText, { color: theme.textSecondary }]}>
                    Нет данных о заработке. Завершите смены для расчёта.
                  </ThemedText>
                </View>
              )}
              
              {deadlineInput.length === 10 && !smartDeadlineInfo.deadlineDate && (
                <ThemedText type="small" style={[styles.deadlineHint, { color: theme.warning || '#F59E0B' }]}>
                  Укажите дату в будущем
                </ThemedText>
              )}
            </>
          )}
        </View>
        )}

        {!isCompleted && (
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            ИКОНКА
          </ThemedText>
          <View style={styles.iconGrid}>
            {iconOptions.map((option) => {
              const isSelected = selectedIcon === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.iconOption,
                    {
                      backgroundColor: isSelected
                        ? theme.accent
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedIcon(option.key)}
                >
                  <Feather
                    name={option.icon}
                    size={24}
                    color={isSelected ? "#FFFFFF" : theme.accent}
                  />
                  <ThemedText
                    type="caption"
                    style={[
                      styles.iconLabel,
                      { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
        )}

        {!isCompleted && (
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { 
                backgroundColor: goal.isPrimary ? theme.accentLight : theme.backgroundSecondary,
                borderColor: goal.isPrimary ? theme.accent : theme.border,
              },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleTogglePrimary}
          >
            <Feather
              name="bookmark"
              size={18}
              color={goal.isPrimary ? theme.accent : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.actionButtonText,
                { color: goal.isPrimary ? theme.accent : theme.textSecondary },
              ]}
            >
              {goal.isPrimary ? "Открепить" : "Закрепить"}
            </ThemedText>
          </Pressable>
        </View>
        )}

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorLight }]}>
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
              {error}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {!isCompleted && (
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: theme.accent },
            Shadows.fab,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            updateGoal.isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={updateGoal.isPending}
        >
          {updateGoal.isPending ? (
            <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
              Сохранение...
            </ThemedText>
          ) : (
            <>
              <Feather
                name="check"
                size={18}
                color={theme.buttonText}
                style={styles.submitButtonIcon}
              />
              <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
                Сохранить изменения
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
      )}

      {isCompleted && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.backgroundSecondary },
              pressed && { opacity: 0.9 },
            ]}
            onPress={handleClose}
          >
            <Feather name="x" size={18} color={theme.text} style={styles.submitButtonIcon} />
            <ThemedText style={[styles.submitButtonText, { color: theme.text }]}>
              Закрыть
            </ThemedText>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  deleteButton: {
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  iconOption: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  iconLabel: {
    fontSize: 11,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing.lg,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: BorderRadius.sm,
  },
  submitButtonIcon: {
    marginRight: Spacing.sm,
  },
  submitButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  smartDeadlineInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  smartDeadlineTextContainer: {
    flex: 1,
  },
  smartDeadlineText: {
    fontSize: 13,
    lineHeight: 18,
  },
  deadlineHint: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  deadlineToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  deadlineToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deadlineToggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing["2xl"],
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
