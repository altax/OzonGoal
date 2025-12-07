import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Card } from "@/components/Card";
import { useShifts, useUpdateShift, useHiddenGoals, useUpdateGoal, useDeleteAllHiddenShifts, useDeleteAllHiddenGoals } from "@/api";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingsItem({ icon, title, value, onPress, showChevron = true }: SettingsItemProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        { 
          backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
          borderBottomColor: theme.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsItemIcon, { backgroundColor: theme.accentLight }]}>
          <Feather name={icon} size={18} color={theme.accent} />
        </View>
        <ThemedText type="body">{title}</ThemedText>
      </View>
      <View style={styles.settingsItemRight}>
        {value ? (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
            {value}
          </ThemedText>
        ) : null}
        {showChevron ? (
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
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

  const handleDeleteAll = () => {
    Alert.alert(
      "Удалить все",
      "Вы уверены, что хотите удалить все скрытые смены? Это действие нельзя отменить.",
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
          }
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
      style={hiddenShiftsStyles.blurContainer}
    >
      <Pressable style={hiddenShiftsStyles.overlay} onPress={onClose} />
      
      <View
        style={[
          hiddenShiftsStyles.modalContent,
          {
            backgroundColor: theme.backgroundContent,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={hiddenShiftsStyles.handle} />
        
        <View style={hiddenShiftsStyles.header}>
          <ThemedText type="h4" style={hiddenShiftsStyles.title}>
            Скрытые смены
          </ThemedText>
          <Pressable onPress={onClose} style={hiddenShiftsStyles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={hiddenShiftsStyles.listContainer}
          contentContainerStyle={hiddenShiftsStyles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {hiddenShifts.length === 0 ? (
            <View style={hiddenShiftsStyles.emptyState}>
              <View style={[hiddenShiftsStyles.emptyIcon, { backgroundColor: theme.accentLight }]}>
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
                    hiddenShiftsStyles.shiftItem,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={hiddenShiftsStyles.shiftItemLeft}>
                    <View style={[hiddenShiftsStyles.shiftTypeIcon, { backgroundColor: theme.accentLight }]}>
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
                      hiddenShiftsStyles.restoreButton,
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
                  hiddenShiftsStyles.deleteAllButton,
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

const hiddenShiftsStyles = StyleSheet.create({
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
  shiftItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  shiftItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  shiftTypeIcon: {
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

  const handleDeleteAll = () => {
    Alert.alert(
      "Удалить все",
      "Вы уверены, что хотите удалить все скрытые цели? Это действие нельзя отменить.",
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
          }
        },
      ]
    );
  };

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={hiddenShiftsStyles.blurContainer}
    >
      <Pressable style={hiddenShiftsStyles.overlay} onPress={onClose} />
      
      <View
        style={[
          hiddenShiftsStyles.modalContent,
          {
            backgroundColor: theme.backgroundContent,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={hiddenShiftsStyles.handle} />
        
        <View style={hiddenShiftsStyles.header}>
          <ThemedText type="h4" style={hiddenShiftsStyles.title}>
            Скрытые цели
          </ThemedText>
          <Pressable onPress={onClose} style={hiddenShiftsStyles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={hiddenShiftsStyles.listContainer}
          contentContainerStyle={hiddenShiftsStyles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {hiddenGoals.length === 0 ? (
            <View style={hiddenShiftsStyles.emptyState}>
              <View style={[hiddenShiftsStyles.emptyIcon, { backgroundColor: theme.accentLight }]}>
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
                    hiddenShiftsStyles.shiftItem,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={hiddenShiftsStyles.shiftItemLeft}>
                    <View style={[hiddenShiftsStyles.shiftTypeIcon, { backgroundColor: goal.iconBgColor || theme.accentLight }]}>
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
                        {Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100)}% выполнено
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      hiddenShiftsStyles.restoreButton,
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
                  hiddenShiftsStyles.deleteAllButton,
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [showHiddenShifts, setShowHiddenShifts] = useState(false);
  const [showHiddenGoals, setShowHiddenGoals] = useState(false);
  const { data: shifts = [] } = useShifts();
  const { data: hiddenGoals = [] } = useHiddenGoals();

  const hiddenShiftsCount = useMemo(() => {
    return shifts.filter(s => s.status === "canceled").length;
  }, [shifts]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing["2xl"],
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h3" style={styles.screenTitle}>
          Настройки
        </ThemedText>
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={[styles.avatar, { backgroundColor: theme.accentLight }]}>
              <Feather name="user" size={32} color={theme.accent} />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="h4">Пользователь</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Нажмите для редактирования
              </ThemedText>
            </View>
            <View style={[styles.chevronBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </View>
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ОСНОВНЫЕ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="dollar-sign" title="Валюта" value="RUB" />
          <SettingsItem icon="globe" title="Язык" value="Русский" />
          <SettingsItem icon="bell" title="Уведомления" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ВНЕШНИЙ ВИД
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="moon" title="Тема" value="Системная" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          СМЕНЫ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem 
            icon="eye-off" 
            title="Скрытые смены" 
            value={hiddenShiftsCount > 0 ? `${hiddenShiftsCount}` : undefined}
            onPress={() => setShowHiddenShifts(true)}
          />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ЦЕЛИ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem 
            icon="eye-off" 
            title="Скрытые цели" 
            value={hiddenGoals.length > 0 ? `${hiddenGoals.length}` : undefined}
            onPress={() => setShowHiddenGoals(true)}
          />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          ДАННЫЕ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="download" title="Экспорт данных" />
          <SettingsItem icon="trash-2" title="Очистить данные" />
        </Card>

        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          О ПРИЛОЖЕНИИ
        </ThemedText>
        <Card style={styles.settingsGroup}>
          <SettingsItem icon="info" title="Версия" value="1.0.0" showChevron={false} />
          <SettingsItem icon="help-circle" title="Помощь" />
        </Card>
      </ScrollView>

      <HiddenShiftsModal
        visible={showHiddenShifts}
        onClose={() => setShowHiddenShifts(false)}
      />

      <HiddenGoalsModal
        visible={showHiddenGoals}
        onClose={() => setShowHiddenGoals(false)}
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
  screenTitle: {
    marginBottom: Spacing["2xl"],
  },
  profileCard: {
    marginBottom: Spacing["2xl"],
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
  },
  settingsGroup: {
    marginBottom: Spacing["2xl"],
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
