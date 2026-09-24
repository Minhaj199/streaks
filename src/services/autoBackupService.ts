import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as FileSystem from 'expo-file-system/legacy';
import * as TaskManager from 'expo-task-manager';
import { StorageKeys } from '../constants';
import { attendanceService } from '../features/attendance/attendanceService';

export const AUTO_BACKUP_TASK_NAME = 'streak-auto-backup';

export const getAutoBackupEnabled = async (): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.AUTO_BACKUP_ENABLED);
    return raw ? JSON.parse(raw) : false;
  } catch {
    return false;
  }
};

export const setAutoBackupEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(StorageKeys.AUTO_BACKUP_ENABLED, JSON.stringify(enabled));
  } catch {
    // Best effort: the toggle still reflects the app state even if storage fails.
  }
};

export const getLastSuccessfulBackupAt = async (): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(StorageKeys.LAST_SUCCESSFUL_BACKUP_AT);
    return value ?? null;
  } catch {
    return null;
  }
};

export const setLastSuccessfulBackupAt = async (timestamp: string | null): Promise<void> => {
  try {
    if (timestamp === null) {
      await AsyncStorage.removeItem(StorageKeys.LAST_SUCCESSFUL_BACKUP_AT);
      return;
    }
    await AsyncStorage.setItem(StorageKeys.LAST_SUCCESSFUL_BACKUP_AT, timestamp);
  } catch {
    // Best effort: the app still keeps the in-memory timestamp for active use.
  }
};

export const isAutoBackupDue = (
  lastSuccessfulBackupAt: string | null,
  now: Date = new Date(),
): boolean => {
  if (!lastSuccessfulBackupAt) return true;

  const last = new Date(lastSuccessfulBackupAt);
  if (Number.isNaN(last.getTime())) return true;

  return now.getTime() - last.getTime() >= 24 * 60 * 60 * 1000;
};

export const runBackupWrite = async (): Promise<boolean> => {
  try {
    const dataStr = await attendanceService.exportData();
    const fileUri = FileSystem.documentDirectory + 'streak_backup.json';
    await FileSystem.writeAsStringAsync(fileUri, dataStr, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await setLastSuccessfulBackupAt(new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Auto backup failed', error);
    return false;
  }
};

export const performAutoBackup = async (): Promise<boolean> => {
  const enabled = await getAutoBackupEnabled();
  if (!enabled) return false;

  const lastSuccessfulBackupAt = await getLastSuccessfulBackupAt();
  if (!isAutoBackupDue(lastSuccessfulBackupAt)) return false;

  return runBackupWrite();
};

TaskManager.defineTask(AUTO_BACKUP_TASK_NAME, async () => {
  try {
    const executed = await performAutoBackup();
    return executed
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerAutoBackupTask = async (): Promise<void> => {
  const enabled = await getAutoBackupEnabled();
  if (!enabled) {
    await unregisterAutoBackupTask();
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUTO_BACKUP_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(AUTO_BACKUP_TASK_NAME, {
        minimumInterval: 60 * 60 * 24,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {
    console.error('Failed to register auto backup task', error);
  }
};

export const unregisterAutoBackupTask = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUTO_BACKUP_TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(AUTO_BACKUP_TASK_NAME);
    }
  } catch (error) {
    console.error('Failed to unregister auto backup task', error);
  }
};
