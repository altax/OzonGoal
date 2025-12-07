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

function formatK(amount: number): string {
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1).replace('.0', '') + "К";
  }
  return String(Math.round(amount));
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(amount)) + " ₽";
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return days[d.getDay()];
}

type PeriodOption = { key: StatsPeriod; label: string };
const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
];

function BarChart({ 
  data, 
  color,
  bgColor,
}: { 
  data: { label: string; value: number }[];
  color: string;
  bgColor: string;
}) {
  const { theme } = useTheme();
  const max = Math.max(...data.map(d => d.value), 1);
  
  return (
    <View style={styles.barChart}>
      {data.map((item, i) => {
        const heightPct = Math.max((item.value / max) * 100, 6);
        const isLast = i === data.length - 1;
        return (
          <View key={i} style={styles.barCol}>
            {item.value > 0 && (
              <ThemedText style={[styles.barValue, { color: isLast ? color : theme.textSecondary }]}>
                {formatK(item.value)}
              </ThemedText>
            )}
            <View 
              style={[
                styles.bar,
                { 
                  height: `${heightPct}%`,
                  backgroundColor: isLast ? color : bgColor,
                }
              ]} 
            />
            <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>
              {item.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function StatItem({ 
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
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
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
    indicatorX.value = withTiming(index, { duration: 180, easing: Easing.out(Easing.cubic) });
    setPeriod(newPeriod);
  };
  
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: `${(indicatorX.value / 3) * 100}%`,
  }));

  const chartData = useMemo(() => {
    if (!stats?.dailyEarningsHistory) {
      return Array(7).fill(null).map((_, i) => ({ label: '', value: 0 }));
    }
    const last7 = stats.dailyEarningsHistory.slice(-7);
    while (last7.length < 7) last7.unshift({ date: new Date().toISOString(), amount: 0 });
    return last7.map(d => ({ label: formatDay(d.date), value: d.amount }));
  }, [stats?.dailyEarningsHistory]);

  const progressPct = stats?.goalsProgressPercent || 0;

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
        <Feather name="wifi-off" size={32} color={theme.textSecondary} />
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontSize: 14 }}>
          Нет подключения
        </ThemedText>
        <Pressable 
          style={[styles.retryBtn, { backgroundColor: theme.accent }]}
          onPress={() => refetch()}
        >
          <ThemedText style={{ color: "#FFF", fontSize: 13 }}>Повторить</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundContent }]}
      contentContainerStyle={{
        paddingTop: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl + insets.bottom,
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
              style={[
                styles.periodText,
                { color: period === option.key ? theme.text : theme.textSecondary },
                period === option.key && { fontWeight: "600" },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.heroSection}>
        <ThemedText style={[styles.heroLabel, { color: theme.textSecondary }]}>Заработано</ThemedText>
        <View style={styles.heroRow}>
          <ThemedText style={styles.heroAmount}>
            {formatFullCurrency(stats?.totalEarnings || 0)}
          </ThemedText>
          {stats?.completedShiftsCount ? (
            <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
              <ThemedText style={[styles.badgeText, { color: theme.accent }]}>
                {stats.completedShiftsCount} смен
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <BarChart data={chartData} color={theme.accent} bgColor={theme.accentLight} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.progressRow}>
          <View style={[styles.progressIcon, { backgroundColor: theme.successLight }]}>
            <Feather name="target" size={14} color={theme.success} />
          </View>
          <ThemedText style={styles.progressLabel}>Прогресс целей</ThemedText>
          <ThemedText style={[styles.progressPct, { color: theme.success }]}>{progressPct}%</ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: theme.success }]} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <StatItem
          icon="trending-up"
          label="Средний"
          value={formatK(stats?.averagePerShift || 0) + " ₽"}
          color={theme.accent}
          bgColor={theme.accentLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatItem
          icon="calendar"
          label="Запланировано"
          value={String(stats?.shiftsByType.future || 0)}
          color={theme.warning}
          bgColor={theme.warningLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatItem
          icon="credit-card"
          label="Баланс"
          value={formatK(stats?.freeBalance || 0) + " ₽"}
          color={theme.success}
          bgColor={theme.successLight}
        />
      </View>

      {stats?.streak && stats.streak > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.warningLight }]}>
          <Feather name="zap" size={14} color={theme.warning} />
          <ThemedText style={[styles.bannerText, { color: theme.warning }]}>
            {stats.streak} {stats.streak === 1 ? 'день' : stats.streak < 5 ? 'дня' : 'дней'} подряд
          </ThemedText>
        </View>
      ) : null}

      {stats?.daysToGoalForecast && stats.daysToGoalForecast > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.accentLight }]}>
          <Feather name="flag" size={14} color={theme.accent} />
          <ThemedText style={[styles.bannerText, { color: theme.accent }]}>
            До цели ~{stats.daysToGoalForecast} дней
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
    borderRadius: 8,
    padding: 2,
    marginBottom: Spacing.md,
    position: "relative",
  },
  periodIndicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    width: "33.33%",
    borderRadius: 6,
  },
  periodTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    zIndex: 1,
  },
  periodText: {
    fontSize: 12,
  },
  heroSection: {
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  badge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  card: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 90,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  progressLabel: {
    flex: 1,
    fontSize: 13,
  },
  progressPct: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: 10,
    marginBottom: 6,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
