import { getSavedIp, saveIp } from './apiClient';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';

export interface DiscoveredDevice {
  ip: string;
  firmwareVersion: string;
  deviceId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Verify a /api/v1/info response is a genuine MedLink device. */
export function verifyMedLinkDevice(info: any): boolean {
  if (!info || !info.deviceId) return false;
  const devId = String(info.deviceId).toLowerCase();
  return devId.startsWith('medlink-') && !!info.firmwareVersion;
}

/** fetch() with an AbortController-based hard timeout. */
async function timedFetch(url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Promise.any polyfill — resolves with the first fulfilled value. */
function anyOf<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) {
      reject(new Error('anyOf: empty array'));
      return;
    }
    let rejections = 0;
    const errors: unknown[] = [];
    promises.forEach(p =>
      p.then(resolve).catch(err => {
        errors.push(err);
        if (++rejections === promises.length) {
          reject(new AggregateError(errors, 'All promises rejected'));
        }
      })
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core discovery methods
// ─────────────────────────────────────────────────────────────────────────────

export const DeviceDiscovery = {

  /**
   * Part of `discoverFull()` chain.
   * Tries the previously-saved IP with a 1500 ms timeout.
   * Uses /api/v1/info to confirm it's still a MedLink device.
   */
  discoverFromSavedIp: async (): Promise<DiscoveredDevice> => {
    const savedIp = await getSavedIp();
    if (!savedIp) throw new Error('No saved IP');

    const infoUrl = `http://${savedIp}/api/v1/info`;
    console.log(`[Discovery] Trying saved IP: ${infoUrl}`);

    const res = await timedFetch(infoUrl, 1500);
    if (!res.ok) throw new Error(`Saved IP returned HTTP ${res.status}`);

    const info = await res.json();
    console.log('[Discovery] Saved IP response:', info);

    if (!verifyMedLinkDevice(info)) {
      throw new Error('Saved IP responded but failed MedLink verification');
    }

    console.log(`[Discovery] Saved IP verified. Device: ${info.deviceId}`);
    return { ip: savedIp, firmwareVersion: info.firmwareVersion, deviceId: info.deviceId };
  },

  /**
   * Try resolving http://medlink.local/api/v1/info (mDNS).
   * 2000 ms timeout.
   */
  resolveMDNS: async (): Promise<DiscoveredDevice> => {
    const url = 'http://medlink.local/api/v1/info';
    console.log(`[Discovery] Starting mDNS lookup → ${url}`);

    try {
      const res = await timedFetch(url, 2000);
      if (!res.ok) throw new Error(`mDNS HTTP ${res.status}`);

      const info = await res.json();
      console.log('[Discovery] mDNS response:', info);

      if (!verifyMedLinkDevice(info)) {
        throw new Error('mDNS responded but failed MedLink verification');
      }

      console.log(`[Discovery] mDNS verified. Device: ${info.deviceId}`);
      return { ip: 'medlink.local', firmwareVersion: info.firmwareVersion, deviceId: info.deviceId };
    } catch (err) {
      console.warn('[Discovery] mDNS lookup exception:', err);
      throw err;
    }
  },

  /**
   * Scan the current /24 subnet in batches of 25 concurrent requests.
   * Each request has a 1000 ms timeout.
   * Stops as soon as one verified MedLink device is found.
   */
  scanSubnet: async (): Promise<DiscoveredDevice> => {
    const startTime = Date.now();
    let localIp = '192.168.1.100';

    try {
      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorWifi.getIpAddress();
        console.log('[Discovery] Phone IP from CapacitorWifi:', res);
        if (res?.ipAddress && res.ipAddress !== '127.0.0.1') {
          localIp = res.ipAddress;
        }
      }
    } catch (e) {
      console.warn('[Discovery] Could not get phone IP:', e);
    }

    const parts = localIp.split('.');
    if (parts.length !== 4) throw new Error(`Invalid local IP: ${localIp}`);

    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
    console.log(`[Discovery] Subnet prefix: ${prefix}.x`);

    const BATCH = 25;
    for (let start = 1; start <= 254; start += BATCH) {
      const end = Math.min(start + BATCH - 1, 254);
      console.log(`[Discovery] Scanning ${prefix}.${start}–${prefix}.${end}`);

      const probes: Promise<DiscoveredDevice>[] = [];
      for (let j = start; j <= end; j++) {
        const targetIp = `${prefix}.${j}`;
        probes.push(
          (async (): Promise<DiscoveredDevice> => {
            try {
              const res = await timedFetch(`http://${targetIp}/api/v1/info`, 1000);
              if (res.ok) {
                const info = await res.json();
                if (verifyMedLinkDevice(info)) {
                  console.log(`[Discovery] MedLink found at ${targetIp} — deviceId: ${info.deviceId}`);
                  return { ip: targetIp, firmwareVersion: info.firmwareVersion, deviceId: info.deviceId };
                }
              }
            } catch {
              // silence per-host misses
            }
            throw new Error(`${targetIp}: not MedLink`);
          })()
        );
      }

      try {
        const found = await anyOf(probes);
        console.log(`[Discovery] Subnet scan done in ${Date.now() - startTime}ms`);
        return found;
      } catch {
        // next batch
      }
    }

    const elapsed = Date.now() - startTime;
    console.warn(`[Discovery] Subnet scan exhausted all IPs in ${elapsed}ms`);
    throw new Error('No MedLink device found on subnet scan');
  },

  /**
   * `discover()`: mDNS → subnet scan.
   * Used during first-time provisioning from SetupSettingsScreen (no saved LAN IP yet).
   */
  discover: async (): Promise<DiscoveredDevice> => {
    console.log('[Discovery] discover() started (mDNS → subnet)');

    try {
      const device = await DeviceDiscovery.resolveMDNS();
      console.log('[Discovery] discover() succeeded via mDNS:', device.ip);
      return device;
    } catch (mdnsErr) {
      console.log('[Discovery] mDNS failed, falling back to subnet scan');
      try {
        const device = await DeviceDiscovery.scanSubnet();
        console.log('[Discovery] discover() succeeded via subnet:', device.ip);
        return device;
      } catch (subnetErr) {
        const msg = [
          'Discovery failed.',
          `mDNS: ${mdnsErr instanceof Error ? mdnsErr.message : mdnsErr}`,
          `Subnet: ${subnetErr instanceof Error ? subnetErr.message : subnetErr}`
        ].join(' ');
        console.error('[Discovery] discover() failed:', msg);
        throw new Error(msg);
      }
    }
  },

  /**
   * `discoverFull()`: saved IP → mDNS → subnet scan.
   * Used by SetupScreen background loop and App.tsx startup/recovery.
   * Automatically saves the discovered IP when it differs from the stored one.
   */
  discoverFull: async (): Promise<DiscoveredDevice> => {
    console.log('[Discovery] discoverFull() started (saved IP → mDNS → subnet)');

    // 1. Saved IP
    try {
      const device = await DeviceDiscovery.discoverFromSavedIp();
      console.log('[Discovery] discoverFull() succeeded via saved IP:', device.ip);
      return device;
    } catch (savedErr) {
      console.log('[Discovery] Saved IP failed:', savedErr instanceof Error ? savedErr.message : savedErr);
    }

    // 2. mDNS
    try {
      const device = await DeviceDiscovery.resolveMDNS();
      console.log('[Discovery] discoverFull() succeeded via mDNS:', device.ip);
      await saveIp(device.ip);
      return device;
    } catch (mdnsErr) {
      console.log('[Discovery] mDNS failed:', mdnsErr instanceof Error ? mdnsErr.message : mdnsErr);
    }

    // 3. Subnet scan
    console.log('[Discovery] Starting subnet scan...');
    try {
      const device = await DeviceDiscovery.scanSubnet();
      console.log('[Discovery] discoverFull() succeeded via subnet scan:', device.ip);
      await saveIp(device.ip);
      return device;
    } catch (subnetErr) {
      const msg = `discoverFull() — all methods failed. Last: ${subnetErr instanceof Error ? subnetErr.message : subnetErr}`;
      console.error('[Discovery]', msg);
      throw new Error(msg);
    }
  }
};
