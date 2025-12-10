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
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useCreateGoal, useEarningsStats } from "@/api";

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
}

const iconOptions: { key: string; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: "target", icon: "target", label: "Цель" },
  { key: "send", icon: "send", label: "Путешествие" },
  { key: "monitor", icon: "monitor", label: "Техника" },
  { key: "home", icon: "home", label: "Дом" },
  { key: "truck", icon: "truck", label: "Авто" },
  { key: "heart", icon: "heart", label: "Здоровье" },
  { key: "gift", icon: "gift", label: "Подарок" },
  { key: "book", icon: "book-open", label: "Обучение" },
  { key: "briefcase", icon: "briefcase", label: "Работа" },
  { key: "star", icon: "star", label: "Мечта" },
];

export function AddGoalModal({ visible, onClose }: AddGoalModalProps) {
  const { theme } = useTheme();
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <AddGoalModalContent onClose={onClose} />
      </View>
    </Modal>
  );
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

function AddGoalModalContent({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const createGoal = useCreateGoal();
  const { data: earningsStats } = useEarningsStats('month');

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("target");
  const [error, setError] = useState("");
  const [useDeadline, setUseDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [manualAvgPerShift, setManualAvgPerShift] = useState("");

  const hasStatsData = (earningsStats?.averagePerShift || 0) > 0;

  const smartDeadlineInfo = useMemo(() => {
    const target = parseFloat(targetAmount.replace(/\s/g, "").replace(",", ".")) || 0;
    const remaining = Math.max(0, target);
    const deadlineDate = parseDeadlineInput(deadlineInput);
    
    if (remaining <= 0 || !deadlineDate) {
      return { shiftsNeeded: 0, shiftsPerWeek: 0, weeksToGoal: 0, deadlineDate, dailyEarningsNeeded: 0, daysUntilDeadline: 0 };
    }
    
    const now = new Date();
    const daysUntilDeadline = Math.max(1, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyEarningsNeeded = Math.ceil(remaining / daysUntilDeadline);
    
    const statsAvg = earningsStats?.averagePerShift || 0;
    const manualAvg = parseFloat(manualAvgPerShift.replace(/\s/g, "").replace(",", ".")) || 0;
    const avgPerShift = statsAvg > 0 ? statsAvg : manualAvg;
    
    if (avgPerShift <= 0) {
      return { shiftsNeeded: 0, shiftsPerWeek: 0, weeksToGoal: 0, deadlineDate, dailyEarningsNeeded, daysUntilDeadline };
    }
    
    const shiftsNeeded = Math.ceil(remaining / avgPerShift);
    const weeksToGoal = Math.max(1, daysUntilDeadline / 7);
    const shiftsPerWeek = Math.ceil(shiftsNeeded / weeksToGoal);
    
    return { shiftsNeeded, shiftsPerWeek, weeksToGoal: Math.ceil(weeksToGoal), deadlineDate, dailyEarningsNeeded, daysUntilDeadline };
  }, [targetAmount, deadlineInput, earningsStats?.averagePerShift, manualAvgPerShift]);

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setSelectedIcon("target");
    setError("");
    setUseDeadline(false);
    setDeadlineInput("");
    setManualAvgPerShift("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Введите название цели");
      return;
    }

    const amount = parseFloat(targetAmount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

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
      await createGoal.mutateAsync({
        name: name.trim(),
        targetAmount: amount.toString(),
        iconKey: selectedIcon,
        iconColor: "#3B82F6",
        iconBgColor: "#E0E7FF",
        deadline: deadlineDate ? deadlineDate.toISOString() : null,
      });
      handleClose();
    } catch (e) {
      setError("Не удалось создать цель. Попробуйте ещё раз.");
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return new Intl.NumberFormat("ru-RU").format(number);
  };

  const handleAmountChange = (text: string) => {
    setTargetAmount(formatAmount(text));
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
          Новая цель
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

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
            autoFocus
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
            onChangeText={handleAmountChange}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.deadlineToggleRow}>
            <View style={styles.deadlineToggleLeft}>
              <Feather name="calendar" size={18} color={theme.accent} />
              <ThemedText style={[styles.deadlineToggleLabel, { color: theme.text }]}>
                Установить дедлайн
              </ThemedText>
            </View>
            <Switch
              value={useDeadline}
              onValueChange={setUseDeadline}
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
              {smartDeadlineInfo.deadlineDate && smartDeadlineInfo.shiftsPerWeek > 0 && (
                <View style={[styles.smartDeadlineInfo, { backgroundColor: theme.successLight || '#D1FAE5' }]}>
                  <Feather name="calendar" size={16} color={theme.success || '#10B981'} />
                  <View style={styles.smartDeadlineTextContainer}>
                    <ThemedText style={[styles.smartDeadlineText, { color: theme.text }]}>
                      {'Примерно '}
                      <ThemedText style={{ fontWeight: '600', color: theme.success || '#10B981' }}>
                        {smartDeadlineInfo.shiftsPerWeek} {smartDeadlineInfo.shiftsPerWeek === 1 ? 'смена' : smartDeadlineInfo.shiftsPerWeek < 5 ? 'смены' : 'смен'}/нед
                      </ThemedText>
                      {' (всего '}
                      <ThemedText style={{ fontWeight: '600' }}>
                        {smartDeadlineInfo.shiftsNeeded}
                      </ThemedText>
                      {' смен)'}
                    </ThemedText>
                  </View>
                </View>
              )}
              {!hasStatsData && targetAmount && smartDeadlineInfo.deadlineDate && (
                <View style={[styles.manualInputSection, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <View style={styles.manualInputHeader}>
                    <Feather name="edit-3" size={14} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                      РУЧНОЙ РАСЧЁТ
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={[styles.manualInputHint, { color: theme.textSecondary }]}>
                    Пока нет данных о заработках, укажите примерный заработок за смену для расчёта
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                        borderColor: theme.border,
                        marginTop: Spacing.sm,
                      },
                    ]}
                    placeholder="Например: 5 000 ₽"
                    placeholderTextColor={theme.textSecondary}
                    value={manualAvgPerShift}
                    onChangeText={(text) => {
                      setManualAvgPerShift(formatAmount(text));
                      setError("");
                    }}
                    keyboardType="numeric"
                  />
                  <View style={[styles.manualInputNote, { backgroundColor: theme.warningLight || '#FEF3C7' }]}>
                    <Feather name="info" size={12} color={theme.warning || '#F59E0B'} />
                    <ThemedText type="small" style={{ color: theme.warning || '#F59E0B', marginLeft: Spacing.xs, flex: 1 }}>
                      После завершения первых смен расчёт будет автоматическим
                    </ThemedText>
                  </View>
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

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.errorLight }]}>
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText type="small" style={[styles.errorText, { color: theme.error }]}>
              {error}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

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
            createGoal.isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={createGoal.isPending}
        >
          {createGoal.isPending ? (
            <ThemedText style={[styles.submitButtonText, { color: theme.buttonText }]}>
              Создание...
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
                Создать цель
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
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
  manualInputSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  manualInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  manualInputHint: {
    marginBottom: Spacing.xs,
  },
  manualInputNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
});
