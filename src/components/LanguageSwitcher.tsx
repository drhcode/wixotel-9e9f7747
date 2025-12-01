import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageSwitcher = () => {
  const { currentLanguage, availableLanguages, setLanguage, isLoading } = useLanguage();

  if (isLoading || availableLanguages.length === 0) {
    return null;
  }

  const currentLang = availableLanguages.find(l => l.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {currentLang?.flag_emoji ? (
            <span className="text-2xl">{currentLang.flag_emoji}</span>
          ) : (
            <Globe className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border-border z-[100]">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`flex items-center gap-3 cursor-pointer py-2.5 px-3 ${
              currentLanguage === language.code 
                ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                : 'hover:bg-accent'
            }`}
          >
            {language.flag_emoji && (
              <span className="text-xl flex-shrink-0">{language.flag_emoji}</span>
            )}
            <span className="font-semibold text-sm uppercase">{language.code}</span>
            {currentLanguage === language.code && (
              <Check className="h-4 w-4 ml-auto flex-shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};