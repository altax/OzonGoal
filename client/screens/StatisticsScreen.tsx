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
import { useEarningsStats, useGoals, useShiftsSummary, useShifts, type StatsPeriod } from "@/api";

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

function formatShiftDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  
  if (isToday) return "Сегодня";
  if (isTomorrow) return "Завтра";
  
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatShiftTime(shiftType: string): string {
  return shiftType === "day" ? "8:00 – 20:00" : "20:00 – 8:00";
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
}: { 
  name: string;
  current: number;
  target: number;
  color: string;
}) {
  const { theme } = useTheme();
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  
  return (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalDot, { backgroundColor: color }]} />
        <ThemedText style={styles.goalName} numberOfLines={1}>{name}</ThemedText>
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

function CurrentShiftCard({ 
  shift,
  isCurrentShift,
}: { 
  shift: { 
    scheduledDate: Date;
    shiftType: 'day' | 'night';
    operationType: 'returns' | 'receiving';
    status: string;
  };
  isCurrentShift: boolean;
}) {
  const { theme } = useTheme();
  const isNight = shift.shiftType === "night";
  const isReturns = shift.operationType === "returns";
  
  return (
    <View style={[styles.shiftCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.shiftCardHeader}>
        <View style={[styles.shiftTypeIcon, { backgroundColor: isNight ? theme.accentLight : theme.warningLight }]}>
          <Feather name={isNight ? "moon" : "sun"} size={16} color={isNight ? theme.accent : theme.warning} />
        </View>
        <View style={styles.shiftCardInfo}>
          <ThemedText style={styles.shiftCardTitle}>
            {isCurrentShift ? "Текущая смена" : "Следующая смена"}
          </ThemedText>
          <ThemedText style={[styles.shiftCardDate, { color: theme.textSecondary }]}>
            {formatShiftDate(shift.scheduledDate)} • {formatShiftTime(shift.shiftType)}
          </ThemedText>
        </View>
        {isCurrentShift && (
          <View style={[styles.liveIndicator, { backgroundColor: theme.success }]}>
            <ThemedText style={styles.liveText}>LIVE</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.shiftCardDetails}>
        <View style={[styles.shiftDetailBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={isReturns ? "rotate-ccw" : "package"} size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.shiftDetailText, { color: theme.textSecondary }]}>
            {isReturns ? "Возвраты" : "Приёмка"}
          </ThemedText>
        </View>
        <View style={[styles.shiftDetailBadge, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={isNight ? "moon" : "sun"} size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.shiftDetailText, { color: theme.textSecondary }]}>
            {isNight ? "Ночная" : "Дневная"}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function WeeklyComparison({
  thisWeek,
  lastWeek,
}: {
  thisWeek: number;
  lastWeek: number;
}) {
  const { theme } = useTheme();
  const diff = thisWeek - lastWeek;
  const diffPercent = lastWeek > 0 ? Math.round((diff / lastWeek) * 100) : 0;
  const isPositive = diff >= 0;
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>Сравнение недель</ThemedText>
      <View style={styles.weeklyCompRow}>
        <View style={styles.weeklyCol}>
          <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>Эта неделя</ThemedText>
          <ThemedText style={styles.weeklyAmount}>{formatK(thisWeek)} ₽</ThemedText>
        </View>
        <View style={styles.weeklyDivider}>
          <Feather 
            name={isPositive ? "trending-up" : "trending-down"} 
            size={20} 
            color={isPositive ? theme.success : theme.error} 
          />
          {diffPercent !== 0 && (
            <ThemedText style={[styles.weeklyDiff, { color: isPositive ? theme.success : theme.error }]}>
              {isPositive ? "+" : ""}{diffPercent}%
            </ThemedText>
          )}
        </View>
        <View style={[styles.weeklyCol, { alignItems: "flex-end" }]}>
          <ThemedText style={[styles.weeklyLabel, { color: theme.textSecondary }]}>Прошлая</ThemedText>
          <ThemedText style={[styles.weeklyAmount, { color: theme.textSecondary }]}>{formatK(lastWeek)} ₽</ThemedText>
        </View>
      </View>
    </View>
  );
}

function ShiftTypeDistribution({
  dayShifts,
  nightShifts,
  returnsShifts,
  receivingShifts,
}: {
  dayShifts: number;
  nightShifts: number;
  returnsShifts: number;
  receivingShifts: number;
}) {
  const { theme } = useTheme();
  const totalByTime = dayShifts + nightShifts;
  const totalByType = returnsShifts + receivingShifts;
  
  const dayPct = totalByTime > 0 ? Math.round((dayShifts / totalByTime) * 100) : 0;
  const returnsPct = totalByType > 0 ? Math.round((returnsShifts / totalByType) * 100) : 0;
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>Распределение смен</ThemedText>
      <View style={styles.distRow}>
        <View style={styles.distItem}>
          <View style={styles.distHeader}>
            <Feather name="sun" size={14} color={theme.warning} />
            <ThemedText style={styles.distLabel}> День / </ThemedText>
            <Feather name="moon" size={14} color={theme.accent} />
            <ThemedText style={styles.distLabel}> Ночь</ThemedText>
          </View>
          <View style={[styles.distBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.distFill, { width: `${dayPct}%`, backgroundColor: theme.warning }]} />
          </View>
          <View style={styles.distCounts}>
            <ThemedText style={[styles.distCount, { color: theme.warning }]}>{dayShifts}</ThemedText>
            <ThemedText style={[styles.distCount, { color: theme.accent }]}>{nightShifts}</ThemedText>
          </View>
        </View>
        <View style={styles.distItem}>
          <View style={styles.distHeader}>
            <Feather name="rotate-ccw" size={14} color={theme.success} />
            <ThemedText style={styles.distLabel}> Возвр / </ThemedText>
            <Feather name="package" size={14} color={theme.error} />
            <ThemedText style={styles.distLabel}> Приём</ThemedText>
          </View>
          <View style={[styles.distBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.distFill, { width: `${returnsPct}%`, backgroundColor: theme.success }]} />
          </View>
          <View style={styles.distCounts}>
            <ThemedText style={[styles.distCount, { color: theme.success }]}>{returnsShifts}</ThemedText>
            <ThemedText style={[styles.distCount, { color: theme.error }]}>{receivingShifts}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const { data: stats, isLoading, error, refetch } = useEarningsStats(period);
  const { data: goals } = useGoals();
  const { data: shiftsSummary } = useShiftsSummary();
  const { data: shifts } = useShifts();
  
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

  const nextScheduledShift = useMemo(() => {
    if (!shifts) return null;
    const now = new Date();
    return shifts
      .filter(s => s.status === 'scheduled' && new Date(s.scheduledStart) > now)
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0] || null;
  }, [shifts]);

  const currentOrNextShift = useMemo(() => {
    if (shiftsSummary?.current) return { shift: shiftsSummary.current, isCurrent: true };
    if (nextScheduledShift) return { shift: nextScheduledShift, isCurrent: false };
    return null;
  }, [shiftsSummary?.current, nextScheduledShift]);

  const weeklyStats = useMemo(() => {
    if (!shifts) return { thisWeek: 0, lastWeek: 0 };
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    
    const thisWeek = shifts
      .filter(s => {
        if (s.status !== 'completed' || !s.earnings) return false;
        const date = s.earningsRecordedAt || s.scheduledDate;
        if (!date) return false;
        return date >= thisWeekStart;
      })
      .reduce((sum, s) => sum + (parseFloat(String(s.earnings)) || 0), 0);
    
    const lastWeek = shifts
      .filter(s => {
        if (s.status !== 'completed' || !s.earnings) return false;
        const date = s.earningsRecordedAt || s.scheduledDate;
        if (!date) return false;
        return date >= lastWeekStart && date < lastWeekEnd;
      })
      .reduce((sum, s) => sum + (parseFloat(String(s.earnings)) || 0), 0);
    
    return { thisWeek, lastWeek };
  }, [shifts]);

  const shiftTypeStats = useMemo(() => {
    if (!shifts) return { dayShifts: 0, nightShifts: 0, returnsShifts: 0, receivingShifts: 0 };
    const completedShifts = shifts.filter(s => s.status === 'completed');
    return {
      dayShifts: completedShifts.filter(s => s.shiftType === 'day').length,
      nightShifts: completedShifts.filter(s => s.shiftType === 'night').length,
      returnsShifts: completedShifts.filter(s => s.operationType === 'returns').length,
      receivingShifts: completedShifts.filter(s => s.operationType === 'receiving').length,
    };
  }, [shifts]);


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

      {currentOrNextShift && (
        <CurrentShiftCard 
          shift={currentOrNextShift.shift} 
          isCurrentShift={currentOrNextShift.isCurrent} 
        />
      )}

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

      <WeeklyComparison thisWeek={weeklyStats.thisWeek} lastWeek={weeklyStats.lastWeek} />

      {(shiftTypeStats.dayShifts + shiftTypeStats.nightShifts > 0) && (
        <ShiftTypeDistribution {...shiftTypeStats} />
      )}

      {activeGoals.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={styles.cardTitle}>Цели</ThemedText>
          {activeGoals.map((goal) => (
            <GoalProgress
              key={goal.id}
              name={goal.name}
              current={parseFloat(String(goal.currentAmount)) || 0}
              target={parseFloat(String(goal.targetAmount)) || 0}
              color={goal.iconColor || theme.accent}
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
  shiftCard: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  shiftCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftCardInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  shiftCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  shiftCardDate: {
    fontSize: 12,
    marginTop: 2,
  },
  liveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFF",
  },
  shiftCardDetails: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: 8,
  },
  shiftDetailBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  shiftDetailText: {
    fontSize: 11,
  },
  weeklyCompRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weeklyCol: {
    flex: 1,
  },
  weeklyLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  weeklyAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  weeklyDivider: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  weeklyDiff: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  distRow: {
    gap: Spacing.md,
  },
  distItem: {
    marginBottom: Spacing.xs,
  },
  distHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  distLabel: {
    fontSize: 11,
  },
  distBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  distFill: {
    height: "100%",
    borderRadius: 3,
  },
  distCounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  distCount: {
    fontSize: 11,
    fontWeight: "600",
  },
});
