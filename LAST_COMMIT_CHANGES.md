# Pull Request Description

## Summary

Add independent daily reminders for each habit.

## Changes Made

### Per-Habit Reminder Settings

- Added optional reminder fields to each activity:
  - `reminderEnabled`
  - `reminderTime`
  - `reminderMessage`
- Added reminder controls to the existing habit settings screen.
- Persisted reminder settings with the existing activity data in AsyncStorage.
- Kept reminder configuration independent between habits.

### Notification Scheduling

- Schedules one daily reminder per enabled habit.
- Uses the habit name as the notification title.
- Uses the configured message, or a default completion prompt.
- Skips the current day's reminder when the habit is already logged.
- Cancels all existing scheduled notifications before rebuilding the schedule.
- Changing a reminder, disabling it, deleting a habit, or restarting the app does not leave stale scheduled reminders behind.
- Existing global morning and evening notifications remain unchanged.

### Permissions

- Reuses the existing notification permission and Android notification channel flow.
- Does not add a second permission mechanism.

## How to Configure

1. Open a habit.
2. Open **Habit settings**.
3. Enable **Reminder**.
4. Set the time and optional message.
5. Press **Save**.

Each habit can have a different reminder time and message.

## Limitations

- Notification taps do not navigate to a habit because the app did not previously have notification deep-link handling.
- Reminders are scheduled as a rolling 14-day one-shot window and rebuilt when the app state changes.

## Files Changed

- `src/features/attendance/attendanceService.ts`
- `src/screens/ActivitySettingsScreen.tsx`
- `src/services/notificationService.ts`
- `src/store/attendanceStore.ts`

## Validation

- TypeScript check passed with `pnpm check`.
- ESLint passed for `src` with `pnpm exec eslint src --no-cache`.
- Focused editor diagnostics reported no errors in the modified files.
