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
import { useEarningsStats, useGoals, useShiftsSummary, useShifts, type StatsPeriod, type GoalForecast } from "@/api";

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

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}`;
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

function formatFullDate(date: Date | string | null): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return "";
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const [year, month] = dateStr.split('-');
  return `${months[parseInt(month) - 1]} ${year}`;
}

function pluralizeDays(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return "дней";
  if (lastOne === 1) return "день";
  if (lastOne >= 2 && lastOne <= 4) return "дня";
  return "дней";
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
          const dateNum = item.date ? formatDayDate(item.date) : '';
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
              <ThemedText style={[styles.barDate, { color: theme.textSecondary }]}>
                {dateNum}
              </ThemedText>
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

function GoalForecastCard({ 
  forecast,
}: { 
  forecast: GoalForecast;
}) {
  const { theme } = useTheme();
  const pct = forecast.targetAmount > 0 ? Math.min(Math.round((forecast.currentAmount / forecast.targetAmount) * 100), 100) : 0;
  const isCompleted = pct >= 100;
  
  return (
    <View style={styles.goalForecastItem}>
      <View style={styles.goalForecastHeader}>
        <View style={[styles.goalDot, { backgroundColor: forecast.color }]} />
        <ThemedText style={styles.goalName} numberOfLines={1}>{forecast.goalName}</ThemedText>
        <ThemedText style={[styles.goalPct, { color: isCompleted ? theme.success : theme.textSecondary }]}>
          {pct}%
        </ThemedText>
      </View>
      <View style={[styles.goalBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: forecast.color }]} />
      </View>
      <View style={styles.goalForecastFooter}>
        <ThemedText style={[styles.goalAmount, { color: theme.textSecondary }]}>
          {formatK(forecast.currentAmount)} / {formatK(forecast.targetAmount)} ₽
        </ThemedText>
        {forecast.estimatedDate && !isCompleted ? (
          <View style={styles.forecastDateBadge}>
            <ThemedText style={[styles.forecastDateText, { color: theme.accent }]}>
              ~{formatFullDate(forecast.estimatedDate)}
            </ThemedText>
          </View>
        ) : isCompleted ? (
          <ThemedText style={[styles.forecastDateText, { color: theme.success }]}>
            Достигнута!
          </ThemedText>
        ) : (
          <ThemedText style={[styles.forecastDateText, { color: theme.textSecondary }]}>
            Нет данных
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function GoalsTimelineCard({
  goalForecasts,
}: {
  goalForecasts: GoalForecast[];
}) {
  const { theme } = useTheme();
  const sortedForecasts = useMemo(() => {
    return [...goalForecasts]
      .filter(g => g.estimatedDate && g.remainingAmount > 0)
      .sort((a, b) => new Date(a.estimatedDate || 0).getTime() - new Date(b.estimatedDate || 0).getTime());
  }, [goalForecasts]);
  
  if (sortedForecasts.length === 0) return null;
  
  return (
    <View style={styles.timelineSection}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Таймлайн целей
      </ThemedText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineHorizontal}
      >
        {sortedForecasts.map((forecast, index) => {
          const pct = forecast.targetAmount > 0 
            ? Math.min(Math.round((forecast.currentAmount / forecast.targetAmount) * 100), 100) 
            : 0;
          return (
            <View key={forecast.goalId} style={styles.timelineHorizontalItem}>
              <View 
                style={[
                  styles.timelineCardH, 
                  { backgroundColor: theme.backgroundDefault }
                ]}
              >
                <View style={styles.timelineCardHeader}>
                  <View style={[styles.timelineIndicator, { backgroundColor: theme.accent }]}>
                    <ThemedText style={styles.timelineIndicatorText}>{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={[styles.timelineDaysLeft, { color: theme.accent }]}>
                    {forecast.estimatedDays} {pluralizeDays(forecast.estimatedDays || 0)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.timelineGoalNameH} numberOfLines={2}>
                  {forecast.goalName}
                </ThemedText>
                <View style={[styles.timelineProgressBg, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={[styles.timelineProgressFill, { width: `${pct}%`, backgroundColor: theme.accent }]} />
                </View>
                <ThemedText style={[styles.timelineDateH, { color: theme.textSecondary }]}>
                  {formatFullDate(forecast.estimatedDate)}
                </ThemedText>
                <ThemedText style={[styles.timelineRemainingH, { color: theme.text }]}>
                  {formatK(forecast.remainingAmount)} ₽
                </ThemedText>
              </View>
              {index < sortedForecasts.length - 1 && (
                <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatItem({ 
  icon,
  label, 
  value, 
  color,
  bgColor,
  subtitle,
}: { 
  icon: string;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  subtitle?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
        {subtitle && (
          <ThemedText style={[styles.statSubtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        )}
      </View>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
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

function ShiftTypeProfitability({
  dayStats,
  nightStats,
  returnsStats,
  receivingStats,
}: {
  dayStats: { count: number; totalEarnings: number; averageEarnings: number };
  nightStats: { count: number; totalEarnings: number; averageEarnings: number };
  returnsStats: { count: number; totalEarnings: number; averageEarnings: number };
  receivingStats: { count: number; totalEarnings: number; averageEarnings: number };
}) {
  const { theme } = useTheme();
  
  const dayVsNightWinner = dayStats.averageEarnings > nightStats.averageEarnings ? 'day' : 
                           nightStats.averageEarnings > dayStats.averageEarnings ? 'night' : null;
  const returnsVsReceivingWinner = returnsStats.averageEarnings > receivingStats.averageEarnings ? 'returns' :
                                   receivingStats.averageEarnings > returnsStats.averageEarnings ? 'receiving' : null;
  
  if (dayStats.count === 0 && nightStats.count === 0 && returnsStats.count === 0 && receivingStats.count === 0) {
    return null;
  }

  const maxAvg = Math.max(
    dayStats.averageEarnings, 
    nightStats.averageEarnings, 
    returnsStats.averageEarnings, 
    receivingStats.averageEarnings,
    1
  );
  
  const renderComparisonBar = (
    label: string, 
    icon: string, 
    stats: { count: number; totalEarnings: number; averageEarnings: number },
    isWinner: boolean
  ) => {
    const barWidth = stats.averageEarnings > 0 ? Math.max((stats.averageEarnings / maxAvg) * 100, 5) : 0;
    return (
      <View style={styles.profitBarItem}>
        <View style={styles.profitBarHeader}>
          <View style={styles.profitBarLabel}>
            <Feather name={icon as any} size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.profitBarLabelText, { color: theme.text }]}>{label}</ThemedText>
            {isWinner && stats.count > 0 && (
              <View style={[styles.winnerTag, { backgroundColor: theme.success }]}>
                <Feather name="check" size={10} color="#FFF" />
              </View>
            )}
          </View>
          <ThemedText style={[styles.profitBarValue, { color: theme.text }]}>
            {formatK(stats.averageEarnings)} ₽
          </ThemedText>
        </View>
        <View style={[styles.profitBarBg, { backgroundColor: theme.backgroundSecondary }]}>
          <View 
            style={[
              styles.profitBarFill, 
              { 
                width: `${barWidth}%`, 
                backgroundColor: isWinner ? theme.accent : theme.textSecondary 
              }
            ]} 
          />
        </View>
        <View style={styles.profitBarMeta}>
          <ThemedText style={[styles.profitBarMetaText, { color: theme.textSecondary }]}>
            {stats.count} смен
          </ThemedText>
          <ThemedText style={[styles.profitBarMetaText, { color: theme.textSecondary }]}>
            {formatK(stats.totalEarnings)} ₽
          </ThemedText>
        </View>
      </View>
    );
  };
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>
        Анализ доходности
      </ThemedText>
      
      <View style={styles.profitComparisonSection}>
        <ThemedText style={[styles.profitComparisonTitle, { color: theme.text }]}>
          По времени смены
        </ThemedText>
        {renderComparisonBar('Дневные', 'sun', dayStats, dayVsNightWinner === 'day')}
        {renderComparisonBar('Ночные', 'moon', nightStats, dayVsNightWinner === 'night')}
      </View>
      
      <View style={[styles.profitDivider, { backgroundColor: theme.border }]} />
      
      <View style={styles.profitComparisonSection}>
        <ThemedText style={[styles.profitComparisonTitle, { color: theme.text }]}>
          По типу операции
        </ThemedText>
        {renderComparisonBar('Возвраты', 'rotate-ccw', returnsStats, returnsVsReceivingWinner === 'returns')}
        {renderComparisonBar('Приёмка', 'package', receivingStats, returnsVsReceivingWinner === 'receiving')}
      </View>
    </View>
  );
}

function RecordsCard({
  recordShiftEarnings,
  recordShiftDate,
  recordShiftType,
  bestWeekEarnings,
  bestWeekDate,
  bestMonthEarnings,
  bestMonthDate,
}: {
  recordShiftEarnings: number;
  recordShiftDate: string | null;
  recordShiftType: string | null;
  bestWeekEarnings: number;
  bestWeekDate: string | null;
  bestMonthEarnings: number;
  bestMonthDate: string | null;
}) {
  const { theme } = useTheme();
  
  const records = [];
  
  if (recordShiftEarnings > 0) {
    records.push({
      id: 'shift',
      icon: 'zap',
      label: 'Лучшая смена',
      value: formatFullCurrency(recordShiftEarnings),
      meta: formatFullDate(recordShiftDate),
    });
  }
  
  if (bestWeekEarnings > 0) {
    records.push({
      id: 'week',
      icon: 'trending-up',
      label: 'Лучшая неделя',
      value: formatFullCurrency(bestWeekEarnings),
      meta: formatFullDate(bestWeekDate),
    });
  }
  
  if (bestMonthEarnings > 0) {
    records.push({
      id: 'month',
      icon: 'award',
      label: 'Лучший месяц',
      value: formatFullCurrency(bestMonthEarnings),
      meta: formatMonthYear(bestMonthDate),
    });
  }
  
  if (records.length === 0) return null;
  
  return (
    <View style={styles.recordsSection}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Ваши рекорды
      </ThemedText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recordsHorizontal}
      >
        {records.map((record) => (
          <View 
            key={record.id} 
            style={[styles.recordCardH, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.recordIconH, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name={record.icon as any} size={18} color={theme.accent} />
            </View>
            <ThemedText style={[styles.recordLabelH, { color: theme.textSecondary }]}>
              {record.label}
            </ThemedText>
            <ThemedText style={[styles.recordValueH, { color: theme.text }]}>
              {record.value}
            </ThemedText>
            <ThemedText style={[styles.recordMetaH, { color: theme.textSecondary }]}>
              {record.meta}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AmountForecastCard({
  dailyAverage,
}: {
  dailyAverage: number;
}) {
  const { theme } = useTheme();
  const [targetAmount, setTargetAmount] = useState(100000);
  
  const amounts = [50000, 100000, 200000, 500000];
  
  if (dailyAverage <= 0) return null;
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>
        Прогноз достижения суммы
      </ThemedText>
      <View style={styles.forecastButtonsRow}>
        {amounts.map(amount => (
          <Pressable
            key={amount}
            style={[
              styles.forecastButton,
              { backgroundColor: targetAmount === amount ? theme.accent : theme.backgroundSecondary }
            ]}
            onPress={() => setTargetAmount(amount)}
          >
            <ThemedText style={[
              styles.forecastButtonText,
              { color: targetAmount === amount ? '#FFF' : theme.text }
            ]}>
              {formatK(amount)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <View style={styles.forecastResult}>
        <ThemedText style={[styles.forecastTargetText, { color: theme.textSecondary }]}>
          Чтобы заработать {formatFullCurrency(targetAmount)}:
        </ThemedText>
        <View style={styles.forecastDays}>
          <Feather name="trending-up" size={28} color={theme.accent} />
          <ThemedText style={[styles.forecastDaysValue, { color: theme.accent }]}>
            ~{Math.ceil(targetAmount / dailyAverage)} {pluralizeDays(Math.ceil(targetAmount / dailyAverage))}
          </ThemedText>
        </View>
        <ThemedText style={[styles.forecastDateResult, { color: theme.success }]}>
          ~{formatFullDate(new Date(Date.now() + Math.ceil(targetAmount / dailyAverage) * 24 * 60 * 60 * 1000))}
        </ThemedText>
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

      {stats?.goalForecasts && stats.goalForecasts.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>
            Прогноз достижения целей
          </ThemedText>
          {stats.goalForecasts.map((forecast) => (
            <GoalForecastCard key={forecast.goalId} forecast={forecast} />
          ))}
        </View>
      )}

      {stats?.goalForecasts && (
        <GoalsTimelineCard goalForecasts={stats.goalForecasts} />
      )}

      <ShiftTypeProfitability
        dayStats={stats?.dayShiftStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        nightStats={stats?.nightShiftStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        returnsStats={stats?.returnsShiftStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        receivingStats={stats?.receivingShiftStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
      />

      <RecordsCard
        recordShiftEarnings={stats?.recordShiftEarnings || 0}
        recordShiftDate={stats?.recordShiftDate || null}
        recordShiftType={stats?.recordShiftType || null}
        bestWeekEarnings={stats?.bestWeekEarnings || 0}
        bestWeekDate={stats?.bestWeekDate || null}
        bestMonthEarnings={stats?.bestMonthEarnings || 0}
        bestMonthDate={stats?.bestMonthDate || null}
      />

      <AmountForecastCard dailyAverage={stats?.dailyAverageEarnings || 0} />

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <StatItem
          icon="bar-chart-2"
          label="Средний за смену"
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
          label="Свободный баланс"
          value={formatK(stats?.freeBalance || 0) + " ₽"}
          color={theme.success}
          bgColor={theme.successLight}
          subtitle="Не распределён на цели"
        />
      </View>

      {stats?.streak && stats.streak > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.warningLight }]}>
          <Feather name="zap" size={14} color={theme.warning} />
          <ThemedText style={[styles.bannerText, { color: theme.warning }]}>
            {stats.streak} {stats.streak === 1 ? 'день' : stats.streak < 5 ? 'дня' : 'дней'} подряд работаете!
          </ThemedText>
        </View>
      ) : null}

      {stats?.daysToGoalForecast && stats.daysToGoalForecast > 0 ? (
        <View style={[styles.banner, { backgroundColor: theme.accentLight }]}>
          <Feather name="flag" size={14} color={theme.accent} />
          <ThemedText style={[styles.bannerText, { color: theme.accent }]}>
            До всех целей ~{stats.daysToGoalForecast} {pluralizeDays(stats.daysToGoalForecast)}
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
    marginLeft: Spacing.md,
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
  goalForecastItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  goalForecastHeader: {
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
    fontWeight: "500",
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
  goalForecastFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  goalAmount: {
    fontSize: 10,
  },
  forecastDateBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  forecastDateText: {
    fontSize: 10,
    fontWeight: "500",
  },
  timeline: {
    marginTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 60,
  },
  timelineLeft: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  timelineGoalName: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineDate: {
    fontSize: 12,
    marginTop: 2,
  },
  timelineAmount: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 1,
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
  profitSection: {
    marginBottom: Spacing.md,
  },
  profitSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  profitRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  profitCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 10,
    alignItems: "center",
  },
  profitCardWinner: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  profitIcon: {
    marginBottom: 4,
  },
  profitType: {
    fontSize: 12,
    fontWeight: "600",
  },
  profitCount: {
    fontSize: 10,
    marginTop: 2,
  },
  profitAvg: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  profitTotal: {
    fontSize: 10,
    marginTop: 2,
  },
  winnerBadge: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  recordContent: {
    flex: 1,
  },
  recordLabel: {
    fontSize: 12,
  },
  recordValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  recordMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  forecastButtonsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  forecastButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  forecastButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  forecastResult: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  forecastTargetText: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  forecastDays: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  forecastDaysValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  forecastDateResult: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  barDate: {
    fontSize: 9,
    marginTop: 1,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  timelineSection: {
    marginBottom: Spacing.sm,
  },
  timelineHorizontal: {
    paddingRight: Spacing.lg,
    gap: 0,
  },
  timelineHorizontalItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineCardH: {
    width: 140,
    padding: Spacing.md,
    borderRadius: 12,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  timelineIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  timelineDaysLeft: {
    fontSize: 10,
    fontWeight: "600",
  },
  timelineGoalNameH: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    lineHeight: 17,
  },
  timelineProgressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  timelineProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  timelineDateH: {
    fontSize: 10,
    marginBottom: 2,
  },
  timelineRemainingH: {
    fontSize: 12,
    fontWeight: "600",
  },
  timelineConnector: {
    width: 16,
    height: 2,
    marginHorizontal: 4,
  },
  profitComparisonSection: {
    marginBottom: Spacing.sm,
  },
  profitComparisonTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  profitBarItem: {
    marginBottom: Spacing.md,
  },
  profitBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  profitBarLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profitBarLabelText: {
    fontSize: 13,
    fontWeight: "500",
  },
  winnerTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profitBarValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  profitBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  profitBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  profitBarMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  profitBarMetaText: {
    fontSize: 10,
  },
  profitDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  recordsSection: {
    marginBottom: Spacing.sm,
  },
  recordsHorizontal: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  recordCardH: {
    width: 130,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  recordIconH: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  recordLabelH: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 4,
  },
  recordValueH: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  recordMetaH: {
    fontSize: 9,
    textAlign: "center",
  },
});
