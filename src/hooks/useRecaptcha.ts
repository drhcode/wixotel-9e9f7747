/**
 * reCAPTCHA v3 integration hook
 * Provides utilities to execute reCAPTCHA and verify tokens
 * Always active - uses Google's reCAPTCHA API in all environments
 */

const RECAPTCHA_SITE_KEY = "6LeWVhssAAAAACjsMkrM7q2hEMrfpXEGU2JddsUE";

export const useRecaptcha = () => {
  /**
   * Execute reCAPTCHA and get a token
   * Always uses Google's reCAPTCHA API - no development bypass
   * @param action - The action name for this verification (e.g., 'login', 'submit_lead', 'submit_review')
   * @returns Promise<string> - The reCAPTCHA token
   */
  const executeRecaptcha = async (action: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.grecaptcha) {
        // In development without reCAPTCHA script loaded, log warning and return empty token
        // Server will properly reject invalid tokens
        console.warn('reCAPTCHA script not loaded - token validation will fail on server');
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }

      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then((token: string) => {
            resolve(token);
          })
          .catch((error: Error) => {
            reject(error);
          });
      });
    });
  };

  // Always enabled - no bypass mode
  const isEnabled = true;

  return { executeRecaptcha, isEnabled };
};

// Extend Window interface to include grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
