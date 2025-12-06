import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BalanceHeader } from "@/components/BalanceHeader";
import { Card } from "@/components/Card";

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHeader />
        
        <View style={styles.periodSelector}>
          <View style={[styles.periodButton, styles.periodButtonActive, { backgroundColor: theme.accent }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Месяц
            </ThemedText>
          </View>
          <View style={[styles.periodButton, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Год
            </ThemedText>
          </View>
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Доходы</ThemedText>
            <Feather name="trending-up" size={20} color={theme.success} />
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Здесь будет график
            </ThemedText>
          </View>
        </Card>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Всего смен
            </ThemedText>
            <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
              0
            </ThemedText>
          </Card>
          <Card style={styles.metricCard}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Средний доход
            </ThemedText>
            <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
              0
            </ThemedText>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Прогресс целей</ThemedText>
            <Feather name="target" size={20} color={theme.accent} />
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="pie-chart" size={48} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
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
  periodSelector: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  periodButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  periodButtonActive: {},
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  chartPlaceholder: {
    height: 160,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    flex: 1,
  },
});
