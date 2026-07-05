import { LocalNotifications } from '@capacitor/local-notifications';
import { Settings } from '../types';

export type NotificationType =
  | 'upcomingReminders'
  | 'dueNow'
  | 'missedDoses'
  | 'lowInventory'
  | 'deviceDisconnected'
  | 'wifiDisconnected'
  | 'diagnosticsWarnings'
  | 'hardwareFaults';

export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    try {
      // 1. Try Capacitor local notifications
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
          return true;
        }
      }
    } catch (e) {
      console.warn('Capacitor notifications permission request failed:', e);
    }

    try {
      // 2. Try browser standard notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await window.Notification.requestPermission();
        return permission === 'granted';
      }
    } catch (e) {
      console.warn('Browser notifications permission request failed:', e);
    }

    return false;
  },

  async show(
    title: string,
    body: string,
    type: NotificationType,
    settings: Settings
  ): Promise<void> {
    // Check if user has enabled this notification type in settings
    if (settings.notifications && !settings.notifications[type]) {
      console.log(`Notification of type "${type}" skipped (disabled in Settings).`);
      return;
    }

    try {
      // 1. Try Capacitor native notifications
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const isPermitted = await LocalNotifications.checkPermissions();
        if (isPermitted.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 100) }, // fire almost instantly
              sound: 'default',
              actionTypeId: 'OPEN_APP'
            }
          ]
        });
        return;
      }
    } catch (e) {
      console.warn('Native Capacitor notification scheduling failed, falling back...', e);
    }

    try {
      // 2. Try browser standard notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') {
          new window.Notification(title, { body });
        } else if (window.Notification.permission !== 'denied') {
          const perm = await window.Notification.requestPermission();
          if (perm === 'granted') {
            new window.Notification(title, { body });
          }
        }
      }
    } catch (e) {
      console.warn('Browser notification display failed:', e);
    }
  }
};
