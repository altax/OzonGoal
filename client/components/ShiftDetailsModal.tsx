import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface Shift {
  id: string;
  operationType: string;
  shiftType: string;
  scheduledDate: Date | string;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  status: string;
  earnings: string | null;
}

interface ShiftDetailsModalProps {
  visible: boolean;
  shift: Shift | null;
  onClose: () => void;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Запланирована",
    in_progress: "В процессе",
    completed: "Завершена",
    canceled: "Отменена",
    no_show: "Неявка",
  };
  return labels[status] || status;
}

export function ShiftDetailsModal({ visible, shift, onClose }: ShiftDetailsModalProps) {
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
        <ShiftDetailsModalContent shift={shift} onClose={onClose} />
      </View>
    </Modal>
  );
}

function ShiftDetailsModalContent({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const operationLabel = shift.operationType === "returns" ? "Возвраты" : "Приёмка";
  const shiftTypeLabel = shift.shiftType === "day" ? "Дневная смена" : "Ночная смена";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
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
          Детали смены
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
          <Feather
            name={shift.shiftType === "day" ? "sun" : "moon"}
            size={32}
            color={theme.accent}
          />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {operationLabel}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {shiftTypeLabel}
        </ThemedText>

        <View style={styles.detailsContainer}>
          <View style={[styles.detailRow, { borderColor: theme.border }]}>
            <View style={styles.detailLabel}>
              <Feather name="calendar" size={18} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary }}>Дата</ThemedText>
            </View>
            <ThemedText style={styles.detailValue}>
              {formatDate(shift.scheduledDate)}
            </ThemedText>
          </View>

          <View style={[styles.detailRow, { borderColor: theme.border }]}>
            <View style={styles.detailLabel}>
              <Feather name="clock" size={18} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary }}>Время</ThemedText>
            </View>
            <ThemedText style={styles.detailValue}>
              {formatTime(shift.scheduledStart)} - {formatTime(shift.scheduledEnd)}
            </ThemedText>
          </View>

          <View style={[styles.detailRow, { borderColor: theme.border }]}>
            <View style={styles.detailLabel}>
              <Feather name="info" size={18} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary }}>Статус</ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: theme.successLight }]}>
              <ThemedText style={[styles.statusText, { color: theme.success }]}>
                {getStatusLabel(shift.status)}
              </ThemedText>
            </View>
          </View>

          {shift.status === "completed" && shift.earnings && (
            <View style={[styles.earningsContainer, { backgroundColor: theme.successLight }]}>
              <Feather name="dollar-sign" size={24} color={theme.success} />
              <View style={styles.earningsInfo}>
                <ThemedText style={[styles.earningsLabel, { color: theme.success }]}>
                  Заработок
                </ThemedText>
                <ThemedText style={[styles.earningsAmount, { color: theme.success }]}>
                  {new Intl.NumberFormat("ru-RU").format(parseFloat(shift.earnings))} ₽
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingTop: Spacing["2xl"],
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: Spacing["3xl"],
    textAlign: "center",
  },
  detailsContainer: {
    width: "100%",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailValue: {
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontWeight: "500",
    fontSize: 13,
  },
  earningsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing["2xl"],
    gap: Spacing.lg,
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
});
