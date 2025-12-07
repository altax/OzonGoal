import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useEarningsStats, type StatsPeriod } from "@/api";

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.0', '') + "М";
  }
  if (amount >= 1000) {
    return Math.round(amount / 1000) + "К";
  }
  return String(Math.round(amount));
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount)) + " ₽";
}

type PeriodOption = { key: StatsPeriod; label: string };
const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
];

function MiniSparkline({ 
  data, 
  color,
  height = 40,
}: { 
  data: number[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;
  
  return (
    <View style={[styles.sparkline, { height }]}>
      {data.map((value, i) => (
        <View 
          key={i} 
          style={[
            styles.sparkBar,
            { 
              height: `${Math.max((value / max) * 100, 8)}%`,
              width: `${barWidth - 2}%`,
              backgroundColor: color,
              opacity: i === data.length - 1 ? 1 : 0.4,
            }
          ]} 
        />
      ))}
    </View>
  );
}

function StatRow({ 
  icon, 
  label, 
  value, 
  color,
  bgColor,
}: { 
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <ThemedText type="body" style={{ flex: 1, color: theme.textSecondary }}>{label}</ThemedText>
      <ThemedText type="h4">{value}</ThemedText>
    </View>
  );
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const { data: stats, isLoading, error, refetch } = useEarningsStats(period);
  
  const activeIndex = PERIOD_OPTIONS.findIndex(p => p.key === period);
  const indicatorX = useSharedValue(activeIndex);
  
  const handlePeriodChange = (newPeriod: StatsPeriod, index: number) => {
    indicatorX.value = withTiming(index, { duration: 200, easing: Easing.out(Easing.cubic) });
    setPeriod(newPeriod);
  };
  
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: `${(indicatorX.value / 3) * 100}%`,
  }));

  const sparkData = useMemo(() => {
    if (!stats?.dailyEarningsHistory) return [0, 0, 0, 0, 0, 0, 0];
    const last7 = stats.dailyEarningsHistory.slice(-7);
    while (last7.length < 7) last7.unshift({ date: '', amount: 0 });
    return last7.map(d => d.amount);
  }, [stats?.dailyEarningsHistory]);

  const progressPercent = stats?.goalsProgressPercent || 0;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Feather name="wifi-off" size={40} color={theme.textSecondary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          Нет подключения
        </ThemedText>
        <Pressable 
          style={[styles.retryBtn, { backgroundColor: theme.accent }]}
          onPress={() => refetch()}
        >
          <ThemedText type="small" style={{ color: "#FFF" }}>Повторить</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundContent }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing["3xl"] + insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.periodTabs, { backgroundColor: theme.backgroundSecondary }]}>
        <Animated.View 
          style={[
            styles.periodIndicator, 
            { backgroundColor: theme.backgroundContent },
            animatedIndicatorStyle,
          ]} 
        />
        {PERIOD_OPTIONS.map((option, index) => (
          <Pressable
            key={option.key}
            style={styles.periodTab}
            onPress={() => handlePeriodChange(option.key, index)}
          >
            <ThemedText
              type="small"
              style={{
                color: period === option.key ? theme.text : theme.textSecondary,
                fontWeight: period === option.key ? "600" : "400",
              }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.heroSection}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Заработано
        </ThemedText>
        <View style={styles.heroRow}>
          <ThemedText style={styles.heroAmount}>
            {formatFullCurrency(stats?.totalEarnings || 0)}
          </ThemedText>
          {stats?.completedShiftsCount ? (
            <View style={[styles.shiftsBadge, { backgroundColor: theme.accentLight }]}>
              <ThemedText type="caption" style={{ color: theme.accent }}>
                {stats.completedShiftsCount} {stats.completedShiftsCount === 1 ? 'смена' : 'смен'}
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        <MiniSparkline data={sparkData} color={theme.accent} />
      </View>

      <View style={[styles.progressCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.progressHeader}>
          <View style={[styles.progressIcon, { backgroundColor: theme.successLight }]}>
            <Feather name="target" size={18} color={theme.success} />
          </View>
          <View style={styles.progressInfo}>
            <ThemedText type="body">Прогресс целей</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {progressPercent}% выполнено
            </ThemedText>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: theme.success,
              }
            ]} 
          />
        </View>
      </View>

      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <StatRow
          icon="trending-up"
          label="Средний заработок"
          value={formatCurrency(stats?.averagePerShift || 0) + " ₽"}
          color={theme.accent}
          bgColor={theme.accentLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatRow
          icon="calendar"
          label="Запланировано"
          value={String(stats?.shiftsByType.future || 0)}
          color={theme.warning}
          bgColor={theme.warningLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatRow
          icon="credit-card"
          label="Свободный баланс"
          value={formatCurrency(stats?.freeBalance || 0) + " ₽"}
          color={theme.success}
          bgColor={theme.successLight}
        />
      </View>

      {stats?.streak && stats.streak > 0 ? (
        <View style={[styles.streakBanner, { backgroundColor: theme.warningLight }]}>
          <Feather name="zap" size={18} color={theme.warning} />
          <ThemedText type="body" style={{ color: theme.warning, marginLeft: Spacing.sm, fontWeight: "600" }}>
            {stats.streak} {stats.streak === 1 ? 'день' : stats.streak < 5 ? 'дня' : 'дней'} подряд
          </ThemedText>
        </View>
      ) : null}

      {stats?.daysToGoalForecast && stats.daysToGoalForecast > 0 ? (
        <View style={[styles.forecastBanner, { backgroundColor: theme.accentLight }]}>
          <Feather name="flag" size={16} color={theme.accent} />
          <ThemedText type="small" style={{ color: theme.accent, marginLeft: Spacing.sm }}>
            До цели примерно {stats.daysToGoalForecast} дней
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  periodTabs: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 3,
    marginBottom: Spacing.xl,
    position: "relative",
  },
  periodIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "33.33%",
    borderRadius: BorderRadius.xs,
  },
  periodTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
  },
  shiftsBadge: {
    marginLeft: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sparkBar: {
    borderRadius: 3,
  },
  progressCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  progressInfo: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  forecastBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
});
