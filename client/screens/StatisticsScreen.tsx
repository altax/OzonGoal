import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useEarningsStats, type StatsPeriod } from "@/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " ₽";
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.0', '') + "М ₽";
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1).replace('.0', '') + "К ₽";
  }
  return amount + " ₽";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  return days[date.getDay()];
}

type PeriodOption = { key: StatsPeriod; label: string };
const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "week", label: "7 дней" },
  { key: "month", label: "30 дней" },
  { key: "year", label: "Год" },
];

function MiniBarChart({ 
  data, 
  maxValue, 
  barColor,
  accentColor,
}: { 
  data: { label: string; value: number }[];
  maxValue: number;
  barColor: string;
  accentColor: string;
}) {
  const { theme } = useTheme();
  const maxIdx = data.reduce((maxI, item, idx, arr) => 
    item.value > arr[maxI].value ? idx : maxI, 0);
  
  return (
    <View style={styles.miniChart}>
      <View style={styles.miniChartBars}>
        {data.map((item, index) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 56 : 4;
          const isMax = index === maxIdx && item.value > 0;
          return (
            <View key={index} style={styles.miniBarCol}>
              <View 
                style={[
                  styles.miniBar, 
                  { 
                    height: Math.max(4, height),
                    backgroundColor: isMax ? accentColor : barColor,
                    opacity: isMax ? 1 : 0.6,
                  }
                ]} 
              />
              <ThemedText type="caption" style={[styles.miniBarLabel, { color: theme.textSecondary }]}>
                {item.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatBadge({ 
  value, 
  label, 
  icon,
  color,
  bgColor,
}: { 
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bgColor: string;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.statBadge, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.statBadgeIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <View style={styles.statBadgeContent}>
        <ThemedText type="h4" style={styles.statBadgeValue}>{value}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>{label}</ThemedText>
      </View>
    </View>
  );
}

function GoalMiniProgress({ 
  name, 
  progress, 
  current, 
  target,
  color,
}: { 
  name: string;
  progress: number;
  current: number;
  target: number;
  color: string;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.goalMiniItem}>
      <View style={styles.goalMiniHeader}>
        <View style={[styles.goalMiniDot, { backgroundColor: color }]} />
        <ThemedText type="small" numberOfLines={1} style={styles.goalMiniName}>{name}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {progress}%
        </ThemedText>
      </View>
      <View style={[styles.goalMiniBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View 
          style={[
            styles.goalMiniFill, 
            { 
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: color,
            }
          ]} 
        />
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const { data: stats, isLoading, error, refetch } = useEarningsStats(period);
  
  const indicatorPosition = useSharedValue(1);
  
  const handlePeriodChange = (newPeriod: StatsPeriod) => {
    const index = PERIOD_OPTIONS.findIndex(p => p.key === newPeriod);
    indicatorPosition.value = withTiming(index, {
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    setPeriod(newPeriod);
  };
  
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value * ((SCREEN_WIDTH - Spacing["2xl"] * 2 - 8) / 3) }],
  }));
  
  const barChartData = useMemo(() => {
    if (!stats?.dailyEarningsHistory) return [];
    const last7 = stats.dailyEarningsHistory.slice(-7);
    return last7.map(d => ({
      label: formatDate(d.date),
      value: d.amount,
    }));
  }, [stats?.dailyEarningsHistory]);
  
  const maxBarValue = useMemo(() => {
    return Math.max(...barChartData.map(d => d.value), 1);
  }, [barChartData]);

  const topGoals = useMemo(() => {
    if (!stats?.goalDistribution) return [];
    return stats.goalDistribution.slice(0, 3);
  }, [stats?.goalDistribution]);

  const trendPercent = useMemo(() => {
    if (!stats) return null;
    if (stats.previousPeriodAverage <= 0) return null;
    const diff = ((stats.averagePerShift - stats.previousPeriodAverage) / stats.previousPeriodAverage) * 100;
    return {
      value: Math.abs(Math.round(diff)),
      isPositive: diff >= 0,
    };
  }, [stats]);

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
        <View style={[styles.errorBox, { backgroundColor: theme.errorLight }]}>
          <Feather name="wifi-off" size={32} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error, marginTop: Spacing.md }}>
            Нет подключения
          </ThemedText>
          <Pressable 
            style={[styles.retryBtn, { backgroundColor: theme.error }]}
            onPress={() => refetch()}
          >
            <ThemedText type="small" style={{ color: "#FFF" }}>Повторить</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.periodSelector, { backgroundColor: theme.backgroundSecondary }]}>
          <Animated.View 
            style={[
              styles.periodIndicator, 
              { backgroundColor: theme.backgroundDefault },
              animatedIndicatorStyle,
            ]} 
          />
          {PERIOD_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={styles.periodBtn}
              onPress={() => handlePeriodChange(option.key)}
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

        <View style={[styles.heroCard, { backgroundColor: theme.accent }]}>
          <View style={styles.heroTop}>
            <View>
              <ThemedText type="caption" style={styles.heroLabel}>Заработано</ThemedText>
              <ThemedText type="h1" style={styles.heroAmount}>
                {formatCurrency(stats?.totalEarnings || 0)}
              </ThemedText>
            </View>
            {trendPercent && (
              <View style={[styles.trendBadge, { backgroundColor: trendPercent.isPositive ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }]}>
                <Feather 
                  name={trendPercent.isPositive ? "trending-up" : "trending-down"} 
                  size={14} 
                  color="#FFF" 
                />
                <ThemedText type="small" style={styles.trendText}>
                  {trendPercent.value}%
                </ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <ThemedText type="caption" style={styles.heroStatLabel}>Смен</ThemedText>
              <ThemedText type="h4" style={styles.heroStatValue}>{stats?.completedShiftsCount || 0}</ThemedText>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
            <View style={styles.heroStatItem}>
              <ThemedText type="caption" style={styles.heroStatLabel}>Ср. за смену</ThemedText>
              <ThemedText type="h4" style={styles.heroStatValue}>
                {formatCompactCurrency(stats?.averagePerShift || 0)}
              </ThemedText>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
            <View style={styles.heroStatItem}>
              <ThemedText type="caption" style={styles.heroStatLabel}>Баланс</ThemedText>
              <ThemedText type="h4" style={styles.heroStatValue}>
                {formatCompactCurrency(stats?.freeBalance || 0)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Доходы</ThemedText>
            {barChartData.length > 0 && (
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Последние 7 дней
              </ThemedText>
            )}
          </View>
          {barChartData.length > 0 ? (
            <MiniBarChart 
              data={barChartData} 
              maxValue={maxBarValue}
              barColor={theme.accentMuted}
              accentColor={theme.accent}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="bar-chart-2" size={24} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                Нет данных
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.quickStats}>
          <StatBadge 
            value={String(stats?.shiftsByType.future || 0)}
            label="Запланировано"
            icon="calendar"
            color={theme.accent}
            bgColor={theme.accentLight}
          />
          <StatBadge 
            value={`${stats?.goalsProgressPercent || 0}%`}
            label="Прогресс целей"
            icon="target"
            color={theme.warning}
            bgColor={theme.warningLight}
          />
        </View>

        {topGoals.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Цели</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Топ-{topGoals.length}
              </ThemedText>
            </View>
            {topGoals.map((goal, idx) => (
              <GoalMiniProgress
                key={goal.goalId || idx}
                name={goal.goalName}
                progress={Math.round((goal.amount / (stats?.totalEarnings || 1)) * 100)}
                current={goal.amount}
                target={0}
                color={goal.color}
              />
            ))}
          </View>
        )}

        {stats?.streak !== undefined && stats.streak > 0 && (
          <View style={[styles.streakCard, { backgroundColor: theme.warningLight }]}>
            <Feather name="zap" size={20} color={theme.warning} />
            <ThemedText type="body" style={{ color: theme.warning, marginLeft: Spacing.sm, fontWeight: "600" }}>
              {stats.streak} {stats.streak === 1 ? 'смена' : stats.streak < 5 ? 'смены' : 'смен'} подряд!
            </ThemedText>
          </View>
        )}

        {stats?.daysToGoalForecast && stats.daysToGoalForecast > 0 && (
          <View style={[styles.forecastCard, { backgroundColor: theme.successLight }]}>
            <Feather name="flag" size={18} color={theme.success} />
            <View style={styles.forecastContent}>
              <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
                До ближайшей цели ~{stats.daysToGoalForecast} дней
              </ThemedText>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
    marginBottom: Spacing.lg,
    position: "relative",
  },
  periodIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    width: `${100/3}%`,
    borderRadius: BorderRadius.xs,
    ...Shadows.cardLight,
  },
  periodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: Spacing.xs,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  trendText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  heroDivider: {
    width: 1,
    height: 28,
  },
  section: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.cardLight,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  miniChart: {
    marginTop: Spacing.xs,
  },
  miniChartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
  },
  miniBarCol: {
    flex: 1,
    alignItems: "center",
  },
  miniBar: {
    width: 24,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  miniBarLabel: {
    fontSize: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  quickStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.cardLight,
  },
  statBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  statBadgeContent: {
    flex: 1,
  },
  statBadgeValue: {
    fontSize: 16,
    marginBottom: -2,
  },
  goalMiniItem: {
    marginBottom: Spacing.sm,
  },
  goalMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  goalMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  goalMiniName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  goalMiniBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  goalMiniFill: {
    height: "100%",
    borderRadius: 3,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  forecastCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  forecastContent: {
    marginLeft: Spacing.sm,
  },
  errorBox: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
});
