/**
 * Device tracking utilities for fraud prevention and analytics
 * Data collected in compliance with GDPR (disclosed in Privacy Policy)
 */

export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const getBrowser = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('SamsungBrowser') > -1) {
    browser = 'Samsung Internet';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    browser = 'Opera';
  } else if (ua.indexOf('Trident') > -1) {
    browser = 'Internet Explorer';
  } else if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) {
    browser = 'Edge';
  } else if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
  }
  
  return browser;
};

export const getDeviceInfo = () => {
  return {
    device_type: getDeviceType(),
    browser: getBrowser(),
    user_agent: navigator.userAgent,
  };
};

/**
 * Fetches the user's IP address from a public API
 * Falls back to 'unknown' if the request fails
 */
export const getUserIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('Failed to fetch IP address:', error);
    return 'unknown';
  }
};
