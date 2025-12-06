import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Card } from "@/components/Card";

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

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
          Статистика
        </ThemedText>
        <View style={styles.periodSelector}>
          <Pressable 
            style={({ pressed }) => [
              styles.periodButton, 
              styles.periodButtonActive, 
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.9 },
            ]}
          >
            <ThemedText type="small" style={styles.periodButtonActiveText}>
              Месяц
            </ThemedText>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.periodButton, 
              { backgroundColor: theme.backgroundDefault },
              Shadows.cardLight,
              pressed && { opacity: 0.8 },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Год
            </ThemedText>
          </Pressable>
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Доходы</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.successLight }]}>
              <Feather name="trending-up" size={18} color={theme.success} />
            </View>
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Здесь будет график
            </ThemedText>
          </View>
        </Card>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Всего смен
            </ThemedText>
            <ThemedText type="h3" style={[styles.metricValue, { color: theme.accent }]}>
              0
            </ThemedText>
          </Card>
          <Card style={styles.metricCard}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Средний доход
            </ThemedText>
            <ThemedText type="h3" style={[styles.metricValue, { color: theme.accent }]}>
              0 ₽
            </ThemedText>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Прогресс целей</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
              <Feather name="target" size={18} color={theme.accent} />
            </View>
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="pie-chart" size={48} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Здесь будет диаграмма
            </ThemedText>
          </View>
        </Card>
      </ScrollView>
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
  periodSelector: {
    flexDirection: "row",
    marginBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  periodButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  periodButtonActive: {},
  periodButtonActiveText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  chartCard: {
    marginBottom: Spacing.xl,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  chartPlaceholder: {
    height: 180,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  metricCard: {
    flex: 1,
  },
  metricValue: {
    marginTop: Spacing.sm,
  },
});
