# Financial Goals Tracker App

## Overview
A mobile application for tracking financial goals and work shifts. Built with Expo and React Native for iOS, Android, and web platforms.

## Current State
**Version:** 1.1.0 (Authentication Update)
**Status:** Production-ready with multi-user authentication

The app features full Supabase Auth integration with multi-user support. Each user has isolated data storage for goals, shifts, and allocations. The following 4 tabs are implemented:
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
- **Balance Display Settings (Dec 8, 2025):**
  - Added inline balance position selector with 4 compact buttons (left, center, right + hide toggle)
  - Balance updates immediately when user selects a position
  - SettingsContext with localStorage persistence for app settings
  - Removed modal in favor of inline controls for better UX
- **Delete All Data Fix (Dec 8, 2025):**
  - Fixed bug in useDeleteAllData - goal_allocations table doesn't have user_id column
  - Now properly deletes allocations through related shifts first
  - Added error handling for shifts selection query
- **Auto-allocation Feature (Dec 8, 2025):**
  - Added `allocation_percentage` field to goals table (0-100%)
  - New Auto-allocation settings UI in Profile/Settings screen with sliders
  - RecordEarningsModal now auto-fills goal allocations based on configured percentages
  - Auto-allocation recalculates on every earnings amount change
  - Manual edits to allocations are preserved and not overwritten
  - Visual "auto" indicator shows when allocations are auto-calculated
  - Allocations are capped to goal remaining amounts
- **Statistics Screen UI Polish (Dec 7, 2025):**
  - Removed "Не распределён на цели" subtitle from Free Balance stat
  - Fixed daily income chart to show real calendar (last 7 days with correct dates)
  - Compact streak badge: "X смен подряд" instead of large banner
  - Removed yearly statistics option (only Week/Month now)
  - Replaced "LIVE" badge with "идёт сейчас" + countdown timer showing HH:MM:SS until shift end
  - Countdown uses scheduledStart + 12h for accurate end time calculation
- **Statistics Screen Major Redesign (Dec 7, 2025):**
  - Enhanced Goal Achievement Forecast with average earnings badge (shows "Avg ₽X/shift")
  - Combined Shift Profitability: 4 categories (Day Returns, Night Returns, Day Receiving, Night Receiving)
  - Compact Records section with inline layout and emoji icons
  - Dynamic Amount Forecast showing real average daily earnings
  - Unified icon styling - all stat icons now use theme accent color
  - Removed "Until all goals" banner at bottom
  - Added StreakBanner at top showing work days streak with new styling
  - Removed GoalsTimelineCard in favor of enhanced forecast section
  - Added CombinedShiftStats API type for combined shift analytics
- **Previous Statistics Screen Enhancement (Dec 7, 2025):**
  - Daily Income chart: Added dates under each bar for better readability
  - Shift Type Profitability: Clean monochrome design with horizontal bar charts
  - Records section: Horizontal scrollable card layout with emoji icons
  - All sections follow consistent theme colors (no hardcoded colors)
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

## Authentication System (Dec 8, 2025)
- **Supabase Auth Integration**: Full email/password authentication with Supabase
- **Multi-user Data Isolation**: All API queries use `getCurrentUserId()` for user-scoped data access
- **AuthContext**: React context providing `user`, `session`, `signIn`, `signUp`, `signOut` functions
- **AuthScreen**: Login/registration screen in Russian with validation and error handling
- **React Query Cache Clearing**: Cache is cleared on sign-out to prevent data leakage between users
- **Logout Button**: Added "Выйти из аккаунта" option in Settings screen
- **User Profile Display**: Email displayed in Settings screen profile section

### Guest Mode & Data Migration (Dec 8, 2025)
- **Guest Mode Support**: Users can use the app without authentication with localStorage-based storage
- **Automatic Data Migration**: When guests sign up/sign in, local data migrates to cloud automatically
- **Idempotent Migration**: Duplicate detection using composite keys (goals: name|target_amount, shifts: date|type|operation)
- **Balance Safety**: Balance only added when new data actually migrates (no inflation on retries)
- **Snapshot Preservation**: Data captured before auth calls to prevent race conditions during session upgrade
- **Guest Mode Limitations**: Statistics screen shows empty data in guest mode (advanced analytics require account)
- **Key Files**:
  - `client/lib/localStorage.ts` - Local storage service with HAS_LOCAL_DATA markers
  - `client/lib/dataMigration.ts` - Migration logic with duplicate detection and ID mapping
  - `client/contexts/AuthContext.tsx` - Captures snapshot and triggers migration on auth
  - `client/contexts/DataModeContext.tsx` - Provides mode context (local vs cloud) to all components
  - `client/lib/dataService.ts` - Unified data service that routes to local or cloud storage based on mode

## Next Steps (Future Development)
1. Add notifications for goal milestones
2. Add export functionality for reports
3. Add calendar view for shift planning
4. Add comparison charts between periods
5. Add password reset flow
6. Add social authentication (Google, Apple)
