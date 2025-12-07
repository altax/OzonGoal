import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useShifts, useUpdateShift, useHiddenGoals, useUpdateGoal, useDeleteAllHiddenShifts, useDeleteAllHiddenGoals } from "@/api";

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
          backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundContent,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingsItemIcon, { backgroundColor: finalIconBgColor }]}>
        <Feather name={icon} size={18} color={finalIconColor} />
      </View>
      <View style={styles.settingsItemContent}>
        <ThemedText type="body" style={[danger && { color: "#EF4444" }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.settingsItemRight}>
        {value && (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {value}
          </ThemedText>
        )}
        {showChevron && (
          <Feather name="chevron-right" size={18} color={theme.textSecondary} style={{ marginLeft: Spacing.sm }} />
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
          paddingTop: Spacing.xl,
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileSection, { backgroundColor: theme.backgroundContent }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.accentLight }]}>
            <Feather name="user" size={28} color={theme.accent} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText type="h4">Пользователь</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Управление профилем
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <SettingsItem
          icon="eye-off"
          title="Скрытые смены"
          subtitle="Восстановить или удалить"
          value={hiddenShiftsCount > 0 ? `${hiddenShiftsCount}` : undefined}
          onPress={() => setShowHiddenShifts(true)}
        />

        <SettingsItem
          icon="eye-off"
          title="Скрытые цели"
          subtitle="Восстановить или удалить"
          value={hiddenGoals.length > 0 ? `${hiddenGoals.length}` : undefined}
          onPress={() => setShowHiddenGoals(true)}
        />

        <View style={styles.sectionDivider} />

        <SettingsItem
          icon="moon"
          title="Оформление"
          value="Системная"
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

        <View style={styles.sectionDivider} />

        <SettingsItem
          icon="download"
          title="Экспорт данных"
        />

        <SettingsItem
          icon="help-circle"
          title="Помощь"
        />

        <SettingsItem
          icon="info"
          title="О приложении"
          value="v1.0.0"
          showChevron={false}
        />

        <View style={styles.sectionDivider} />

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
    paddingVertical: Spacing.lg,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  sectionDivider: {
    height: Spacing.lg,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  settingsItemContent: {
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
