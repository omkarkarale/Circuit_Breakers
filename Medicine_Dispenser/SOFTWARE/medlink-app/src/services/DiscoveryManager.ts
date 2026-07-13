import { getSavedIp, saveIp, ApiClient } from './apiClient';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredDevice {
  ip: string;
  firmwareVersion: string;
  deviceId: string;
}

export interface DeviceCache extends DiscoveredDevice {
  lastSeenTimestamp: number;
}

/**
 * Structured progress event passed to UI callbacks.
 * `progress` is 0–100.
 */
export interface ProgressEvent {
  stage:
    | 'INIT'
    | 'PHONE_WAIT'
    | 'SAVED_IP'
    | 'AP_IP'
    | 'MDNS'
    | 'SUBNET'
    | 'STATUS_POLL'
    | 'VERIFY'
    | 'SAVING'
    | 'SUCCESS'
    | 'FAILED';
  message: string;
  progress: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;
export type LogCallback = (message: string) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Session
// ─────────────────────────────────────────────────────────────────────────────

let sessionCounter = 0;

export class DiscoverySession {
  readonly id: number;
  readonly abortController: AbortController;
  cancelled = false;
  running = false;

  constructor() {
    this.id = ++sessionCounter;
    this.abortController = new AbortController();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.running = false;
    this.abortController.abort();
    console.log(`[DiscoveryManager] Session #${this.id} cancelled`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Device cache helpers
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'medlink_device_cache';

async function loadCache(): Promise<DeviceCache | null> {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (!value) return null;
    return JSON.parse(value) as DeviceCache;
  } catch {
    return null;
  }
}

async function persistCache(device: DiscoveredDevice): Promise<void> {
  const entry: DeviceCache = { ...device, lastSeenTimestamp: Date.now() };
  await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(entry) });
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetch() that respects BOTH a per-request timeout AND a session AbortSignal.
 * Whichever fires first wins.
 */
async function timedFetch(
  url: string,
  timeoutMs: number,
  sessionSignal: AbortSignal,
  init: RequestInit = {}
): Promise<Response> {
  const localCtrl = new AbortController();
  const timer = setTimeout(() => localCtrl.abort(), timeoutMs);

  // Propagate session abort into local controller
  const onSessionAbort = () => localCtrl.abort();
  sessionSignal.addEventListener('abort', onSessionAbort, { once: true });

  const startTime = Date.now();
  try {
    return await fetch(url, { ...init, signal: localCtrl.signal });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const name = (err as Error)?.name;
    if (name === 'AbortError') {
      if (sessionSignal.aborted) {
        throw new Error(`[${url}] Session aborted after ${elapsed}ms`);
      }
      throw new Error(`[${url}] Timeout after ${elapsed}ms (limit ${timeoutMs}ms)`);
    }
    throw new Error(`[${url}] Network error after ${elapsed}ms: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
    sessionSignal.removeEventListener('abort', onSessionAbort);
  }
}

/** Promise.any — resolves with the first fulfilled value. */
function anyOf<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) { reject(new Error('anyOf: empty')); return; }
    let failures = 0;
    const errors: unknown[] = [];
    for (const p of promises) {
      p.then(resolve).catch(err => {
        errors.push(err);
        if (++failures === promises.length) {
          reject(new AggregateError(errors, 'All rejected'));
        }
      });
    }
  });
}

/** delay() that is cancelled immediately when the session signal fires. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Cancelled')); return; }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => { clearTimeout(timer); reject(new Error('Cancelled')); },
      { once: true }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MedLink verification
// ─────────────────────────────────────────────────────────────────────────────

export function verifyMedLinkDevice(info: any): boolean {
  if (!info?.deviceId) return false;
  return String(info.deviceId).toLowerCase().startsWith('medlink-') && !!info.firmwareVersion;
}

/** Helper to check if the phone is currently connected to a MedLink AP. */
async function isPhoneOnMedLinkAp(): Promise<boolean> {
  try {
    const { ssid } = await CapacitorWifi.getSsid();
    return !!ssid && ssid.toLowerCase().startsWith('medlink-');
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Network state helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Waits until:
 *   - Phone is NOT on a MedLink-* SSID
 *   - Phone has a valid routable IPv4 address
 *
 * Returns when both conditions are met, or throws after `maxMs`.
 */
async function waitForPhoneNetwork(
  sid: number,
  signal: AbortSignal,
  log: LogCallback,
  maxMs = 90_000
): Promise<void> {
  log(`[Session ${sid}] Waiting for phone to leave MedLink AP...`);
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Cancelled');

    try {
      const [ssidResult, ipResult] = await Promise.all([
        CapacitorWifi.getSsid(),
        CapacitorWifi.getIpAddress(),
      ]);
      const { ssid } = ssidResult;
      const { ipAddress } = ipResult;

      const onMedLinkAp = ssid && ssid.toLowerCase().startsWith('medlink-');
      const validIp =
        ipAddress &&
        ipAddress !== '0.0.0.0' &&
        ipAddress !== '127.0.0.1' &&
        !ipAddress.startsWith('169.254.') && // link-local (DHCP failed)
        !ipAddress.startsWith('192.168.4.');  // MedLink AP subnet

      if (!onMedLinkAp && validIp) {
        log(`[Session ${sid}] Phone on home Wi-Fi: SSID=${ssid} IP=${ipAddress}`);
        return;
      }
      log(`[Session ${sid}] Phone not ready — SSID=${ssid ?? 'null'} IP=${ipAddress ?? 'null'}`);
    } catch (e) {
      log(`[Session ${sid}] Network check error: ${(e as Error).message}`);
    }

    await delay(1000, signal);
  }

  throw new Error('Phone did not rejoin home Wi-Fi within 90 seconds');
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks a candidate IP:
 *   1. GET /api/v1/status — waits for `bootComplete` (or `success` if no bootComplete field)
 *   2. GET /api/v1/info   — verifies deviceId starts with "medlink-"
 *   3. Saves IP + cache
 *
 * @param maxStatusAttempts  How many times to retry status before giving up.
 * @param retryOnNetworkError  If true, retry even on timeout/network errors (for provisioning).
 */
async function checkCandidate(
  ip: string,
  sid: number,
  signal: AbortSignal,
  log: LogCallback,
  maxStatusAttempts = 1,
  retryOnNetworkError = false
): Promise<DiscoveredDevice> {
  const statusUrl = `http://${ip}/api/v1/status`;
  let ready = false;

  for (let attempt = 1; attempt <= maxStatusAttempts; attempt++) {
    if (signal.aborted) throw new Error('Cancelled');
    const t0 = Date.now();

    try {
      const res = await timedFetch(statusUrl, 5000, signal);
      const elapsed = Date.now() - t0;

      if (!res.ok) throw new Error(`HTTP ${res.status} from ${ip} (${elapsed}ms)`);

      const data = await res.json();
      const hasBootComplete = 'bootComplete' in data;
      ready = hasBootComplete ? data.bootComplete === true : data.success === true;

      if (ready) {
        log(`[Session ${sid}] Status OK at ${ip} (attempt ${attempt}, ${elapsed}ms)`);
        break;
      }

      const notReadyMsg =
        `[Session ${sid}] Device not ready at ${ip}: ` +
        `bootComplete=${data.bootComplete ?? 'N/A'} success=${data.success} ` +
        `(attempt ${attempt}/${maxStatusAttempts})`;
      log(notReadyMsg);

      // Only retry status if device responded but isn't ready yet
      if (attempt < maxStatusAttempts) {
        await delay(1000, signal);
      }
    } catch (err) {
      const elapsed = Date.now() - t0;
      log(`[Session ${sid}] Status check failed at ${ip}: ${(err as Error).message} (${elapsed}ms, attempt ${attempt}/${maxStatusAttempts})`);

      if (!retryOnNetworkError) throw err;
      if (attempt < maxStatusAttempts) {
        try { await delay(1000, signal); } catch { throw err; }
      } else {
        throw err;
      }
    }
  }

  if (!ready) {
    throw new Error(`Device at ${ip} not ready after ${maxStatusAttempts} status attempts`);
  }

  // ── Verification ──────────────────────────────────────────────────────────
  if (signal.aborted) throw new Error('Cancelled');
  const infoUrl = `http://${ip}/api/v1/info`;
  log(`[Session ${sid}] Verifying firmware at ${infoUrl}`);
  const t1 = Date.now();
  const infoRes = await timedFetch(infoUrl, 5000, signal);
  const infoElapsed = Date.now() - t1;

  if (!infoRes.ok) throw new Error(`/info HTTP ${infoRes.status} from ${ip} (${infoElapsed}ms)`);

  const info = await infoRes.json();
  if (!verifyMedLinkDevice(info)) {
    throw new Error(`Device at ${ip} failed MedLink verification (deviceId=${info?.deviceId})`);
  }

  log(`[Session ${sid}] Verified: deviceId=${info.deviceId} fw=${info.firmwareVersion} (${infoElapsed}ms)`);

  // ── Save (await completion before returning) ───────────────────────────────
  log(`[Session ${sid}] Saving IP ${ip}`);
  await saveIp(ip);
  await persistCache({ ip, firmwareVersion: info.firmwareVersion, deviceId: info.deviceId });
  
  try {
    log(`[Session ${sid}] Synchronizing device clock with phone...`);
    await ApiClient.syncTime(ip);
    log(`[Session ${sid}] Time synchronized with ESP successfully.`);
  } catch (syncErr) {
    log(`[Session ${sid}] Time synchronization failed: ${(syncErr as Error).message}`);
  }

  log(`[Session ${sid}] IP saved: ${ip}`);

  return { ip, firmwareVersion: info.firmwareVersion, deviceId: info.deviceId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subnet scan
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans the current /24 subnet in batches of 25.
 * Each probe has a 750 ms timeout. Stops on the first verified MedLink device.
 * Returns raw device info WITHOUT saving — caller must call checkCandidate after.
 */
async function scanSubnet(
  sid: number,
  signal: AbortSignal,
  log: LogCallback
): Promise<{ ip: string; firmwareVersion: string; deviceId: string }> {
  let localIp = '192.168.1.100';

  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorWifi.getIpAddress();
      if (res?.ipAddress && res.ipAddress !== '127.0.0.1') {
        localIp = res.ipAddress;
      }
    }
  } catch (e) {
    log(`[Session ${sid}] Could not read phone IP: ${(e as Error).message}`);
  }

  const parts = localIp.split('.');
  if (parts.length !== 4) throw new Error(`Invalid local IP: ${localIp}`);
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;

  log(`[Session ${sid}] Starting subnet scan: ${prefix}.1–254`);

  const BATCH = 25;
  for (let start = 1; start <= 254; start += BATCH) {
    if (signal.aborted) throw new Error('Cancelled');
    const end = Math.min(start + BATCH - 1, 254);
    log(`[Session ${sid}] Scanning batch ${prefix}.${start}–${prefix}.${end}`);

    const probes: Promise<{ ip: string; firmwareVersion: string; deviceId: string }>[] = [];

    for (let j = start; j <= end; j++) {
      const targetIp = `${prefix}.${j}`;
      probes.push(
        (async () => {
          if (signal.aborted) throw new Error('Cancelled');
          try {
            const res = await timedFetch(`http://${targetIp}/api/v1/info`, 1000, signal);
            if (res.ok) {
              const info = await res.json();
              if (verifyMedLinkDevice(info)) {
                log(`[Session ${sid}] Found candidate: ${targetIp} (deviceId=${info.deviceId})`);
                return { ip: targetIp, firmwareVersion: info.firmwareVersion, deviceId: info.deviceId };
              }
            }
          } catch { /* silence per-host misses */ }
          throw new Error(`${targetIp}: no MedLink`);
        })()
      );
    }

    try {
      const found = await anyOf(probes);
      log(`[Session ${sid}] Subnet scan found device: ${found.ip}`);
      return found;
    } catch { /* try next batch */ }
  }

  throw new Error(`[Session ${sid}] Subnet scan exhausted — no MedLink device found`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DiscoveryManager singleton
// ─────────────────────────────────────────────────────────────────────────────

class DiscoveryManagerClass {
  private currentSession: DiscoverySession | null = null;
  private _backgroundPaused = false;

  // ── Session management ────────────────────────────────────────────────────

  /** Create a new session, automatically cancelling any running one first. */
  startSession(): DiscoverySession {
    if (this.currentSession?.running) {
      console.log(`[DiscoveryManager] Cancelling session #${this.currentSession.id}`);
      this.currentSession.cancel();
    }
    const session = new DiscoverySession();
    this.currentSession = session;
    console.log(`[DiscoveryManager] Started session #${session.id}`);
    return session;
  }

  /** Cancel the current session (if any). Safe to call even if none is running. */
  cancelCurrent(): void {
    if (this.currentSession) {
      this.currentSession.cancel();
      this.currentSession = null;
    }
  }

  // ── Background-pause flag ─────────────────────────────────────────────────

  pauseBackground(): void  { this._backgroundPaused = true;  }
  resumeBackground(): void { this._backgroundPaused = false; }
  get isBackgroundPaused(): boolean { return this._backgroundPaused; }

  private _wifiSetupFailed = false;

  setWifiSetupFailed(failed: boolean): void {
    this._wifiSetupFailed = failed;
  }

  get wifiSetupFailed(): boolean {
    return this._wifiSetupFailed;
  }

  isPhoneOnMedLinkAp(): Promise<boolean> {
    return isPhoneOnMedLinkAp();
  }

  // ── Cache access ──────────────────────────────────────────────────────────

  getCache(): Promise<DeviceCache | null> { return loadCache(); }

  // ─────────────────────────────────────────────────────────────────────────
  // discoverFull
  // Discovery order: Saved IP (if not stale) → mDNS → AP IP → Subnet
  //
  // Phases:
  //   Phase 1 (60 s): Rapid 1-second retry loop on candidates (fail-fast).
  //   Phase 2: Subnet scan if Phase 1 exhausted.
  // ─────────────────────────────────────────────────────────────────────────

  async discoverFull(
    session: DiscoverySession,
    onLog: LogCallback,
    onProgress?: ProgressCallback
  ): Promise<DiscoveredDevice> {
    session.running = true;
    const sid = session.id;
    onLog(`[Session ${sid}] Discovery started`);

    // If the phone is currently connected to the MedLink AP, wait for it to rejoin home Wi-Fi
    const onAp = await isPhoneOnMedLinkAp();
    if (onAp) {
      onProgress?.({ stage: 'PHONE_WAIT', message: 'Waiting for phone to rejoin home Wi-Fi...', progress: 10 });
      onLog(`[Session ${sid}] Phone is on MedLink AP. Waiting to rejoin home Wi-Fi...`);
      await waitForPhoneNetwork(sid, session.signal, onLog, 90_000);
      if (session.cancelled) throw new Error('Cancelled');
      
      onProgress?.({ stage: 'PHONE_WAIT', message: 'Network stabilizing...', progress: 20 });
      onLog(`[Session ${sid}] Waiting 2 s for routing to stabilize`);
      await delay(2000, session.signal);
      if (session.cancelled) throw new Error('Cancelled');
    }

    onProgress?.({ stage: 'INIT', message: 'Starting discovery...', progress: 5 });

    const deadline = Date.now() + 5_000; // Fast checks (saved IP, mDNS) for 5 seconds
    let attempt = 0;

    // ── Phase 1: Rapid retry loop (1 s between cycles) ──────────────────────
    while (Date.now() < deadline) {
      if (session.cancelled) throw new Error(`Session #${sid} cancelled`);
      attempt++;

      // 1. Saved IP — but skip stale AP addresses (192.168.4.x)
      const savedIp = await getSavedIp();
      const hasFreshSavedIp = savedIp && !savedIp.startsWith('192.168.4.');

      if (hasFreshSavedIp) {
        try {
          onLog(`[Session ${sid}] Checking saved IP ${savedIp} (attempt ${attempt})`);
          onProgress?.({ stage: 'SAVED_IP', message: 'Checking saved IP...', progress: 15 });
          const device = await checkCandidate(savedIp!, sid, session.signal, onLog, 1, false);
          onProgress?.({ stage: 'SUCCESS', message: `Connected via saved IP (${device.ip})`, progress: 100 });
          onLog(`[Session ${sid}] Discovery complete via saved IP: ${device.ip}`);
          session.running = false;
          return device;
        } catch (err) {
          onLog(`[Session ${sid}] Saved IP failed: ${(err as Error).message}`);
        }
      } else if (attempt === 1) {
        onLog(`[Session ${sid}] No valid saved IP (${savedIp ?? 'none'})`);
      }

      if (session.cancelled) throw new Error(`Session #${sid} cancelled`);

      // 2. mDNS — try before AP IP (more likely on a running device)
      try {
        onLog(`[Session ${sid}] Trying mDNS (medlink.local) (attempt ${attempt})`);
        onProgress?.({ stage: 'MDNS', message: 'Resolving medlink.local...', progress: 25 });
        const device = await checkCandidate('medlink.local', sid, session.signal, onLog, 1, false);
        onProgress?.({ stage: 'SUCCESS', message: 'Connected via mDNS', progress: 100 });
        onLog(`[Session ${sid}] Discovery complete via mDNS`);
        session.running = false;
        return device;
      } catch (err) {
        onLog(`[Session ${sid}] mDNS failed: ${(err as Error).message}`);
      }

      if (session.cancelled) throw new Error(`Session #${sid} cancelled`);

      // 3. AP IP (only if phone is connected to the MedLink AP)
      const onAp = await isPhoneOnMedLinkAp();
      if (onAp) {
        try {
          onLog(`[Session ${sid}] Trying AP IP 192.168.4.1 (attempt ${attempt})`);
          onProgress?.({ stage: 'AP_IP', message: 'Checking onboarding address...', progress: 35 });
          const device = await checkCandidate('192.168.4.1', sid, session.signal, onLog, 1, false);
          onProgress?.({ stage: 'SUCCESS', message: 'Connected via AP IP', progress: 100 });
          onLog(`[Session ${sid}] Discovery complete via AP IP`);
          session.running = false;
          return device;
        } catch (err) {
          onLog(`[Session ${sid}] AP IP unavailable: ${(err as Error).message}`);
        }
      }

      if (session.cancelled) throw new Error(`Session #${sid} cancelled`);

      // Wait 1 s before next cycle
      try { await delay(1000, session.signal); } catch { break; }
    }

    // ── Phase 2: Subnet scan ────────────────────────────────────────────────
    if (session.cancelled) throw new Error(`Session #${sid} cancelled`);

    onLog(`[Session ${sid}] Starting subnet scan...`);
    onProgress?.({ stage: 'SUBNET', message: 'Scanning local network...', progress: 55 });

    let verified: DiscoveredDevice | null = null;
    const subnetAttempts = 2; // Try subnet scan up to 2 times
    for (let sAttempt = 1; sAttempt <= subnetAttempts; sAttempt++) {
      if (session.cancelled) throw new Error(`Session #${sid} cancelled`);
      try {
        onLog(`[Session ${sid}] Subnet scan attempt ${sAttempt}/${subnetAttempts}...`);
        const candidate = await scanSubnet(sid, session.signal, onLog);
        if (session.cancelled) throw new Error(`Session #${sid} cancelled`);
        onProgress?.({ stage: 'VERIFY', message: 'Verifying device...', progress: 80 });
        verified = await checkCandidate(candidate.ip, sid, session.signal, onLog, 1, false);
        break;
      } catch (err) {
        onLog(`[Session ${sid}] Subnet scan attempt ${sAttempt} failed: ${(err as Error).message}`);
        if (sAttempt === subnetAttempts) throw err;
        // Wait 1.5 s before retrying subnet scan to settle the network
        try { await delay(5000, session.signal); } catch { throw err; }
      }
    }

    if (!verified) throw new Error('Subnet scan failed to verify device');

    onProgress?.({ stage: 'SUCCESS', message: `Connected via subnet scan (${verified.ip})`, progress: 100 });
    onLog(`[Session ${sid}] Discovery complete via subnet: ${verified.ip}`);
    session.running = false;
    return verified;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // provisioningDiscovery
  // Full post-credentials provisioning flow:
  //   1. Wait for phone to leave MedLink AP
  //   2. Wait for phone to have valid IPv4 on home network
  //   3. 2 s stabilization
  //   4. Direct unified discoverFull loop
  // Overall deadline: 120 s
  // ─────────────────────────────────────────────────────────────────────────

  async provisioningDiscovery(
    session: DiscoverySession,
    onLog: LogCallback,
    onProgress: ProgressCallback,
    onSuccess: (device: DiscoveredDevice) => void,
    onFailure: (error: string) => void
  ): Promise<void> {
    session.running = true;
    const sid = session.id;
    const overallDeadline = Date.now() + 120_000;

    try {
      // ── Stage 1: Wait for phone to rejoin home Wi-Fi ─────────────────────
      onProgress({ stage: 'PHONE_WAIT', message: 'Waiting for phone to rejoin home Wi-Fi...', progress: 10 });
      await waitForPhoneNetwork(sid, session.signal, onLog, 90_000);
      if (session.cancelled) return;

      // ── Stage 2: 2 s stabilization ───────────────────────────────────────
      onProgress({ stage: 'PHONE_WAIT', message: 'Network stabilizing...', progress: 20 });
      onLog(`[Session ${sid}] Waiting 2 s for routing to stabilize`);
      await delay(2000, session.signal);
      if (session.cancelled) return;

      // ── Stage 3: Unified discoverFull loop ────────────────────────────────
      let attempt = 0;
      while (Date.now() < overallDeadline) {
        if (session.cancelled) return;
        attempt++;
        
        onProgress({ 
          stage: 'SAVED_IP', 
          message: `Searching for MedLink... (attempt ${attempt})`, 
          progress: Math.min(25 + attempt * 5, 95) 
        });

        try {
          // Perform the exact same discovery system that runs on the Search Screen
          const device = await this.discoverFull(session, onLog, onProgress);
          if (session.cancelled) return;
          
          onProgress({ stage: 'SUCCESS', message: 'MedLink connected successfully!', progress: 100 });
          onLog(`[Session ${sid}] Provisioning complete! Device at ${device.ip}`);
          session.running = false;
          onSuccess(device);
          return;
        } catch (err) {
          onLog(`[Session ${sid}] Discover attempt ${attempt} failed: ${(err as Error).message}`);
          if (Date.now() + 5000 >= overallDeadline) {
            throw err;
          }
          // Wait 2 seconds before retrying discovery
          try { await delay(2000, session.signal); } catch { return; }
        }
      }

      throw new Error('Provisioning timed out without finding device');
    } catch (err) {
      if (session.cancelled) return;
      const msg = (err as Error).message;
      onLog(`[Session ${sid}] Provisioning FAILED: ${msg}`);
      onProgress({ stage: 'FAILED', message: msg, progress: 0 });
      session.running = false;
      onFailure(msg);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────

export const DiscoveryManager = new DiscoveryManagerClass();

