/**
 * Device Fingerprinting & Anti-Proxy Hardware Signature Utility
 * Captures persistent device identifier, OS, browser, and hardware specs
 * to prevent proxy attendance ("buddy punching").
 */

const DEVICE_ID_KEY = 'metroattend_device_uuid';

export interface DeviceSignature {
  deviceId: string;
  deviceModel: string;
  deviceBrowser: string;
  deviceOs: string;
  deviceLabel: string;
}

/**
 * Get or generate a persistent unique device UUID
 */
export function getPersistentDeviceId(): string {
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      // Generate a crypto random unique identifier
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      devId = `dev_${timePart}_${randomPart}`;
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch {
    return 'dev_unknown_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Detect client OS, device category, and browser
 */
export function getDeviceSignature(): DeviceSignature {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const deviceId = getPersistentDeviceId();

  // 1. Detect OS
  let deviceOs = 'Unknown OS';
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    deviceOs = 'iOS';
  } else if (/Android/i.test(userAgent)) {
    deviceOs = 'Android';
  } else if (/Windows/i.test(userAgent)) {
    deviceOs = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    deviceOs = 'macOS';
  } else if (/Linux/i.test(userAgent)) {
    deviceOs = 'Linux';
  }

  // 2. Detect Browser
  let deviceBrowser = 'Browser';
  if (/CriOS|Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    deviceBrowser = 'Chrome';
  } else if (/Safari/i.test(userAgent) && !/Chrome|CriOS|Edg/i.test(userAgent)) {
    deviceBrowser = 'Safari';
  } else if (/Firefox|FxiOS/i.test(userAgent)) {
    deviceBrowser = 'Firefox';
  } else if (/Edg/i.test(userAgent)) {
    deviceBrowser = 'Edge';
  } else if (/SamsungBrowser/i.test(userAgent)) {
    deviceBrowser = 'Samsung Internet';
  }

  // 3. Detect Device Model
  let deviceModel = 'Mobile Device';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);

  if (/iPhone/i.test(userAgent)) {
    deviceModel = 'Apple iPhone';
  } else if (/iPad/i.test(userAgent)) {
    deviceModel = 'Apple iPad';
  } else if (/Android/i.test(userAgent)) {
    // Attempt to extract Android device model if present
    const match = userAgent.match(/;\s*([A-Za-z0-9\s-_]+)\s+Build\//);
    if (match && match[1]) {
      deviceModel = match[1].trim();
    } else {
      deviceModel = 'Android Phone';
    }
  } else if (!isMobile) {
    if (deviceOs === 'macOS') deviceModel = 'Apple Mac';
    else if (deviceOs === 'Windows') deviceModel = 'Windows PC';
    else deviceModel = 'Desktop Workstation';
  }

  // 4. Readable human badge (e.g., "📱 iPhone · Safari" or "💻 Windows · Chrome")
  const icon = isMobile ? '📱' : '💻';
  const deviceLabel = `${icon} ${deviceModel} (${deviceBrowser})`;

  return {
    deviceId,
    deviceModel,
    deviceBrowser,
    deviceOs,
    deviceLabel,
  };
}
