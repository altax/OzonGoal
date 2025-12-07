import { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from "react-native";
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
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Card } from "@/components/Card";
import { useEarningsStats, type StatsPeriod } from "@/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_PADDING = Spacing["2xl"] * 2;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " \u20bd";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("ru-RU", { month: "short" });
}

type PeriodOption = { key: StatsPeriod; label: string };
const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
];

function BarChart({ 
  data, 
  maxValue, 
  barColor,
  labelFormatter,
}: { 
  data: { label: string; value: number }[];
  maxValue: number;
  barColor: string;
  labelFormatter?: (label: string) => string;
}) {
  const { theme } = useTheme();
  const chartWidth = SCREEN_WIDTH - CHART_PADDING - Spacing["2xl"] * 2;
  const barWidth = Math.min(32, (chartWidth - (data.length - 1) * 4) / data.length);
  
  return (
    <View style={styles.barChartContainer}>
      <View style={styles.barChartBars}>
        {data.map((item, index) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 120 : 0;
          return (
            <View key={index} style={styles.barItem}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: Math.max(4, height),
                    width: barWidth,
                    backgroundColor: barColor,
                  }
                ]} 
              />
              <ThemedText type="caption" style={[styles.barLabel, { color: theme.textSecondary }]}>
                {labelFormatter ? labelFormatter(item.label) : item.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PieChart({ 
  data,
  size = 140,
}: { 
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const { theme } = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  if (total === 0) {
    return (
      <View style={[styles.pieChartEmpty, { width: size, height: size, backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="pie-chart" size={32} color={theme.textSecondary} />
      </View>
    );
  }
  
  let currentAngle = -90;
  const segments = data.map((item) => {
    const angle = (item.value / total) * 360;
    const segment = { ...item, startAngle: currentAngle, endAngle: currentAngle + angle };
    currentAngle += angle;
    return segment;
  });
  
  const radius = size / 2;
  const innerRadius = radius * 0.6;
  
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.pieChartInner, { width: size, height: size }]}>
        {segments.map((segment, index) => {
          const midAngle = (segment.startAngle + segment.endAngle) / 2;
          const radians = (midAngle * Math.PI) / 180;
          const x = radius + Math.cos(radians) * (radius * 0.75);
          const y = radius + Math.sin(radians) * (radius * 0.75);
          const segmentAngle = segment.endAngle - segment.startAngle;
          
          return (
            <View
              key={index}
              style={[
                styles.pieSegment,
                {
                  width: size,
                  height: size,
                  backgroundColor: segment.color,
                  transform: [
                    { rotate: `${segment.startAngle}deg` },
                  ],
                  opacity: segmentAngle > 1 ? 1 : 0,
                },
              ]}
            />
          );
        })}
        <View 
          style={[
            styles.pieCenter, 
            { 
              width: innerRadius * 2, 
              height: innerRadius * 2,
              backgroundColor: theme.backgroundDefault,
            }
          ]} 
        />
      </View>
    </View>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
}: { 
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; isPositive: boolean };
}) {
  const { theme } = useTheme();
  
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? theme.successLight : theme.errorLight }]}>
            <Feather 
              name={trend.isPositive ? "trending-up" : "trending-down"} 
              size={12} 
              color={trend.isPositive ? theme.success : theme.error} 
            />
            <ThemedText 
              type="caption" 
              style={{ color: trend.isPositive ? theme.success : theme.error, marginLeft: 2 }}
            >
              {trend.value}%
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText type="h3" style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="caption" style={[styles.metricTitle, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText type="caption" style={[styles.metricSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      )}
    </Card>
  );
}

function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color,
  bgColor,
}: { 
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 100) / 100);
  
  return (
    <View style={{ width: size, height: size }}>
      <View 
        style={[
          styles.progressRingBg, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: bgColor,
          }
        ]} 
      />
      <View 
        style={[
          styles.progressRingFill, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: progress > 25 ? color : 'transparent',
            borderBottomColor: progress > 50 ? color : 'transparent',
            borderLeftColor: progress > 75 ? color : 'transparent',
            transform: [{ rotate: '-45deg' }],
          }
        ]} 
      />
      <View style={styles.progressRingCenter}>
        <ThemedText type="h4">{progress}%</ThemedText>
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
    transform: [{ translateX: indicatorPosition.value * 80 }],
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
  
  const pieChartData = useMemo(() => {
    if (!stats?.goalDistribution) return [];
    return stats.goalDistribution.map(g => ({
      label: g.goalName,
      value: g.amount,
      color: g.color,
    }));
  }, [stats?.goalDistribution]);
  
  const trendData = useMemo(() => {
    if (!stats) return null;
    const diff = stats.previousPeriodAverage > 0 
      ? ((stats.averagePerShift - stats.previousPeriodAverage) / stats.previousPeriodAverage) * 100
      : 0;
    return {
      value: Math.abs(Math.round(diff)),
      isPositive: diff >= 0,
    };
  }, [stats]);

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={[styles.errorContainer, { backgroundColor: theme.errorLight }]}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <ThemedText type="h4" style={[styles.errorTitle, { color: theme.error }]}>
            Ошибка загрузки
          </ThemedText>
          <ThemedText type="body" style={[styles.errorMessage, { color: theme.textSecondary }]}>
            Не удалось загрузить статистику. Проверьте подключение к интернету.
          </ThemedText>
          <Pressable 
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={handleRetry}
          >
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            <ThemedText type="body" style={styles.retryButtonText}>
              Повторить
            </ThemedText>
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
          paddingTop: Spacing.xl,
          paddingHorizontal: Spacing["2xl"],
          paddingBottom: Spacing["4xl"] + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h3" style={styles.screenTitle}>
          Обзор
        </ThemedText>
        
        <View style={styles.periodSelector}>
          <View style={[styles.periodToggle, { backgroundColor: theme.backgroundSecondary }]}>
            <Animated.View 
              style={[
                styles.periodIndicator, 
                { backgroundColor: theme.accent },
                animatedIndicatorStyle,
              ]} 
            />
            {PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={styles.periodButton}
                onPress={() => handlePeriodChange(option.key)}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.periodButtonText,
                    { color: period === option.key ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Заработано"
            value={formatCurrency(stats?.totalEarnings || 0)}
            icon="dollar-sign"
            iconBg={theme.successLight}
            iconColor={theme.success}
          />
          <MetricCard
            title="Ср. за смену"
            value={formatCurrency(stats?.averagePerShift || 0)}
            icon="bar-chart-2"
            iconBg={theme.accentLight}
            iconColor={theme.accent}
            trend={trendData || undefined}
          />
        </View>
        
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Смен завершено"
            value={String(stats?.completedShiftsCount || 0)}
            icon="check-circle"
            iconBg={theme.accentLight}
            iconColor={theme.accent}
          />
          <MetricCard
            title="Прогресс целей"
            value={`${stats?.goalsProgressPercent || 0}%`}
            icon="target"
            iconBg={theme.warningLight}
            iconColor={theme.warning}
          />
        </View>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Свободный баланс
              </ThemedText>
              <ThemedText type="h2" style={[styles.balanceValue, { color: theme.success }]}>
                {formatCurrency(stats?.freeBalance || 0)}
              </ThemedText>
            </View>
            <View style={[styles.balanceIcon, { backgroundColor: theme.successLight }]}>
              <Feather name="credit-card" size={24} color={theme.success} />
            </View>
          </View>
          {stats?.daysToGoalForecast && (
            <View style={[styles.forecastBadge, { backgroundColor: theme.accentLight }]}>
              <Feather name="calendar" size={14} color={theme.accent} />
              <ThemedText type="small" style={{ color: theme.accent, marginLeft: Spacing.xs }}>
                До цели: ~{stats.daysToGoalForecast} дней
              </ThemedText>
            </View>
          )}
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Доходы по дням</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.successLight }]}>
              <Feather name="trending-up" size={18} color={theme.success} />
            </View>
          </View>
          {barChartData.length > 0 ? (
            <BarChart 
              data={barChartData} 
              maxValue={maxBarValue}
              barColor={theme.accent}
            />
          ) : (
            <View style={[styles.emptyChart, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="bar-chart-2" size={32} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                Нет данных за период
              </ThemedText>
            </View>
          )}
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Распределение по целям</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
              <Feather name="pie-chart" size={18} color={theme.accent} />
            </View>
          </View>
          <View style={styles.pieChartSection}>
            <PieChart data={pieChartData} />
            <View style={styles.pieChartLegend}>
              {pieChartData.length > 0 ? pieChartData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                    {item.label}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {formatCurrency(item.value)}
                  </ThemedText>
                </View>
              )) : (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Нет распределений
                </ThemedText>
              )}
            </View>
          </View>
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText type="h4">Смены по типам</ThemedText>
            <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
              <Feather name="clock" size={18} color={theme.accent} />
            </View>
          </View>
          <View style={styles.shiftsTypeGrid}>
            <View style={styles.shiftTypeItem}>
              <View style={[styles.shiftTypeIcon, { backgroundColor: theme.accentLight }]}>
                <Feather name="calendar" size={20} color={theme.accent} />
              </View>
              <ThemedText type="h3">{stats?.shiftsByType.future || 0}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Будущие</ThemedText>
            </View>
            <View style={styles.shiftTypeItem}>
              <View style={[styles.shiftTypeIcon, { backgroundColor: theme.warningLight }]}>
                <Feather name="play" size={20} color={theme.warning} />
              </View>
              <ThemedText type="h3">{stats?.shiftsByType.current || 0}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Текущие</ThemedText>
            </View>
            <View style={styles.shiftTypeItem}>
              <View style={[styles.shiftTypeIcon, { backgroundColor: theme.successLight }]}>
                <Feather name="check" size={20} color={theme.success} />
              </View>
              <ThemedText type="h3">{stats?.shiftsByType.past || 0}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Прошедшие</ThemedText>
            </View>
          </View>
        </Card>

        {stats?.topShifts && stats.topShifts.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <ThemedText type="h4">Топ-3 смены</ThemedText>
              <View style={[styles.iconBadge, { backgroundColor: theme.warningLight }]}>
                <Feather name="award" size={18} color={theme.warning} />
              </View>
            </View>
            {stats.topShifts.map((shift, index) => (
              <View 
                key={shift.id} 
                style={[
                  styles.topShiftItem,
                  index < stats.topShifts.length - 1 && { 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.border 
                  },
                ]}
              >
                <View style={[styles.topShiftRank, { backgroundColor: index === 0 ? theme.warningLight : theme.backgroundSecondary }]}>
                  <ThemedText type="caption" style={{ color: index === 0 ? theme.warning : theme.textSecondary }}>
                    #{index + 1}
                  </ThemedText>
                </View>
                <View style={styles.topShiftInfo}>
                  <ThemedText type="body">{shift.type}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {formatDate(shift.date)}
                  </ThemedText>
                </View>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  {formatCurrency(shift.earnings)}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}

        {stats?.overdueGoals && stats.overdueGoals.length > 0 && (
          <Card style={{ ...styles.chartCard, borderColor: theme.warning, borderWidth: 1 }}>
            <View style={styles.chartHeader}>
              <ThemedText type="h4">Цели с риском</ThemedText>
              <View style={[styles.iconBadge, { backgroundColor: theme.warningLight }]}>
                <Feather name="alert-triangle" size={18} color={theme.warning} />
              </View>
            </View>
            {stats.overdueGoals.map((goal, index) => (
              <View 
                key={goal.id} 
                style={[
                  styles.overdueGoalItem,
                  index < stats.overdueGoals.length - 1 && { 
                    borderBottomWidth: 1, 
                    borderBottomColor: theme.border 
                  },
                ]}
              >
                <View style={styles.overdueGoalInfo}>
                  <ThemedText type="body">{goal.name}</ThemedText>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSecondary }]}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${goal.progress}%`,
                          backgroundColor: goal.progress < 25 ? theme.error : theme.warning,
                        }
                      ]} 
                    />
                  </View>
                </View>
                <ThemedText type="h4" style={{ color: theme.warning }}>
                  {goal.progress}%
                </ThemedText>
              </View>
            ))}
          </Card>
        )}

        {stats?.streak !== undefined && stats.streak > 0 && (
          <Card style={{ ...styles.streakCard, backgroundColor: theme.accent }}>
            <View style={styles.streakContent}>
              <View style={styles.streakIconContainer}>
                <Feather name="zap" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.streakInfo}>
                <ThemedText type="h3" style={{ color: "#FFFFFF" }}>
                  {stats.streak} {stats.streak === 1 ? 'смена' : stats.streak < 5 ? 'смены' : 'смен'} подряд
                </ThemedText>
                <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Продолжайте в том же духе!
                </ThemedText>
              </View>
            </View>
          </Card>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  screenTitle: {
    marginBottom: Spacing.xl,
  },
  periodSelector: {
    marginBottom: Spacing.xl,
  },
  periodToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
    position: "relative",
  },
  periodIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 76,
    height: 32,
    borderRadius: BorderRadius.full,
  },
  periodButton: {
    width: 76,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  periodButtonText: {
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.lg,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  metricValue: {
    marginBottom: 2,
  },
  metricTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricSubtitle: {
    marginTop: 2,
  },
  balanceCard: {
    marginBottom: Spacing.xl,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceInfo: {
    flex: 1,
  },
  balanceValue: {
    marginTop: Spacing.xs,
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
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
  emptyChart: {
    height: 140,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  barChartContainer: {
    height: 160,
  },
  barChartBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  barLabel: {
    fontSize: 10,
  },
  pieChartSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  pieChartInner: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 999,
  },
  pieSegment: {
    position: "absolute",
    borderRadius: 999,
  },
  pieCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -42 }, { translateY: -42 }],
  },
  pieChartEmpty: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pieChartLegend: {
    flex: 1,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shiftsTypeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shiftTypeItem: {
    alignItems: "center",
    flex: 1,
  },
  shiftTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  topShiftItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  topShiftRank: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  topShiftInfo: {
    flex: 1,
  },
  overdueGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  overdueGoalInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressRingBg: {
    position: "absolute",
  },
  progressRingFill: {
    position: "absolute",
  },
  progressRingCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCard: {
    marginBottom: Spacing.xl,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakInfo: {
    flex: 1,
  },
  errorContainer: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.lg,
    maxWidth: 320,
  },
  errorTitle: {
    textAlign: "center",
  },
  errorMessage: {
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
