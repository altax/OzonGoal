# Design Guidelines: Financial Goals Tracking App

## Architecture Decisions

### Authentication
**No Auth Required** - This is a single-user financial tracking app with local data storage.

**Profile/Settings Implementation:**
- Include customizable user profile in Settings screen
- Generate 1 preset avatar (professional money/finance themed icon)
- Display name field
- App preferences (currency, language, theme)

### Navigation Architecture
**Tab Navigation (4 Tabs)**

The app uses bottom tab navigation with 4 distinct feature areas:
1. **Цели (Goals)** - Track financial goals
2. **Смены (Shifts)** - Log work shifts and income
3. **Статистика (Statistics)** - View analytics and charts
4. **Настройки (Settings)** - App settings and user profile

**Tab Bar Specifications:**
- Modern, elevated design with subtle shadow
- Height: 65px
- Background: Semi-transparent blur effect (white with 95% opacity)
- Active tab indicator: Accent color pill background behind icon + label
- Inactive tabs: Muted gray icons with no label
- Active tab: Full color icon with visible label below
- Icon size: 24x24px
- Label typography: 11px, medium weight
- Spacing between icon and label: 4px
- Corner radius on tab bar: 20px (rounded top corners only)

## Screen Specifications

### Global Header (All Screens)
**Custom transparent header component:**
- Height: Dynamic (insets.top + 60px)
- Background: Transparent or subtle gradient
- Left section: Current month display (e.g., "Декабрь 2024")
- Center section: Balance display with prominent typography
- Right section: User avatar (40x40px, circular)
- Typography: Month is 14px regular, Balance is 24px bold

### 1. Цели (Goals) Screen
**Purpose:** Display and manage financial goals

**Layout:**
- Custom transparent header (global header)
- Scrollable list view
- Empty state placeholder: "Нет целей" with add button prompt
- Safe area insets: 
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Goal cards (will contain goal data in future)
- Floating action button (+) for adding goals
  - Position: Bottom right, 16px from edges
  - Size: 56x56px circular
  - Shadow specs: offset {width: 0, height: 2}, opacity: 0.10, radius: 2

### 2. Смены (Shifts) Screen
**Purpose:** Track work shifts and earnings

**Layout:**
- Custom transparent header (global header)
- Scrollable list/calendar view
- Empty state placeholder
- Safe area insets:
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Shift entry cards (skeleton)
- Calendar integration area
- Add shift button

### 3. Статистика (Statistics) Screen
**Purpose:** View financial analytics

**Layout:**
- Custom transparent header (global header)
- Scrollable content area
- Chart placeholders (skeleton rectangles)
- Safe area insets:
  - Top: headerHeight + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Chart container cards (3-4 placeholder areas)
- Time period selector (Month/Year toggle)
- Key metrics cards

### 4. Настройки (Settings) Screen
**Purpose:** App configuration and user profile

**Layout:**
- Default navigation header with title "Настройки"
- Scrollable form/list
- Safe area insets:
  - Top: Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Profile section (avatar, name field)
- Settings groups (Currency, Language, Notifications, Theme)
- List items with right chevron for navigation

## Design System

### Color Palette
**Primary Colors:**
- Accent: #4CAF50 (Money/growth green) or #2196F3 (Trust blue)
- Background: #F8F9FA (Light gray)
- Surface: #FFFFFF
- Text Primary: #1A1A1A
- Text Secondary: #6B7280

**Semantic Colors:**
- Success: #4CAF50
- Warning: #FF9800
- Error: #F44336
- Income: #4CAF50
- Expense: #F44336

**Tab Bar Colors:**
- Active: Accent color
- Inactive: #9E9E9E
- Background: rgba(255, 255, 255, 0.95) with blur

### Typography
**Font Family:** System default (SF Pro for iOS, Roboto for Android)

**Hierarchy:**
- Header Large: 24px, Bold (Balance display)
- Header Medium: 18px, Semibold (Screen titles)
- Body: 16px, Regular (Main content)
- Caption: 14px, Regular (Month, subtitles)
- Tab Label: 11px, Medium

### Visual Design

**Card Components:**
- Background: White
- Corner radius: 16px
- Border: None or 1px solid #E5E7EB
- Shadow: offset {width: 0, height: 1}, opacity: 0.05, radius: 4
- Padding: 16px
- Spacing between cards: 12px

**Touchable Feedback:**
- Standard elements: Subtle opacity change (0.7) on press
- Cards: Scale down to 0.98 on press
- Buttons: Slight background darkening on press

**Floating Action Button:**
- Background: Accent color
- Icon: White plus symbol (Feather icons)
- Size: 56x56px
- Shadow: offset {width: 0, height: 2}, opacity: 0.10, radius: 2

**Icons:**
- Use Feather icons from @expo/vector-icons
- Tab icons: home, briefcase, bar-chart-2, settings
- Size: 24x24px for tabs, 20x20px for list items

### Spacing System
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- xxl: 32px

### Assets Required
1. **User Avatar Preset** (1 avatar)
   - Style: Minimalist, finance-themed
   - Suggestion: Simple geometric wallet or coin icon
   - Format: Circular, 100x100px base size

**No other custom assets needed** - use system icons for all navigation and actions.