import { Capacitor } from '@capacitor/core';

export interface VersionInfo {
  version: string;
  buildTimestamp: string;
  buildHash: string;
  deployUrl?: string | null;
  environment?: string;
  notes?: string;
}

export interface OtaCheckResult {
  checked: boolean;
  updateAvailable: boolean;
  current: VersionInfo;
  remote: VersionInfo | null;
  error?: string;
}

const NETLIFY_URL_STORAGE_KEY = 'merl_magic_netlify_ota_url';
const LAST_CHECK_STORAGE_KEY = 'merl_magic_last_ota_check';

// Current compile-time build constants injected by Vite
export const CURRENT_BUILD: VersionInfo = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
  buildTimestamp: typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : new Date().toISOString(),
  buildHash: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local',
  channel: 'production',
  notes: 'Native Stage CAD Architecture with Netlify Over-The-Air Sync'
} as VersionInfo;

/**
 * Returns the currently active runtime platform
 */
export function getRuntimePlatform(): { isNative: boolean; platform: string; label: string } {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
  
  let label = 'Web Browser / PWA';
  if (platform === 'android') {
    label = 'Android Native (Capacitor)';
  } else if (platform === 'ios') {
    label = 'iOS Native (Capacitor)';
  }

  return { isNative, platform, label };
}

/**
 * Retrieves the configured Netlify deployment URL from localStorage,
 * with a fallback to the current window location origin.
 */
export function getConfiguredNetlifyUrl(): string {
  try {
    const saved = localStorage.getItem(NETLIFY_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore storage restrictions
  }
  
  // Default to window location or empty
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}

/**
 * Saves a custom Netlify deployment URL (e.g., https://your-stage.netlify.app)
 */
export function setConfiguredNetlifyUrl(url: string): void {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem(NETLIFY_URL_STORAGE_KEY, cleanUrl);
    } else {
      localStorage.removeItem(NETLIFY_URL_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

/**
 * Checks Netlify for a new version.json manifest.
 * Compares buildHash and buildTimestamp against the current app build.
 */
export async function checkForNetlifyUpdate(customUrl?: string): Promise<OtaCheckResult> {
  const baseUrl = customUrl || getConfiguredNetlifyUrl();
  const targetEndpoint = `${baseUrl}/version.json?_t=${Date.now()}`;

  try {
    const response = await fetch(targetEndpoint, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return {
        checked: true,
        updateAvailable: false,
        current: CURRENT_BUILD,
        remote: null,
        error: `Netlify endpoint returned HTTP ${response.status} (${response.statusText})`
      };
    }

    const remote: VersionInfo = await response.json();

    // Check if remote is newer
    const isNewHash = Boolean(remote.buildHash && remote.buildHash !== CURRENT_BUILD.buildHash && remote.buildHash !== 'dev-local');
    const isNewerTime = Boolean(
      remote.buildTimestamp && 
      CURRENT_BUILD.buildTimestamp && 
      new Date(remote.buildTimestamp).getTime() > new Date(CURRENT_BUILD.buildTimestamp).getTime() + 1000
    );
    const isNewVersion = remote.version !== CURRENT_BUILD.version;

    const updateAvailable = isNewHash || isNewerTime || isNewVersion;

    try {
      localStorage.setItem(LAST_CHECK_STORAGE_KEY, new Date().toISOString());
    } catch {
      // Ignore
    }

    return {
      checked: true,
      updateAvailable,
      current: CURRENT_BUILD,
      remote
    };
  } catch (err: any) {
    return {
      checked: true,
      updateAvailable: false,
      current: CURRENT_BUILD,
      remote: null,
      error: err?.message || 'Failed to reach Netlify update endpoint'
    };
  }
}

/**
 * Applies the Over-The-Air update immediately.
 * In a native app, reloads or streams from the Netlify live endpoint.
 * In web, clears service worker and reloads the window.
 */
export async function applyOtaUpdate(targetUrl?: string): Promise<void> {
  const { isNative } = getRuntimePlatform();
  const netlifyUrl = targetUrl || getConfiguredNetlifyUrl();

  // If in a Service Worker environment, unregister old cache first
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch {
      // Continue
    }
  }

  if (isNative && netlifyUrl && !window.location.href.startsWith(netlifyUrl)) {
    // Redirect native webview directly to the Netlify live production host
    window.location.href = netlifyUrl;
  } else {
    // Reload current window with cache bypass
    window.location.reload();
  }
}
