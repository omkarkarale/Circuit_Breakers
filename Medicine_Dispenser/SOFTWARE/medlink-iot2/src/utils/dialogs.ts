/**
 * Utility wrappers for native browser dialogs (alert/confirm)
 * to facilitate future replacement with Capacitor Dialog plugins.
 */

export function nativeAlert(message: string): void {
  if (typeof window !== 'undefined') {
    window.alert(message);
  } else {
    console.log(`[Alert] ${message}`);
  }
}

export function nativeConfirm(message: string): boolean {
  if (typeof window !== 'undefined') {
    return window.confirm(message);
  }
  return false;
}
