import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useRecordEarnings, useGoals } from "@/api";

interface Shift {
  id: string;
  operationType: string;
  shiftType: string;
  scheduledDate: Date | string;
  status: string;
}

interface RecordEarningsModalProps {
  visible: boolean;
  shift: Shift | null;
  onClose: () => void;
}

export function RecordEarningsModal({ visible, shift, onClose }: RecordEarningsModalProps) {
  const { theme } = useTheme();
  
  if (!shift) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <RecordEarningsModalContent shift={shift} onClose={onClose} visible={visible} />
      </View>
    </Modal>
  );
}

function RecordEarningsModalContent({ shift, onClose, visible }: { shift: Shift; onClose: () => void; visible: boolean }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const recordEarnings = useRecordEarnings();
  const { data: goals } = useGoals();

  const [amount, setAmount] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [manuallyEditedGoals, setManuallyEditedGoals] = useState<Set<string>>(new Set());

  const activeGoals = goals?.filter(g => g.status === "active") || [];
  
  const hasAutoAllocationConfig = activeGoals.some(g => (g.allocationPercentage || 0) > 0);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setAllocations({});
      setError("");
      setManuallyEditedGoals(new Set());
    }
  }, [visible]);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, "");
    if (!cleaned) return "";
    const number = parseInt(cleaned, 10);
    return new Intl.NumberFormat("ru-RU").format(number);
  };

  const parseAmount = (text: string) => {
    const cleaned = text.replace(/\s/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const calculateAutoAllocations = (earnedAmount: number, currentAllocations: Record<string, string>, editedGoals: Set<string>) => {
    if (earnedAmount <= 0 || !hasAutoAllocationConfig) return currentAllocations;
    
    const newAllocations: Record<string, string> = { ...currentAllocations };
    
    const goalsToAllocate = activeGoals.filter(g => !editedGoals.has(g.id) && (g.allocationPercentage || 0) > 0);
    
    const totalPercentage = goalsToAllocate.reduce((sum, g) => sum + (g.allocationPercentage || 0), 0);
    
    const scaleFactor = totalPercentage > 100 ? 100 / totalPercentage : 1;
    
    for (const goal of activeGoals) {
      if (editedGoals.has(goal.id)) {
        continue;
      }
      
      const percentage = goal.allocationPercentage || 0;
      if (percentage > 0) {
        const currentAmount = parseFloat(goal.currentAmount) || 0;
        const targetAmount = parseFloat(goal.targetAmount) || 0;
        const goalRemaining = Math.max(0, targetAmount - currentAmount);
        
        const scaledPercentage = percentage * scaleFactor;
        const calculatedAmount = Math.floor(earnedAmount * (scaledPercentage / 100));
        const finalAmount = Math.min(calculatedAmount, goalRemaining);
        
        if (finalAmount > 0) {
          newAllocations[goal.id] = new Intl.NumberFormat("ru-RU").format(finalAmount);
        } else {
          delete newAllocations[goal.id];
        }
      } else {
        delete newAllocations[goal.id];
      }
    }
    
    return newAllocations;
  };

  const handleAmountChange = (text: string) => {
    const formattedAmount = formatAmount(text);
    setAmount(formattedAmount);
    setError("");
    
    if (hasAutoAllocationConfig) {
      const earnedAmount = parseAmount(formattedAmount);
      const autoAllocations = calculateAutoAllocations(earnedAmount, allocations, manuallyEditedGoals);
      setAllocations(autoAllocations);
    }
  };

  const handleAllocationChange = (goalId: string, text: string) => {
    setManuallyEditedGoals(prev => new Set(prev).add(goalId));
    setAllocations(prev => ({
      ...prev,
      [goalId]: formatAmount(text),
    }));
    setError("");
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + parseAmount(val), 0);
  const earnedAmount = parseAmount(amount);
  const remaining = earnedAmount - totalAllocated;

  const handleSubmit = async () => {
    if (earnedAmount <= 0) {
      setError("Введите сумму заработка");
      return;
    }

    if (totalAllocated > earnedAmount) {
      setError("Сумма распределения превышает заработок");
      return;
    }

    try {
      const goalAllocations = Object.entries(allocations)
        .filter(([_, value]) => parseAmount(value) > 0)
        .map(([goalId, value]) => ({
          goalId,
          amount: parseAmount(value).toString(),
        }));

      await recordEarnings.mutateAsync({
        shiftId: shift.id,
        totalEarnings: earnedAmount.toString(),
        allocations: goalAllocations,
      });
      onClose();
    } catch (e) {
      setError("Не удалось записать заработок. Попробуйте ещё раз.");
    }
  };

  const formatShiftInfo = () => {
    const date = new Date(shift.scheduledDate);
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const operation = shift.operationType === "returns" ? "Возвраты" : "Приёмка";
    const time = shift.shiftType === "day" ? "дневная" : "ночная";
    return `${operation} • ${dayName}, ${day} ${month} • ${time}`;
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
          onPress={onClose}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={styles.headerTitle}>
          Записать заработок
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.shiftInfo, { backgroundColor: theme.accentLight }]}>
          <Feather 
            name={shift.shiftType === "day" ? "sun" : "moon"} 
            size={18} 
            color={theme.accent} 
          />
          <ThemedText style={[styles.shiftInfoText, { color: theme.accent }]}>
            {formatShiftInfo()}
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            СУММА ЗАРАБОТКА (₽)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.largeInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            autoFocus
          />
        </View>

        {activeGoals.length > 0 && earnedAmount > 0 && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary, marginBottom: 0 }]}>
                РАСПРЕДЕЛИТЬ ПО ЦЕЛЯМ
              </ThemedText>
              {hasAutoAllocationConfig && manuallyEditedGoals.size < activeGoals.filter(g => (g.allocationPercentage || 0) > 0).length && (
                <View style={[styles.autoTag, { backgroundColor: '#D1FAE5' }]}>
                  <Feather name="zap" size={10} color="#10B981" />
                  <ThemedText type="caption" style={{ color: '#10B981', fontSize: 10 }}>
                    авто
                  </ThemedText>
                </View>
              )}
            </View>
            
            {(() => {
              const goalsToCheck = activeGoals.filter(g => !manuallyEditedGoals.has(g.id) && (g.allocationPercentage || 0) > 0);
              const totalPct = goalsToCheck.reduce((sum, g) => sum + (g.allocationPercentage || 0), 0);
              if (totalPct > 100) {
                return (
                  <View style={[styles.scaleWarning, { backgroundColor: '#FEF3C7' }]}>
                    <Feather name="info" size={12} color="#D97706" />
                    <ThemedText type="caption" style={{ color: '#D97706', marginLeft: 6, flex: 1 }}>
                      Сумма {totalPct}% масштабирована до 100%
                    </ThemedText>
                  </View>
                );
              }
              return null;
            })()}

            <View style={[styles.summaryRow, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={{ color: theme.textSecondary }}>
                Нераспределено:
              </ThemedText>
              <ThemedText 
                style={{ 
                  color: remaining >= 0 ? theme.success : theme.error,
                  fontWeight: "600",
                }}
              >
                {new Intl.NumberFormat("ru-RU").format(remaining)} ₽
              </ThemedText>
            </View>

            {activeGoals.map((goal) => {
              const currentAmount = parseFloat(goal.currentAmount) || 0;
              const targetAmount = parseFloat(goal.targetAmount) || 0;
              const goalRemaining = targetAmount - currentAmount;
              const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
              const hasPercentage = (goal.allocationPercentage || 0) > 0;

              return (
                <View key={goal.id} style={[styles.goalAllocation, { borderColor: theme.border }]}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalNameRow}>
                      <ThemedText style={styles.goalName}>{goal.name}</ThemedText>
                      {hasPercentage && (
                        <ThemedText type="caption" style={{ color: '#10B981', marginLeft: Spacing.xs }}>
                          {goal.allocationPercentage}%
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {progress}% • осталось {new Intl.NumberFormat("ru-RU").format(goalRemaining)} ₽
                    </ThemedText>
                  </View>
                  <TextInput
                    style={[
                      styles.allocationInput,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    value={allocations[goal.id] || ""}
                    onChangeText={(text) => handleAllocationChange(goal.id, text)}
                    keyboardType="numeric"
                  />
                </View>
              );
            })}
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
            { backgroundColor: theme.success },
            Shadows.fab,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            recordEarnings.isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={recordEarnings.isPending}
        >
          {recordEarnings.isPending ? (
            <ThemedText style={[styles.submitButtonText, { color: "#FFFFFF" }]}>
              Сохранение...
            </ThemedText>
          ) : (
            <>
              <Feather
                name="check"
                size={18}
                color="#FFFFFF"
                style={styles.submitButtonIcon}
              />
              <ThemedText style={[styles.submitButtonText, { color: "#FFFFFF" }]}>
                Записать заработок
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
  shiftInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  shiftInfoText: {
    fontSize: 14,
    fontWeight: "500",
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
  largeInput: {
    height: 60,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  goalAllocation: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  autoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scaleWarning: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  goalHeader: {
    marginBottom: Spacing.md,
  },
  goalNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  allocationInput: {
    height: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
    textAlign: "center",
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
});
