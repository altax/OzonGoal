import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useUpdateGoal, useGoals } from "@/api";

interface Goal {
  id: string;
  name: string;
  targetAmount: string | number;
  currentAmount: string | number;
  iconKey: string;
  status: string;
  deadline?: Date | null;
}

interface DeadlineWarningModalProps {
  visible: boolean;
  goal: Goal | null;
  averageEarnings: number;
  onClose: () => void;
  onGoalUpdated?: () => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount));
}

export function DeadlineWarningModal({
  visible,
  goal,
  averageEarnings,
  onClose,
  onGoalUpdated,
}: DeadlineWarningModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const updateGoal = useUpdateGoal();
  const { data: allGoals } = useGoals();

  const [selectedTransferGoalId, setSelectedTransferGoalId] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState(0);
  const [showTransferOptions, setShowTransferOptions] = useState(false);

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      setSelectedTransferGoalId(null);
      setTransferAmount(0);
      setShowTransferOptions(false);
    }
  }, [visible]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const calculations = useMemo(() => {
    if (!goal || !goal.deadline) return null;

    const target = parseFloat(String(goal.targetAmount)) || 0;
    const current = parseFloat(String(goal.currentAmount)) || 0;
    const remaining = Math.max(0, target - current);

    const deadlineDate = new Date(goal.deadline);
    const today = new Date();
    deadlineDate.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);

    const daysLeft = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyNeeded = Math.ceil(remaining / daysLeft);
    const progress = target > 0 ? (current / target) * 100 : 0;

    const canAchieve = averageEarnings > 0 && dailyNeeded <= averageEarnings * 1.5;
    const riskLevel = dailyNeeded > averageEarnings * 2 ? 'high' : dailyNeeded > averageEarnings ? 'medium' : 'low';

    return {
      target,
      current,
      remaining,
      daysLeft,
      dailyNeeded,
      progress,
      canAchieve,
      riskLevel,
    };
  }, [goal, averageEarnings]);

  const otherGoalsWithBalance = useMemo(() => {
    if (!allGoals || !goal) return [];
    return allGoals.filter(g => 
      g.id !== goal.id && 
      g.status === 'active' && 
      parseFloat(String(g.currentAmount)) >= 1000
    );
  }, [allGoals, goal]);

  const handleExtendDeadline = async (days: number) => {
    if (!goal || !goal.deadline) return;

    const newDeadline = new Date(goal.deadline);
    newDeadline.setDate(newDeadline.getDate() + days);

    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        deadline: newDeadline.toISOString(),
      });
      onGoalUpdated?.();
      Alert.alert(
        "Дедлайн продлён",
        `Новый дедлайн: ${newDeadline.toLocaleDateString('ru-RU')}`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось продлить дедлайн");
    }
  };

  const handleTransferBalance = async () => {
    if (!selectedTransferGoalId || !goal || transferAmount <= 0) return;

    const sourceGoal = otherGoalsWithBalance.find(g => g.id === selectedTransferGoalId);
    if (!sourceGoal) return;

    const sourceAmount = parseFloat(String(sourceGoal.currentAmount)) || 0;
    const minBalance = 500;
    const maxTransfer = Math.max(0, sourceAmount - minBalance);
    const actualTransfer = Math.min(transferAmount, maxTransfer);

    if (actualTransfer <= 0) {
      Alert.alert("Ошибка", "Недостаточно средств для переноса");
      return;
    }

    try {
      await updateGoal.mutateAsync({
        id: sourceGoal.id,
        currentAmount: (sourceAmount - actualTransfer).toString(),
      });

      const currentGoalAmount = parseFloat(String(goal.currentAmount)) || 0;
      await updateGoal.mutateAsync({
        id: goal.id,
        currentAmount: (currentGoalAmount + actualTransfer).toString(),
      });

      onGoalUpdated?.();
      Alert.alert(
        "Баланс перенесён",
        `${formatAmount(actualTransfer)} ₽ перенесено с цели "${sourceGoal.name}"`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось перенести баланс");
    }
  };

  const handleRemoveDeadline = async () => {
    if (!goal) return;

    Alert.alert(
      "Снять дедлайн?",
      "Вы сможете продолжить накопление без временного ограничения",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Снять",
          onPress: async () => {
            try {
              await updateGoal.mutateAsync({
                id: goal.id,
                deadline: null,
              });
              onGoalUpdated?.();
              onClose();
            } catch (e) {
              Alert.alert("Ошибка", "Не удалось снять дедлайн");
            }
          },
        },
      ]
    );
  };

  const handleCloseGoalIncomplete = async () => {
    if (!goal) return;
    const goalAmount = parseFloat(String(goal.currentAmount)) || 0;

    if (otherGoalsWithBalance.length > 0 && goalAmount > 0) {
      Alert.alert(
        "Закрыть цель?",
        `Накоплено ${formatAmount(goalAmount)} ₽. Куда направить эти средства?`,
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "На другие цели",
            onPress: async () => {
              const perGoal = Math.floor(goalAmount / otherGoalsWithBalance.length);
              try {
                for (const g of otherGoalsWithBalance) {
                  const current = parseFloat(String(g.currentAmount)) || 0;
                  await updateGoal.mutateAsync({
                    id: g.id,
                    currentAmount: (current + perGoal).toString(),
                  });
                }
                await updateGoal.mutateAsync({
                  id: goal.id,
                  status: "hidden",
                  currentAmount: "0",
                });
                onGoalUpdated?.();
                Alert.alert(
                  "Готово",
                  `${formatAmount(perGoal * otherGoalsWithBalance.length)} ₽ распределено по ${otherGoalsWithBalance.length} целям`,
                  [{ text: "OK", onPress: onClose }]
                );
              } catch (e) {
                Alert.alert("Ошибка", "Не удалось распределить средства");
              }
            },
          },
          {
            text: "Удалить цель",
            style: "destructive",
            onPress: async () => {
              try {
                await updateGoal.mutateAsync({
                  id: goal.id,
                  status: "hidden",
                });
                onGoalUpdated?.();
                onClose();
              } catch (e) {
                Alert.alert("Ошибка", "Не удалось закрыть цель");
              }
            },
          },
        ]
      );
    } else if (goalAmount > 0) {
      Alert.alert(
        "Закрыть цель?",
        `Накоплено ${formatAmount(goalAmount)} ₽. Нет других активных целей для переноса. Средства останутся в свободном балансе.`,
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Закрыть",
            style: "destructive",
            onPress: async () => {
              try {
                await updateGoal.mutateAsync({
                  id: goal.id,
                  status: "hidden",
                });
                onGoalUpdated?.();
                onClose();
              } catch (e) {
                Alert.alert("Ошибка", "Не удалось закрыть цель");
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Закрыть цель?",
        "Цель будет скрыта из списка активных",
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Закрыть",
            style: "destructive",
            onPress: async () => {
              try {
                await updateGoal.mutateAsync({
                  id: goal.id,
                  status: "hidden",
                });
                onGoalUpdated?.();
                onClose();
              } catch (e) {
                Alert.alert("Ошибка", "Не удалось закрыть цель");
              }
            },
          },
        ]
      );
    }
  };

  if (!goal || !calculations) return null;

  const getRiskColor = () => {
    switch (calculations.riskLevel) {
      case 'high': return { bg: '#FEE2E2', text: '#DC2626', icon: '#DC2626' };
      case 'medium': return { bg: '#FEF3C7', text: '#D97706', icon: '#D97706' };
      default: return { bg: '#D1FAE5', text: '#059669', icon: '#059669' };
    }
  };

  const riskColors = getRiskColor();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable
            style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={onClose}
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="h4" style={styles.headerTitle}>
            Внимание к дедлайну
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.alertCard, { backgroundColor: riskColors.bg }, pulseAnimatedStyle]}>
            <Feather name="alert-triangle" size={24} color={riskColors.icon} />
            <View style={styles.alertTextContainer}>
              <ThemedText style={[styles.alertTitle, { color: riskColors.text }]}>
                {calculations.daysLeft === 0 ? 'Дедлайн сегодня!' : 
                 calculations.daysLeft === 1 ? 'Остался 1 день!' :
                 `Осталось ${calculations.daysLeft} дня`}
              </ThemedText>
              <ThemedText style={[styles.alertSubtitle, { color: theme.textSecondary }]}>
                Цель: {goal.name}
              </ThemedText>
            </View>
          </Animated.View>

          <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="caption" style={[styles.statsLabel, { color: theme.textSecondary }]}>
              ОСТАЛОСЬ НАКОПИТЬ
            </ThemedText>
            <ThemedText style={[styles.statsValue, { color: theme.text }]}>
              {formatAmount(calculations.remaining)} ₽
            </ThemedText>

            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(calculations.progress, 100)}%` }]}
              />
            </View>
            <ThemedText type="small" style={[styles.progressText, { color: theme.textSecondary }]}>
              {formatAmount(calculations.current)} / {formatAmount(calculations.target)} ₽ ({Math.floor(calculations.progress)}%)
            </ThemedText>
          </View>

          <View style={[styles.calculationCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <View style={styles.calculationRow}>
              <View style={styles.calculationItem}>
                <ThemedText type="caption" style={[styles.calcLabel, { color: theme.textSecondary }]}>
                  НУЖНО В ДЕНЬ
                </ThemedText>
                <ThemedText style={[styles.calcValue, { color: theme.accent }]}>
                  {formatAmount(calculations.dailyNeeded)} ₽
                </ThemedText>
              </View>
              <View style={styles.calculationDivider} />
              <View style={styles.calculationItem}>
                <ThemedText type="caption" style={[styles.calcLabel, { color: theme.textSecondary }]}>
                  ВАШ СРЕДНИЙ
                </ThemedText>
                <ThemedText style={[styles.calcValue, { color: theme.text }]}>
                  {averageEarnings > 0 ? `${formatAmount(averageEarnings)} ₽` : '—'}
                </ThemedText>
              </View>
            </View>

            {averageEarnings > 0 && (
              <View style={[styles.riskIndicator, { backgroundColor: riskColors.bg }]}>
                <Feather 
                  name={calculations.riskLevel === 'low' ? 'check-circle' : 'alert-circle'} 
                  size={16} 
                  color={riskColors.icon} 
                />
                <ThemedText style={[styles.riskText, { color: riskColors.text }]}>
                  {calculations.riskLevel === 'high' && 'Высокий риск: нужно в 2+ раза больше среднего'}
                  {calculations.riskLevel === 'medium' && 'Средний риск: нужно больше среднего'}
                  {calculations.riskLevel === 'low' && 'Цель достижима при текущем темпе'}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ВАРИАНТЫ ДЕЙСТВИЙ
          </ThemedText>

          <Pressable
            style={[styles.actionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={() => handleExtendDeadline(7)}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name="calendar" size={20} color={theme.accent} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Продлить на неделю
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Добавить 7 дней к дедлайну
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.actionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={() => handleExtendDeadline(14)}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name="calendar" size={20} color={theme.accent} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Продлить на 2 недели
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Добавить 14 дней к дедлайну
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          {otherGoalsWithBalance.length > 0 && (
            <>
              <Pressable
                style={[styles.actionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                onPress={() => setShowTransferOptions(!showTransferOptions)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Feather name="repeat" size={20} color="#059669" />
                </View>
                <View style={styles.actionContent}>
                  <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                    Перенести с других целей
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {otherGoalsWithBalance.length} цел{otherGoalsWithBalance.length === 1 ? 'ь' : 'и'} с балансом
                  </ThemedText>
                </View>
                <Feather name={showTransferOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
              </Pressable>

              {showTransferOptions && (
                <View style={[styles.transferOptions, { backgroundColor: theme.backgroundSecondary }]}>
                  {otherGoalsWithBalance.map(g => {
                    const amount = parseFloat(String(g.currentAmount)) || 0;
                    const maxTransfer = Math.max(0, amount - 500);
                    const isSelected = selectedTransferGoalId === g.id;

                    return (
                      <Pressable
                        key={g.id}
                        style={[
                          styles.transferGoalItem,
                          { 
                            backgroundColor: isSelected ? theme.accentLight : theme.backgroundDefault,
                            borderColor: isSelected ? theme.accent : theme.border,
                          }
                        ]}
                        onPress={() => {
                          setSelectedTransferGoalId(g.id);
                          setTransferAmount(Math.min(calculations.remaining, maxTransfer));
                        }}
                      >
                        <View style={styles.transferGoalInfo}>
                          <ThemedText style={{ color: theme.text, fontWeight: '500' }}>
                            {g.name}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            Доступно: {formatAmount(maxTransfer)} ₽
                          </ThemedText>
                        </View>
                        {isSelected && (
                          <Feather name="check-circle" size={20} color={theme.accent} />
                        )}
                      </Pressable>
                    );
                  })}

                  {selectedTransferGoalId && (
                    <Pressable
                      style={[styles.transferButton, { backgroundColor: theme.accent }, Shadows.fab]}
                      onPress={handleTransferBalance}
                    >
                      <Feather name="check" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.transferButtonText}>
                        Перенести {formatAmount(transferAmount)} ₽
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}

          <Pressable
            style={[styles.actionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={handleRemoveDeadline}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.warningLight || '#FEF3C7' }]}>
              <Feather name="clock" size={20} color={theme.warning || '#D97706'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={[styles.actionTitle, { color: theme.text }]}>
                Снять дедлайн
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Продолжить копить без срока
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          {calculations.daysLeft <= 1 && (
            <Pressable
              style={[styles.actionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.error }]}
              onPress={handleCloseGoalIncomplete}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.errorLight }]}>
                <Feather name="x-circle" size={20} color={theme.error} />
              </View>
              <View style={styles.actionContent}>
                <ThemedText style={[styles.actionTitle, { color: theme.error }]}>
                  Закрыть как невыполненную
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {calculations.current > 0 
                    ? 'Перераспределить накопленное' 
                    : 'Скрыть цель из списка'}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.error} />
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    paddingTop: Spacing.md,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  alertSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statsLabel: {
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    marginTop: Spacing.sm,
  },
  calculationCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  calculationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  calculationItem: {
    flex: 1,
    alignItems: "center",
  },
  calculationDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: Spacing.md,
  },
  calcLabel: {
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calcValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  riskIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  riskText: {
    flex: 1,
    fontSize: 13,
  },
  sectionTitle: {
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  transferOptions: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    marginTop: -Spacing.sm,
    gap: Spacing.sm,
  },
  transferGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  transferGoalInfo: {
    flex: 1,
  },
  transferButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  transferButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
