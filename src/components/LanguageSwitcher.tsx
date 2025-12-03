import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import "flag-icons/css/flag-icons.min.css";

// Map language codes to country codes for flags
const languageToCountryCode: Record<string, string> = {
  en: "gb",
  sq: "al",
  it: "it",
  de: "de",
  fr: "fr",
  es: "es",
  pt: "pt",
  nl: "nl",
  pl: "pl",
  ru: "ru",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ar: "sa",
  tr: "tr",
  el: "gr",
  cs: "cz",
  ro: "ro",
  bg: "bg",
  hr: "hr",
  sr: "rs",
  mk: "mk",
  sl: "si",
  bs: "ba",
  me: "me",
  xk: "xk",
};

const FlagIcon = ({ languageCode, className = "" }: { languageCode: string; className?: string }) => {
  const countryCode = languageToCountryCode[languageCode] || languageCode;
  return (
    <span 
      className={`fi fi-${countryCode} rounded-sm ${className}`}
      style={{ fontSize: "1.25em", lineHeight: 1 }}
    />
  );
};

export const LanguageSwitcher = () => {
  const { currentLanguage, availableLanguages, setLanguage, isLoading } = useLanguage();

  if (isLoading || availableLanguages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <FlagIcon languageCode={currentLanguage} className="text-xl" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border-border z-[100]">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`flex items-center gap-3 cursor-pointer py-3 px-3 ${
              currentLanguage === language.code 
                ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                : 'hover:bg-accent'
            }`}
          >
            <FlagIcon languageCode={language.code} className="text-2xl flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-semibold text-sm">{language.native_name}</span>
              <span className="text-xs text-muted-foreground">{language.name}</span>
            </div>
            {currentLanguage === language.code && (
              <Check className="h-4 w-4 ml-auto flex-shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};