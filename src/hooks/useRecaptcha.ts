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
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsReady(true);
        });
      } else {
        setTimeout(checkRecaptcha, 100);
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
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (error) {
      console.error('Error executing reCAPTCHA:', error);
      return null;
    }
  };

  return { isReady, executeRecaptcha };
};
