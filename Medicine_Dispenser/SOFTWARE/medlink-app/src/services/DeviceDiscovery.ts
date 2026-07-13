/**
 * DeviceDiscovery.ts
 *
 * Thin public facade over DiscoveryManager.
 * Preserves the same export surface so all existing callers (DeviceSearchScreen,
 * SetupScreen, App.tsx) continue to compile without changes.
 *
 * All real logic lives in DiscoveryManager.ts.
 */

import {
  DiscoveryManager,
  DiscoveredDevice,
  verifyMedLinkDevice,
  LogCallback,
  ProgressCallback,
} from './DiscoveryManager';

export type { DiscoveredDevice };
export { verifyMedLinkDevice };

export const DeviceDiscovery = {
  /**
   * Full discovery: Saved IP → AP IP → mDNS → Subnet scan.
   * Used by DeviceSearchScreen and App.tsx startup/recovery.
   * Callers may pass an optional log callback to receive real-time messages.
   */
  discoverFull: async (
    onLog?: LogCallback,
    onProgress?: ProgressCallback
  ): Promise<DiscoveredDevice> => {
    const session = DiscoveryManager.startSession();
    return DiscoveryManager.discoverFull(session, onLog ?? (msg => console.log(msg)), onProgress);
  },

  /**
   * Alias for discoverFull — kept for any legacy call-sites that use discover().
   */
  discover: async (onLog?: LogCallback): Promise<DiscoveredDevice> => {
    return DeviceDiscovery.discoverFull(onLog);
  },
};
