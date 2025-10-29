import { useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, parameters: {
        sitekey: string;
        size?: 'invisible' | 'normal' | 'compact';
        callback?: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
      }) => number;
    };
  }
}

export const useRecaptcha = () => {
  const [isReady, setIsReady] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey || siteKey === 'your-recaptcha-site-key-here') {
      console.warn('reCAPTCHA site key not configured');
      return;
    }

    const checkRecaptcha = () => {
      try {
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(() => {
            setIsReady(true);
          });
        } else {
          setTimeout(checkRecaptcha, 100);
        }
      } catch (error) {
        console.warn('reCAPTCHA not available:', error);
        // Don't break the app if reCAPTCHA fails to load
      }
    };

    checkRecaptcha();
  }, [siteKey]);

  const executeRecaptcha = async (action: string): Promise<string | null> => {
    if (!isReady || !siteKey || siteKey === 'your-recaptcha-site-key-here') {
      console.warn('reCAPTCHA not ready or not configured');
      return null;
    }

    try {
      if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
        console.warn('reCAPTCHA not available');
        return null;
      }
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (error) {
      console.warn('Error executing reCAPTCHA (non-critical):', error);
      // Return null instead of throwing - allow auth to continue without reCAPTCHA
      return null;
    }
  };

  return { isReady, executeRecaptcha };
};
