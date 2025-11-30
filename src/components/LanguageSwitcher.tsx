import { Globe } from "lucide-react";
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
            <span className="text-xl">{currentLang.flag_emoji}</span>
          ) : (
            <Globe className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentLanguage === language.code ? 'bg-accent' : ''
            }`}
          >
            {language.flag_emoji && (
              <span className="text-lg">{language.flag_emoji}</span>
            )}
            <div className="flex flex-col">
              <span className="font-medium">{language.native_name}</span>
              <span className="text-xs text-muted-foreground">{language.name}</span>
            </div>
            {currentLanguage === language.code && (
              <span className="ml-auto">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};