import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Activity, LogEntry } from '../features/attendance/attendanceService';
import { todayStr } from '../utils/dateUtils';

const EVENING_HOUR = 21;
const EVENING_MINUTE = 0;

/**
 * How many evenings ahead we pre-schedule. Each one is a separate one-shot so
 * that tonight's reminder can name only what is still unlogged while later ones
 * fall back to the full list. The window is refreshed on every app open, so it
 * only has to cover a stretch of days where the app is never launched.
 */
const EVENING_SCHEDULE_DAYS = 14;

/** Channel for alarm-style habit reminders. Android channels can't be changed after creation, so never repurpose this id. */
const ALARM_CHANNEL_ID = 'habit-alarm';

/**
 * Minutes after an alarm-style reminder at which it rings again. Logging the
 * habit reschedules everything, which drops the follow-ups still pending today.
 */
const ALARM_FOLLOW_UP_MINUTES = [5, 10, 15];

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestPermissionsAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Habit alarms',
      description: 'Alarm-style habit reminders that ring until you log',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      // Honoured only if the user grants Do Not Disturb access in system settings.
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }
  return false;
};

/**
 * Schedules a single evening reminder naming `pending`, or a congratulatory
 * message when nothing is left to log.
 */
const scheduleEveningReminder = async (date: Date, pending: Activity[]) => {
  const content =
    pending.length > 0
      ? {
          title: 'Evening Check-in 🌙',
          body: `Don't forget to log: ${pending.map((a) => a.name).join(', ')}`,
        }
      : {
          title: 'Great job today! 🎉',
          body: 'All activities logged. Keep the streak going!',
        };

  await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'default',
    },
  });
};

/**
 * Schedules each of `activity`'s reminders as one-shots over the same window
 * as the evening check-in. One-shots rather than a DAILY trigger so today's
 * can be dropped once the habit is logged — a repeating trigger would still
 * fire after the user had already done it.
 */
const scheduleHabitReminders = async (activity: Activity, loggedToday: boolean, now: Date) => {
  for (const reminder of activity.reminders ?? []) {
    const [hour, minute] = reminder.time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    for (let dayOffset = 0; dayOffset < EVENING_SCHEDULE_DAYS; dayOffset++) {
      if (dayOffset === 0 && loggedToday) continue;

      const baseAt = new Date(now);
      baseAt.setDate(baseAt.getDate() + dayOffset);
      baseAt.setHours(hour, minute, 0, 0);

      const offsets = reminder.alarm ? [0, ...ALARM_FOLLOW_UP_MINUTES] : [0];
      for (const offset of offsets) {
        const fireAt = new Date(baseAt.getTime() + offset * 60_000);
        if (fireAt <= now) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: offset === 0 ? `⏰ ${activity.name}` : `⏰ ${activity.name} — still not logged`,
            body: reminder.message?.trim() || `Time for ${activity.name}. Keep the streak going!`,
            data: { activityId: activity.id },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: true,
            sticky: !!reminder.alarm,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: reminder.alarm ? ALARM_CHANNEL_ID : 'default',
          },
        });
      }
    }
  }
};

export const rescheduleAllNotifications = async (
  activities: Activity[],
  logs: Record<string, LogEntry[]>,
) => {
  // 1. Cancel all existing notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Schedule Morning Reminder — repeating daily at 10:00 AM local time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good Morning! 🌅',
      body: 'Time to check in on your streaks!',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
      channelId: 'default',
    },
  });

  // Completed activities are no longer being tracked, so they can never count
  // as "unlogged" and must never be named in a reminder.
  const activeActivities = activities.filter((a) => !a.completedAt);
  if (activeActivities.length === 0) return;

  const today = todayStr();
  const unloggedToday = activeActivities.filter((a) => {
    const activityLogs = logs[a.id] || [];
    // Use the locked .date field — no timezone parsing needed
    return !activityLogs.some((entry) => entry.date === today);
  });
  const now = new Date();

  // 3. Evening reminders — exactly one per evening, each a one-shot so its body
  //    can differ per day. This function runs on every app open and on every
  //    log (useNotifications hook), so the whole window is rebuilt with fresh
  //    state each time and tonight's entry always names only what is still
  //    outstanding.
  for (let dayOffset = 0; dayOffset < EVENING_SCHEDULE_DAYS; dayOffset++) {
    const fireAt = new Date(now);
    fireAt.setDate(fireAt.getDate() + dayOffset);
    fireAt.setHours(EVENING_HOUR, EVENING_MINUTE, 0, 0);

    // Tonight's slot has already passed — the next reminder is tomorrow's.
    if (fireAt <= now) continue;

    // Only today's state is known. Nothing can get logged on a later day
    // without the app being opened, and opening it rebuilds this window, so
    // every active activity is still outstanding on those days.
    await scheduleEveningReminder(fireAt, dayOffset === 0 ? unloggedToday : activeActivities);
  }

  // 4. Per-habit reminders at the times the user picked.
  for (const activity of activeActivities) {
    await scheduleHabitReminders(activity, !unloggedToday.includes(activity), now);
  }

  // 5. Alarm-style reminders are sticky, so one already showing would sit in
  //    the tray after its habit got logged. Clear those out.
  const done = new Set(activities.filter((a) => !unloggedToday.includes(a)).map((a) => a.id));
  const presented = await Notifications.getPresentedNotificationsAsync();
  for (const n of presented) {
    const activityId = n.request.content.data?.activityId;
    if (typeof activityId === 'string' && done.has(activityId)) {
      await Notifications.dismissNotificationAsync(n.request.identifier);
    }
  }
};
