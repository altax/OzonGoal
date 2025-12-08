import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useShifts, useUpdateShift, useGoals, useHiddenGoals, useUpdateGoal, useDeleteAllHiddenShifts, useDeleteAllHiddenGoals } from "@/api";

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
    const confirmed = window.confirm(
      "Вы уверены, что хотите удалить все скрытые смены? Это действие нельзя отменить."
    );
    
    if (confirmed) {
      try {
        await deleteAllHiddenShifts.mutateAsync();
        onClose();
      } catch (error) {
        window.alert("Не удалось удалить смены");
      }
    }
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
    const confirmed = window.confirm(
      "Вы уверены, что хотите удалить все скрытые цели? Это действие нельзя отменить."
    );
    
    if (confirmed) {
      try {
        await deleteAllHiddenGoals.mutateAsync();
        onClose();
      } catch (error) {
        window.alert("Не удалось удалить цели");
      }
    }
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            Автораспределение
          </ThemedText>
          <Pressable onPress={onClose} style={modalStyles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={autoAllocationStyles.infoSection}>
          <View style={[autoAllocationStyles.infoHeader, { backgroundColor: theme.accentLight }]}>
            <Feather name="info" size={16} color={theme.accent} />
            <ThemedText type="body" style={{ color: theme.accent, fontWeight: '600', marginLeft: Spacing.sm }}>
              Как это работает
            </ThemedText>
          </View>
          <View style={[autoAllocationStyles.infoContent, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>
              • Укажите процент от заработка для каждой цели{'\n'}
              • При записи смены суммы заполнятся автоматически{'\n'}
              • Если сумма превысит остаток до цели — начислится только недостающая часть{'\n'}
              • Если общий % больше 100% — суммы масштабируются пропорционально{'\n'}
              • Вы всегда можете изменить значения вручную
            </ThemedText>
          </View>
        </View>

        <ScrollView
          style={modalStyles.listContainer}
          contentContainerStyle={modalStyles.listContent}
          showsVerticalScrollIndicator={false}
        >
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
                      backgroundColor: theme.backgroundSecondary,
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
                          backgroundColor: theme.backgroundContent,
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

              <Pressable
                style={({ pressed }) => [
                  autoAllocationStyles.saveButton,
                  { backgroundColor: theme.accent },
                  (pressed || saving) && { opacity: 0.7 },
                ]}
                onPress={handleSave}
                disabled={saving || totalPercentage > 100}
              >
                <ThemedText type="body" style={{ color: '#fff', fontWeight: '600' }}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </BlurView>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [showHiddenShifts, setShowHiddenShifts] = useState(false);
  const [showHiddenGoals, setShowHiddenGoals] = useState(false);
  const [showAutoAllocation, setShowAutoAllocation] = useState(false);
  const { data: shifts = [] } = useShifts();
  const { data: goals = [] } = useGoals();
  const { data: hiddenGoals = [] } = useHiddenGoals();

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
          paddingTop: Spacing.xl,
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.accentLight }]}>
            <Feather name="user" size={20} color={theme.accent} />
          </View>
          <ThemedText type="body" style={{ fontWeight: '600' }}>Пользователь</ThemedText>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <SettingsItem
          icon="pie-chart"
          iconColor="#10B981"
          iconBgColor="#D1FAE5"
          title="Автораспределение"
          value={totalAllocationPercentage > 0 ? `${totalAllocationPercentage}%` : "Выкл"}
          onPress={() => setShowAutoAllocation(true)}
        />

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <SettingsItem
          icon="eye-off"
          title="Скрытые смены"
          value={hiddenShiftsCount > 0 ? `${hiddenShiftsCount}` : undefined}
          onPress={() => setShowHiddenShifts(true)}
        />
        <SettingsItem
          icon="eye-off"
          title="Скрытые цели"
          value={hiddenGoals.length > 0 ? `${hiddenGoals.length}` : undefined}
          onPress={() => setShowHiddenGoals(true)}
        />

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <SettingsItem
          icon="moon"
          title="Тема"
          value="Авто"
        />
        <SettingsItem
          icon="globe"
          title="Язык"
          value="Русский"
        />
        <SettingsItem
          icon="bell"
          title="Уведомления"
        />

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <SettingsItem
          icon="download"
          title="Экспорт"
        />
        <SettingsItem
          icon="help-circle"
          title="Помощь"
        />
        <SettingsItem
          icon="info"
          title="О приложении"
          value="1.0.0"
          showChevron={false}
        />

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <SettingsItem
          icon="trash-2"
          title="Очистить данные"
          danger
        />
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
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: 1,
    marginVertical: Spacing.md,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  settingsItemIcon: {
    width: 28,
    height: 28,
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
});
