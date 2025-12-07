# Financial Goals Tracker App

## Overview
A mobile application for tracking financial goals and work shifts. Built with Expo and React Native for iOS, Android, and web platforms.

## Current State
**Version:** 1.0.0 (Initial Setup)
**Status:** Skeleton/Framework complete

The app is in its initial skeleton state with the following 4 tabs implemented:
1. **Цели (Goals)** - For tracking financial goals with empty state
2. **Смены (Shifts)** - For logging work shifts with empty state
3. **Статистика (Statistics)** - For viewing analytics with placeholder charts
4. **Настройки (Settings)** - For app configuration and user profile

## Project Architecture

### File Structure
```
client/
├── components/          # Reusable UI components
│   ├── BalanceHeader.tsx    # Header with month, balance, and avatar
│   ├── Button.tsx           # Button component
│   ├── Card.tsx             # Card component with press animation
│   ├── ErrorBoundary.tsx    # Error boundary wrapper
│   ├── ErrorFallback.tsx    # Error fallback UI
│   ├── HeaderTitle.tsx      # Custom header title
│   ├── KeyboardAwareScrollViewCompat.tsx
│   ├── Spacer.tsx           # Spacing component
│   ├── ThemedText.tsx       # Text with theme support
│   └── ThemedView.tsx       # View with theme support
├── constants/
│   └── theme.ts             # Colors, spacing, typography, shadows
├── hooks/
│   ├── useColorScheme.ts
│   ├── useScreenOptions.ts
│   └── useTheme.ts
├── lib/
│   └── query-client.ts
├── navigation/
│   ├── MainTabNavigator.tsx # 4-tab bottom navigation
│   └── RootStackNavigator.tsx
├── screens/
│   ├── GoalsScreen.tsx      # Goals list with FAB
│   ├── ShiftsScreen.tsx     # Shifts list with FAB
│   ├── StatisticsScreen.tsx # Charts and metrics
│   └── SettingsScreen.tsx   # Settings and profile
├── App.tsx                  # Main app entry
└── index.js
```

### Navigation Structure
- Bottom Tab Navigator with 4 tabs
- Transparent headers on Goals, Shifts, Statistics screens
- Opaque header on Settings screen
- Custom BalanceHeader component shared across first 3 tabs

### Design System (Dribbble-Quality)
- **Colors:** Blue accent (#3B82F6), pastel accents (#E0E7FF, #C7D2FE), root background (#F8FAFC)
- **Typography:** System fonts with hierarchy (32sp h1, 24sp h3, 16sp body, 14sp small)
- **Spacing:** Scale from xs(4dp) to 5xl(48dp), 24dp between cards
- **Shadows:** Soft shadows using #F1F5F9 at 10-15% opacity
- **Border Radius:** 12-16dp for cards, smooth rounded corners

## Development

### Running the App
```bash
npm run all:dev
```
This starts both the Expo dev server (port 8081) and Express backend (port 5000).

### Testing
- **Web:** Open http://localhost:8081
- **Mobile:** Scan QR code with Expo Go app

## Recent Changes
- **Statistics Screen Enhancement (Dec 7, 2025):**
  - Added GoalForecastCard with estimated completion dates
  - Added GoalsTimelineCard with visual timeline for goal forecasts
  - Added ShiftTypeProfitability comparing Day/Night and Returns/Receiving shifts
  - Added RecordsCard showing best week, month, and single shift earnings with emojis
  - Added AmountForecastCard for custom amount forecasts (50K, 100K, 200K, 500K)
  - Balance header now right-aligned for better visual hierarchy
  - Fixed TypeScript config for proper JSX support
  - Fixed Date serialization for React Query compatibility
- **Design Overhaul (Dec 2025):** Dribbble-quality aesthetic applied
  - Soft shadows (#F1F5F9, 10-15% opacity)
  - Blue accent system (#3B82F6 primary, pastel variants)
  - Increased card spacing to 24dp
  - Airy backgrounds (#F8FAFC root, #FFFFFF cards)
- Created 4-tab navigation structure
- Implemented goals and shifts management
- Added full Statistics screen with analytics
- Added Settings screen with profile and settings groups
- Generated app icon with blue-teal gradient
- Updated color theme for light/dark mode support

## API Features (client/api/index.ts)
- **useEarningsStats**: Returns comprehensive earnings statistics including:
  - Day/Night shift statistics with counts, totals, and averages
  - Returns/Receiving operation type statistics
  - Record shift earnings (best single shift)
  - Best week and month earnings with dates
  - Goal forecasts with estimated completion dates
  - Daily average earnings for forecasting

## Next Steps (Future Development)
1. Add user authentication
2. Add notifications for goal milestones
3. Add export functionality for reports
4. Add calendar view for shift planning
5. Add comparison charts between periods
