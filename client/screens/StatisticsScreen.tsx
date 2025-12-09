import { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { useEarningsStats, useGoals, useShiftsSummary, useShifts, type StatsPeriod, type GoalForecast, type CombinedShiftStats } from "@/api";

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
];

function BarChart({ 
  data, 
  color,
  bgColor,
  onBarPress,
  streak,
}: { 
  data: { label: string; value: number; date: string }[];
  color: string;
  bgColor: string;
  onBarPress?: (index: number) => void;
  streak?: number;
}) {
  const { theme } = useTheme();
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = data.length > 0 ? total / data.filter(d => d.value > 0).length : 0;
  
  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartValuesRow}>
        {data.map((item, i) => {
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={styles.chartValueCell}>
              {item.value > 0 && (
                <ThemedText style={[styles.barValue, { color: isLast ? color : theme.textSecondary }]}>
                  {formatK(item.value)}
                </ThemedText>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.barChart}>
        {data.map((item, i) => {
          const heightPct = max > 0 ? Math.max((item.value / max) * 100, item.value > 0 ? 8 : 4) : 4;
          const isLast = i === data.length - 1;
          const isMax = item.value === max && item.value > 0;
          return (
            <Pressable 
              key={i} 
              style={styles.barCol}
              onPress={() => onBarPress?.(i)}
            >
              <View 
                style={[
                  styles.bar,
                  { 
                    height: `${heightPct}%`,
                    backgroundColor: isMax ? theme.success : isLast ? color : bgColor,
                  }
                ]} 
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.chartLabelsRow}>
        {data.map((item, i) => {
          const dateNum = item.date ? formatDayDate(item.date) : '';
          return (
            <View key={i} style={styles.chartLabelCell}>
              <ThemedText style={[styles.barLabel, { color: theme.textSecondary }]}>
                {item.label}
              </ThemedText>
              <ThemedText style={[styles.barDate, { color: theme.textSecondary }]}>
                {dateNum}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <View style={styles.chartFooterRow}>
        {streak && streak > 0 ? (
          <View style={[styles.streakBadgeInline, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="zap" size={12} color={theme.accent} />
            <ThemedText style={[styles.streakBadgeTextInline, { color: theme.text }]}>
              {streak} {pluralizeShifts(streak)} подряд
            </ThemedText>
          </View>
        ) : <View />}
        {avg > 0 && (
          <View style={styles.avgRowInline}>
            <ThemedText style={[styles.avgText, { color: theme.textSecondary }]}>
              Ср: {formatK(avg)} ₽
            </ThemedText>
          </View>
        )}
      </View>
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

function pluralizeShifts(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return "смен";
  if (lastOne === 1) return "смена";
  if (lastOne >= 2 && lastOne <= 4) return "смены";
  return "смен";
}

function StreakBanner({
  streak,
}: {
  streak: number;
}) {
  const { theme } = useTheme();
  
  if (!streak || streak <= 0) return null;
  
  return (
    <View style={[styles.streakBadge, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="zap" size={14} color={theme.accent} />
      <ThemedText style={[styles.streakBadgeText, { color: theme.text }]}>
        {streak} {pluralizeShifts(streak)} подряд
      </ThemedText>
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

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function CurrentShiftCard({ 
  shift,
  isCurrentShift,
}: { 
  shift: { 
    scheduledDate: Date;
    scheduledStart?: Date;
    shiftType: 'day' | 'night';
    operationType: 'returns' | 'receiving';
    status: string;
  };
  isCurrentShift: boolean;
}) {
  const { theme } = useTheme();
  const isNight = shift.shiftType === "night";
  const isReturns = shift.operationType === "returns";
  
  const [countdown, setCountdown] = useState<number>(0);
  
  useEffect(() => {
    if (!isCurrentShift) return;
    
    const calculateRemaining = () => {
      const now = new Date();
      let endTime: Date;
      
      if (shift.scheduledStart) {
        const startTime = new Date(shift.scheduledStart);
        endTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
      } else {
        const shiftDate = new Date(shift.scheduledDate);
        if (shift.shiftType === 'day') {
          endTime = new Date(shiftDate);
          endTime.setHours(20, 0, 0, 0);
        } else {
          endTime = new Date(shiftDate);
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(8, 0, 0, 0);
        }
      }
      
      const remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      setCountdown(remaining);
    };
    
    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [isCurrentShift, shift.scheduledDate, shift.scheduledStart, shift.shiftType]);
  
  const shiftColor = isNight ? theme.accent : theme.warning;
  const shiftBgColor = isNight ? theme.accentLight : theme.warningLight;
  
  return (
    <View style={[styles.shiftCardCompact, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.shiftIconCompact, { backgroundColor: shiftBgColor }]}>
        <Feather name={isNight ? "moon" : "sun"} size={14} color={shiftColor} />
      </View>
      <View style={styles.shiftInfoCompact}>
        <View style={styles.shiftTopRow}>
          <ThemedText style={styles.shiftTitleCompact}>
            {isCurrentShift ? "Сейчас" : formatShiftDate(shift.scheduledDate)}
          </ThemedText>
          <ThemedText style={[styles.shiftTimeCompact, { color: theme.textSecondary }]}>
            {formatShiftTime(shift.shiftType)}
          </ThemedText>
        </View>
        <View style={styles.shiftBottomRow}>
          <ThemedText style={[styles.shiftTypeText, { color: theme.textSecondary }]}>
            {isNight ? "Ночь" : "День"} • {isReturns ? "Возвраты" : "Приёмка"}
          </ThemedText>
          {isCurrentShift && countdown > 0 && (
            <ThemedText style={[styles.shiftCountdownCompact, { color: shiftColor }]}>
              {formatCountdown(countdown)}
            </ThemedText>
          )}
        </View>
      </View>
      {isCurrentShift && (
        <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
      )}
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
  dayReturnsStats,
  nightReturnsStats,
  dayReceivingStats,
  nightReceivingStats,
}: {
  dayReturnsStats: CombinedShiftStats;
  nightReturnsStats: CombinedShiftStats;
  dayReceivingStats: CombinedShiftStats;
  nightReceivingStats: CombinedShiftStats;
}) {
  const { theme } = useTheme();
  
  const allStats = [dayReturnsStats, nightReturnsStats, dayReceivingStats, nightReceivingStats];
  const hasData = allStats.some(s => s.count > 0);
  
  if (!hasData) return null;

  const maxAvg = Math.max(
    ...allStats.map(s => s.averageEarnings),
    1
  );
  
  const bestAvg = Math.max(...allStats.map(s => s.averageEarnings));
  
  const renderCombinedBar = (
    label: string, 
    shiftIcon: string,
    opIcon: string,
    stats: CombinedShiftStats,
    bgColor: string
  ) => {
    const barWidth = stats.averageEarnings > 0 ? Math.max((stats.averageEarnings / maxAvg) * 100, 5) : 0;
    const isWinner = stats.averageEarnings === bestAvg && stats.count > 0;
    
    return (
      <View style={styles.combinedProfitItem}>
        <View style={styles.combinedProfitHeader}>
          <View style={[styles.combinedIconContainer, { backgroundColor: bgColor }]}>
            <Feather name={shiftIcon as any} size={12} color={theme.text} />
            <Feather name={opIcon as any} size={10} color={theme.textSecondary} style={{ marginLeft: 2 }} />
          </View>
          <View style={styles.combinedProfitLabel}>
            <ThemedText style={[styles.combinedProfitLabelText, { color: theme.text }]}>{label}</ThemedText>
            {isWinner && (
              <View style={[styles.winnerTag, { backgroundColor: theme.success }]}>
                <Feather name="star" size={8} color="#FFF" />
              </View>
            )}
          </View>
          <ThemedText style={[styles.combinedProfitValue, { color: isWinner ? theme.accent : theme.text }]}>
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
        <View style={styles.combinedProfitMeta}>
          <ThemedText style={[styles.profitBarMetaText, { color: theme.textSecondary }]}>
            {stats.count} смен
          </ThemedText>
          <ThemedText style={[styles.profitBarMetaText, { color: theme.textSecondary }]}>
            {formatK(stats.totalEarnings)} ₽ всего
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
      
      <View style={styles.combinedProfitGrid}>
        {renderCombinedBar('Дневные возвраты', 'sun', 'rotate-ccw', dayReturnsStats, theme.warningLight)}
        {renderCombinedBar('Ночные возвраты', 'moon', 'rotate-ccw', nightReturnsStats, theme.accentLight)}
        {renderCombinedBar('Дневная приёмка', 'sun', 'package', dayReceivingStats, theme.warningLight)}
        {renderCombinedBar('Ночная приёмка', 'moon', 'package', nightReceivingStats, theme.accentLight)}
      </View>
    </View>
  );
}

function RecordsCard({
  recordShiftEarnings,
  recordShiftDate,
  bestWeekEarnings,
  bestWeekDate,
  bestMonthEarnings,
  bestMonthDate,
}: {
  recordShiftEarnings: number;
  recordShiftDate: string | null;
  bestWeekEarnings: number;
  bestWeekDate: string | null;
  bestMonthEarnings: number;
  bestMonthDate: string | null;
}) {
  const { theme } = useTheme();
  
  const hasRecords = recordShiftEarnings > 0 || bestWeekEarnings > 0 || bestMonthEarnings > 0;
  
  if (!hasRecords) return null;
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>
        Рекорды
      </ThemedText>
      <View style={styles.recordsCompactGrid}>
        {recordShiftEarnings > 0 && (
          <View style={styles.recordCompactItem}>
            <View style={[styles.recordCompactIcon, { backgroundColor: theme.successLight }]}>
              <Feather name="zap" size={14} color={theme.success} />
            </View>
            <View style={styles.recordCompactContent}>
              <ThemedText style={[styles.recordCompactLabel, { color: theme.textSecondary }]}>
                Лучшая смена
              </ThemedText>
              <ThemedText style={[styles.recordCompactValue, { color: theme.text }]}>
                {formatFullCurrency(recordShiftEarnings)}
              </ThemedText>
            </View>
          </View>
        )}
        {bestWeekEarnings > 0 && (
          <View style={styles.recordCompactItem}>
            <View style={[styles.recordCompactIcon, { backgroundColor: theme.accentLight }]}>
              <Feather name="calendar" size={14} color={theme.accent} />
            </View>
            <View style={styles.recordCompactContent}>
              <ThemedText style={[styles.recordCompactLabel, { color: theme.textSecondary }]}>
                Лучшая неделя
              </ThemedText>
              <ThemedText style={[styles.recordCompactValue, { color: theme.text }]}>
                {formatFullCurrency(bestWeekEarnings)}
              </ThemedText>
            </View>
          </View>
        )}
        {bestMonthEarnings > 0 && (
          <View style={styles.recordCompactItem}>
            <View style={[styles.recordCompactIcon, { backgroundColor: theme.warningLight }]}>
              <Feather name="award" size={14} color={theme.warning} />
            </View>
            <View style={styles.recordCompactContent}>
              <ThemedText style={[styles.recordCompactLabel, { color: theme.textSecondary }]}>
                Лучший месяц
              </ThemedText>
              <ThemedText style={[styles.recordCompactValue, { color: theme.text }]}>
                {formatFullCurrency(bestMonthEarnings)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function AmountForecastCard({
  dailyAverage,
  averagePerShift,
}: {
  dailyAverage: number;
  averagePerShift: number;
}) {
  const { theme } = useTheme();
  const [targetAmount, setTargetAmount] = useState(100000);
  
  const amounts = [50000, 100000, 200000, 500000];
  
  const hasData = dailyAverage > 0 || averagePerShift > 0;
  const effectiveAverage = dailyAverage > 0 ? dailyAverage : averagePerShift;
  
  if (!hasData) return null;
  
  const daysNeeded = Math.ceil(targetAmount / effectiveAverage);
  const targetDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.forecastHeader}>
        <ThemedText style={[styles.cardTitle, { color: theme.textSecondary }]}>
          Прогноз заработка
        </ThemedText>
        <View style={[styles.avgIndicator, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={[styles.avgIndicatorText, { color: theme.textSecondary }]}>
            ~{formatK(effectiveAverage)} ₽/день
          </ThemedText>
        </View>
      </View>
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
      <View style={styles.forecastResultCompact}>
        <View style={styles.forecastMainInfo}>
          <Feather name="target" size={24} color={theme.accent} />
          <View style={styles.forecastMainText}>
            <ThemedText style={[styles.forecastDaysValueCompact, { color: theme.accent }]}>
              ~{daysNeeded} {pluralizeDays(daysNeeded)}
            </ThemedText>
            <ThemedText style={[styles.forecastDateCompact, { color: theme.success }]}>
              {formatFullDate(targetDate)}
            </ThemedText>
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
  
  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const leftPercent = interpolate(indicatorX.value, [0, 1], [1, 51]);
    return {
      left: `${leftPercent}%`,
    };
  });

  const chartData = useMemo(() => {
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const result: { label: string; value: number; date: string }[] = [];
    const today = new Date();
    
    const earningsMap = new Map<string, number>();
    if (stats?.dailyEarningsHistory) {
      for (const item of stats.dailyEarningsHistory) {
        const dateKey = item.date.split('T')[0];
        earningsMap.set(dateKey, item.amount);
      }
    }
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const amount = earningsMap.get(dateKey) || 0;
      
      result.push({
        label: days[d.getDay()],
        value: amount,
        date: d.toISOString(),
      });
    }
    
    return result;
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

  const hasNoData = !stats?.completedShiftsCount && !stats?.totalEarnings;

  if (hasNoData) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundContent, borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"] }]}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing.xl + insets.bottom,
          flex: 1,
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

        <View style={styles.emptyStateContainer}>
          <View style={[styles.emptyStateIcon, { backgroundColor: theme.accentLight }]}>
            <Feather name="bar-chart-2" size={32} color={theme.accent} />
          </View>
          <ThemedText type="h4" style={styles.emptyStateTitle}>
            Нет данных
          </ThemedText>
          <ThemedText type="body" style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Здесь появится статистика после того, как вы завершите хотя бы одну смену
          </ThemedText>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundContent, borderTopLeftRadius: BorderRadius["2xl"], borderTopRightRadius: BorderRadius["2xl"] }]}
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
        <BarChart data={chartData} color={theme.accent} bgColor={theme.accentLight} streak={stats?.streak} />
      </View>

      <WeeklyComparison thisWeek={weeklyStats.thisWeek} lastWeek={weeklyStats.lastWeek} />

      {stats?.goalForecasts && stats.goalForecasts.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.goalSectionHeader}>
            <ThemedText style={[styles.cardTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
              Прогноз достижения целей
            </ThemedText>
            {stats.averagePerShift > 0 && (
              <View style={[styles.avgBadge, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={[styles.avgBadgeText, { color: theme.textSecondary }]}>
                  ~{formatK(stats.averagePerShift)} ₽/смену
                </ThemedText>
              </View>
            )}
          </View>
          {stats.goalForecasts.map((forecast) => (
            <GoalForecastCard key={forecast.goalId} forecast={forecast} />
          ))}
        </View>
      )}

      <ShiftTypeProfitability
        dayReturnsStats={stats?.dayReturnsStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        nightReturnsStats={stats?.nightReturnsStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        dayReceivingStats={stats?.dayReceivingStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
        nightReceivingStats={stats?.nightReceivingStats || { count: 0, totalEarnings: 0, averageEarnings: 0 }}
      />

      <RecordsCard
        recordShiftEarnings={stats?.recordShiftEarnings || 0}
        recordShiftDate={stats?.recordShiftDate || null}
        bestWeekEarnings={stats?.bestWeekEarnings || 0}
        bestWeekDate={stats?.bestWeekDate || null}
        bestMonthEarnings={stats?.bestMonthEarnings || 0}
        bestMonthDate={stats?.bestMonthDate || null}
      />

      <AmountForecastCard 
        dailyAverage={stats?.dailyAverageEarnings || 0} 
        averagePerShift={stats?.averagePerShift || 0}
      />

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <StatItem
          icon="trending-up"
          label="Средний за смену"
          value={formatK(stats?.averagePerShift || 0) + " ₽"}
          color={theme.accent}
          bgColor={theme.accentLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatItem
          icon="clock"
          label="Запланировано"
          value={String(stats?.shiftsByType.future || 0)}
          color={theme.accent}
          bgColor={theme.accentLight}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <StatItem
          icon="dollar-sign"
          label="Свободный баланс"
          value={formatK(stats?.freeBalance || 0) + " ₽"}
          color={theme.accent}
          bgColor={theme.accentLight}
        />
      </View>
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
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyStateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    textAlign: "center",
    lineHeight: 22,
  },
  periodTabs: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 3,
    marginBottom: Spacing.md,
    position: "relative",
  },
  periodIndicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    width: "48%",
    borderRadius: BorderRadius.sm - 2,
  },
  periodTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    zIndex: 1,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "600",
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
    borderRadius: BorderRadius.sm,
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
  chartWrapper: {
    marginTop: Spacing.sm,
  },
  chartValuesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    height: 20,
    marginBottom: 4,
  },
  chartValueCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 80,
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
  },
  bar: {
    width: 28,
    borderRadius: 6,
    minHeight: 4,
  },
  chartLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 6,
  },
  chartLabelCell: {
    flex: 1,
    alignItems: "center",
  },
  barLabel: {
    fontSize: 10,
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
  },
  chartFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  streakBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  streakBadgeTextInline: {
    fontSize: 10,
    fontWeight: "500",
  },
  avgRowInline: {
    flexDirection: "row",
    alignItems: "center",
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
  shiftCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  shiftIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftInfoCompact: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  shiftTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  shiftTitleCompact: {
    fontSize: 13,
    fontWeight: "600",
  },
  shiftTimeCompact: {
    fontSize: 11,
  },
  shiftTypeText: {
    fontSize: 11,
  },
  shiftCountdownCompact: {
    fontSize: 11,
    fontWeight: "600",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
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
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  streakIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  streakContent: {
    flex: 1,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  streakLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  shiftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveNowText: {
    fontSize: 11,
    fontWeight: "500",
  },
  countdownText: {
    fontSize: 11,
    marginTop: 2,
  },
  combinedProfitGrid: {
    gap: Spacing.md,
  },
  combinedProfitItem: {
    marginBottom: Spacing.xs,
  },
  combinedProfitHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  combinedIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  combinedProfitLabel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  combinedProfitLabelText: {
    fontSize: 13,
    fontWeight: "500",
  },
  combinedProfitValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  combinedProfitMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  recordsCompactGrid: {
    gap: Spacing.sm,
  },
  recordCompactItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordCompactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  recordCompactContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordCompactLabel: {
    fontSize: 13,
  },
  recordCompactValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  forecastHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  avgIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avgIndicatorText: {
    fontSize: 10,
    fontWeight: "500",
  },
  forecastResultCompact: {
    paddingVertical: Spacing.sm,
  },
  forecastMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  forecastMainText: {
    flex: 1,
  },
  forecastDaysValueCompact: {
    fontSize: 20,
    fontWeight: "700",
  },
  forecastDateCompact: {
    fontSize: 12,
    fontWeight: "500",
  },
  goalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  avgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avgBadgeText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
