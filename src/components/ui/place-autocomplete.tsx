import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

interface PlaceSuggestion {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  context?: Array<{ id: string; text: string }>;
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (data: {
    name: string;
    type: string;
  }) => void;
  placeholder?: string;
  className?: string;
  type?: "city" | "country";
}

export const PlaceAutocomplete = React.forwardRef<
  HTMLInputElement,
  PlaceAutocompleteProps
>(({ value, onChange, onSelectPlace, placeholder, className, type = "city" }, ref) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const types = type === "country" ? "country" : "place";
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&types=${types}&limit=5`
      );

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching place suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    onChange(suggestion.text);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onSelectPlace) {
      onSelectPlace({
        name: suggestion.text,
        type: suggestion.place_type[0],
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder || `Start typing a ${type}...`}
          className={cn("pr-10", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3",
                selectedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {suggestion.text}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {suggestion.place_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

PlaceAutocomplete.displayName = "PlaceAutocomplete";
