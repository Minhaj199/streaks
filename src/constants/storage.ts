// ─── AsyncStorage Keys ───────────────────────────────────────────────────────
// Single source of truth for all AsyncStorage keys used in the app.
export const StorageKeys = {
  ACTIVITIES: 'streak_activities',
  LOGS: 'streak_logs',
  NOTES: 'streak_notes',
  PROGRESS: 'streak_progress',
  TASK_HISTORY: 'streak_task_history',
  THEME: '@streak_counter_theme',
  CONFETTI: '@streak_counter_confetti',
  HIDE_EXTRA_DAYS: '@streak_counter_hide_extra_days',
  HAPTICS: '@streak_counter_haptics',
  SEQUENCE_SKIPS: 'streak_sequence_skips',
  SEQUENCE_DROPS: 'streak_sequence_drops',
  AUTO_BACKUP_ENABLED: '@streak_counter_auto_backup_enabled',
  LAST_SUCCESSFUL_BACKUP_AT: '@streak_counter_last_successful_backup_at',
} as const;
