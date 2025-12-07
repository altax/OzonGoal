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
import { useEarningsStats, useGoals, type StatsPeriod } from "@/api";

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
  onBarPress,
}: { 
  data: { label: string; value: number; date: string }[];
  color: string;
  bgColor: string;
  onBarPress?: (index: number) => void;
}) {
  const { theme } = useTheme();
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = data.length > 0 ? total / data.filter(d => d.value > 0).length : 0;
  
  return (
    <View>
      <View style={styles.barChart}>
        {data.map((item, i) => {
          const heightPct = Math.max((item.value / max) * 100, 6);
          const isLast = i === data.length - 1;
          const isMax = item.value === max && item.value > 0;
          const isAboveAvg = item.value > avg;
          return (
            <Pressable 
              key={i} 
              style={styles.barCol}
              onPress={() => onBarPress?.(i)}
            >
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
                    backgroundColor: isMax ? theme.success : isLast ? color : bgColor,
                  }
                ]} 
              />
              <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>
                {item.label}
              </ThemedText>
              {isAboveAvg && item.value > 0 && (
                <View style={[styles.barDot, { backgroundColor: theme.success }]} />
              )}
            </Pressable>
          );
        })}
      </View>
      {avg > 0 && (
        <View style={styles.avgRow}>
          <View style={[styles.avgLine, { backgroundColor: theme.border }]} />
          <ThemedText style={[styles.avgText, { color: theme.textSecondary }]}>
            Ср: {formatK(avg)} ₽
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function GoalProgress({ 
  name, 
  current, 
  target,
  color,
  isClosest,
}: { 
  name: string;
  current: number;
  target: number;
  color: string;
  isClosest: boolean;
}) {
  const { theme } = useTheme();
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  
  return (
    <View style={[styles.goalItem, isClosest && { backgroundColor: theme.successLight, borderRadius: 8, padding: 8, margin: -8, marginBottom: 4 }]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <ThemedText style={styles.goalName} numberOfLines={1}>{name}</ThemedText>
        {isClosest && (
          <View style={[styles.closestBadge, { backgroundColor: theme.success }]}>
            <Feather name="star" size={8} color="#FFF" />
          </View>
        )}
        <ThemedText style={[styles.goalPct, { color: pct >= 100 ? theme.success : theme.textSecondary }]}>
          {pct}%
        </ThemedText>
      </View>
      <View style={[styles.goalBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.goalAmounts}>
        <ThemedText style={[styles.goalAmount, { color: theme.textSecondary }]}>
          {formatK(current)} ₽
        </ThemedText>
        <ThemedText style={[styles.goalAmount, { color: theme.textSecondary }]}>
          {formatK(target)} ₽
        </ThemedText>
      </View>
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
  const { data: goals } = useGoals();
  
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
      return Array(7).fill(null).map(() => ({ label: '', value: 0, date: '' }));
    }
    const last7 = stats.dailyEarningsHistory.slice(-7);
    while (last7.length < 7) last7.unshift({ date: new Date().toISOString(), amount: 0 });
    return last7.map(d => ({ label: formatDay(d.date), value: d.amount, date: d.date }));
  }, [stats?.dailyEarningsHistory]);

  const activeGoals = useMemo(() => {
    if (!goals) return [];
    return goals.filter(g => g.status === 'active').slice(0, 5);
  }, [goals]);

  const closestGoalId = useMemo(() => {
    if (!activeGoals.length) return null;
    let closest = activeGoals[0];
    let closestPct = 0;
    for (const g of activeGoals) {
      const current = parseFloat(String(g.currentAmount)) || 0;
      const target = parseFloat(String(g.targetAmount)) || 1;
      const pct = current / target;
      if (pct > closestPct && pct < 1) {
        closestPct = pct;
        closest = g;
      }
    }
    return closest?.id;
  }, [activeGoals]);

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

      <View style={[styles.card, styles.chartCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>Доход по дням</ThemedText>
        <BarChart data={chartData} color={theme.accent} bgColor={theme.accentLight} />
      </View>

      {activeGoals.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Цели</ThemedText>
            {closestGoalId && (
              <View style={styles.closestHint}>
                <Feather name="star" size={10} color={theme.success} />
                <ThemedText style={[styles.closestHintText, { color: theme.success }]}>ближайшая</ThemedText>
              </View>
            )}
          </View>
          {activeGoals.map((goal) => (
            <GoalProgress
              key={goal.id}
              name={goal.name}
              current={parseFloat(String(goal.currentAmount)) || 0}
              target={parseFloat(String(goal.targetAmount)) || 0}
              color={goal.iconColor || theme.accent}
              isClosest={goal.id === closestGoalId}
            />
          ))}
        </View>
      )}

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
    marginBottom: Spacing.lg,
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
  chartCard: {
    paddingTop: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
    marginTop: Spacing.md,
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
    width: 18,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  barDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  avgLine: {
    flex: 1,
    height: 1,
  },
  avgText: {
    fontSize: 10,
    marginLeft: Spacing.sm,
  },
  goalItem: {
    marginBottom: Spacing.sm,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  goalName: {
    flex: 1,
    fontSize: 13,
  },
  goalPct: {
    fontSize: 12,
    fontWeight: "600",
  },
  goalBar: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  goalFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  goalAmount: {
    fontSize: 10,
  },
  closestBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  closestHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  closestHintText: {
    fontSize: 10,
    marginLeft: 3,
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
