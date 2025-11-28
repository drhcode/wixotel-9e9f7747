/**
 * reCAPTCHA v3 integration hook
 * Provides utilities to execute reCAPTCHA and verify tokens
 */

const RECAPTCHA_SITE_KEY = "6LeWVhssAAAAACjsMkrM7q2hEMrfpXEGU2JddsUE";

export const useRecaptcha = () => {
  /**
   * Execute reCAPTCHA and get a token
   * @param action - The action name for this verification (e.g., 'login', 'submit_lead', 'submit_review')
   * @returns Promise<string> - The reCAPTCHA token
   */
  const executeRecaptcha = async (action: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.grecaptcha) {
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

  return { executeRecaptcha };
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
