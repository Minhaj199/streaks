# Daily Progress & Notes — Requirements

## 1. Daily Log

Each habit should have a separate log for each date.

A daily log can contain:

- Completion status
- Progress value
- Optional note
- Date

Example:

```text
September 23
✓ Completed
Push-ups: 20
Note: Felt good today

September 24
✓ Completed
Push-ups: 22
Note: Increased by 2
```

---

## 2. Optional Progress Tracking

A habit can optionally have a **progress metric**.

When creating or editing a habit, the user can choose whether they want to track progress.

Example:

```text
Habit: Exercise

Progress tracking: ON

Metric name: Push-ups
Unit: reps
```

The metric should be customizable rather than hard-coded to workouts.

Examples:

| Habit          | Metric   |  Example |
| -------------- | -------- | -------: |
| Exercise       | Push-ups |  20 reps |
| Running        | Distance |     5 km |
| Reading        | Pages    | 30 pages |
| Meditation     | Duration |   20 min |
| Coding         | Problems |        3 |
| Drinking water | Amount   |    2.5 L |

---

## 3. Previous Progress

When entering today's progress, show the previous recorded value if available.

Example:

```text
Today's progress

Push-ups
[ 22 ]

Previous: 20 reps
Change: +2 reps
```

If there is no previous value:

```text
No previous progress recorded
```

---

## 4. Optional Notes

Users should be able to add a free-text note to each day's log.

Example:

```text
Progress
22 reps

Note
"Felt stronger today."
```

The note should be **optional**.

---

## 5. Calendar Integration

The existing Calendar screen should allow users to open a specific day's log.

Example:

```text
September 24
✓ Logged
```

When tapped:

```text
Log Details

Date: September 24

Status: ✓ Completed

Progress:
22 push-ups

Note:
Felt stronger today.
```

If no progress or note exists:

```text
Progress:
Not recorded

Note:
No notes yet
```

---

## 6. Editing Historical Logs

Users should be able to add or edit the progress/note for a previously logged day.

Example:

```text
Sep 23
20 push-ups
```

Later, the user realizes it was actually:

```text
Sep 23
22 push-ups
```

They should be able to edit the value.

The existing backfill rules should continue to apply when changing the **completion status** of missed dates.

---

## 7. Stats / Progress History

If progress tracking is enabled for a habit, the Stats screen should eventually be able to show the recorded values over time.

Example:

```text
Push-ups

20 → 22 → 25 → 25 → 28
```

A chart can be added later. It does not need to be part of the first implementation unless explicitly desired.

---

## 8. Data Model

Conceptually:

```text
Habit
 ├── id
 ├── name
 ├── progressTrackingEnabled
 ├── metricName
 └── unit

DailyLog
 ├── id
 ├── habitId
 ├── date
 ├── completed
 ├── progressValue
 └── note
```

The important relationship is:

```text
Habit
  ↓
Many Daily Logs
  ↓
One log per date
```

---

## 9. Important Behavior

- Progress is **optional**.
- Notes are **optional**.
- A habit can still work normally without progress tracking.
- Progress should not affect whether the habit counts toward a streak.
- Completing a habit and recording progress are separate concepts.
- Editing progress should not accidentally change the streak.
- Historical progress should remain associated with its original date.
- Deleting/editing a habit should follow the app's existing data-management rules.

---

## 10. Example Final Experience

```text
Exercise

Today
────────────────────

✓ Completed

Progress
Push-ups
22 reps

Previous
20 reps
+2 reps

Note
Felt stronger today.

              Save
```

History:

```text
Sep 21   ✓   18 reps
Sep 22   ✓   20 reps
Sep 23   ✓   20 reps
Sep 24   ✓   22 reps
```

This feature should provide a foundation for future progress charts, personal records, averages, and improvement tracking without making the core habit/streak system dependent on workout-specific logic.
