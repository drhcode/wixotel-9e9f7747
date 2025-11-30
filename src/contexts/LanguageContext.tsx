import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface TranslationCache {
  [languageCode: string]: {
    [key: string]: string;
  };
}

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: Language[];
  translations: { [key: string]: string };
  setLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load available languages
  useEffect(() => {
    loadLanguages();
  }, []);

  // Load translations for current language
  useEffect(() => {
    if (currentLanguage) {
      loadTranslations(currentLanguage);
    }
  }, [currentLanguage]);

  // Initialize language from localStorage or default
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app_language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    } else {
      // Try to get browser language
      const browserLang = navigator.language.split('-')[0];
      setCurrentLanguage(browserLang);
    }
  }, []);

  const loadLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setAvailableLanguages(data);
        
        // Set default language if current is not available
        const defaultLang = data.find(l => l.is_default);
        if (defaultLang && !data.find(l => l.code === currentLanguage)) {
          setCurrentLanguage(defaultLang.code);
        }
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  };

  const loadTranslations = async (languageCode: string) => {
    // Check cache first
    if (translationCache[languageCode]) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('translations')
        .select(`
          translated_text,
          translation_keys!inner(key, default_value)
        `)
        .eq('language_code', languageCode);

      if (!error && data) {
        const translations: { [key: string]: string } = {};
        
        data.forEach((item: any) => {
          translations[item.translation_keys.key] = item.translated_text;
        });

        setTranslationCache(prev => ({
          ...prev,
          [languageCode]: translations
        }));
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = (code: string) => {
    setCurrentLanguage(code);
    localStorage.setItem('app_language', code);
  };

  const t = (key: string, fallback?: string): string => {
    const translations = translationCache[currentLanguage] || {};
    return translations[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages,
        translations: translationCache[currentLanguage] || {},
        setLanguage,
        t,
        isLoading
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Custom hook for translation
export const useTranslation = () => {
  const { t } = useLanguage();
  return { t };
};