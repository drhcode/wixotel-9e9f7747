import { cn } from "@/lib/utils";

interface BedLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BedLoader({ className, size = "md" }: BedLoaderProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <svg
        className={cn(sizeClasses[size])}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bed frame */}
        <g className="animate-[bounce_1.5s_ease-in-out_infinite]">
          {/* Mattress */}
          <rect
            x="15"
            y="45"
            width="70"
            height="20"
            rx="3"
            className="fill-primary/80"
          />
          
          {/* Pillows */}
          <ellipse
            cx="30"
            cy="42"
            rx="8"
            ry="5"
            className="fill-primary/60 animate-[pulse_2s_ease-in-out_infinite]"
            style={{ animationDelay: "0.2s" }}
          />
          <ellipse
            cx="50"
            cy="42"
            rx="8"
            ry="5"
            className="fill-primary/60 animate-[pulse_2s_ease-in-out_infinite]"
            style={{ animationDelay: "0.4s" }}
          />
          <ellipse
            cx="70"
            cy="42"
            rx="8"
            ry="5"
            className="fill-primary/60 animate-[pulse_2s_ease-in-out_infinite]"
            style={{ animationDelay: "0.6s" }}
          />
          
          {/* Bed legs */}
          <rect
            x="18"
            y="65"
            width="4"
            height="15"
            rx="1"
            className="fill-primary"
          />
          <rect
            x="78"
            y="65"
            width="4"
            height="15"
            rx="1"
            className="fill-primary"
          />
          
          {/* Headboard */}
          <rect
            x="12"
            y="30"
            width="4"
            height="35"
            rx="2"
            className="fill-primary"
          />
        </g>
        
        {/* Z Z Z sleeping indicators */}
        <text
          x="88"
          y="25"
          className="fill-primary/60 animate-[fade-in_1s_ease-in-out_infinite] text-[12px] font-bold"
        >
          Z
        </text>
        <text
          x="88"
          y="15"
          className="fill-primary/40 animate-[fade-in_1s_ease-in-out_infinite] text-[10px] font-bold"
          style={{ animationDelay: "0.3s" }}
        >
          Z
        </text>
        <text
          x="88"
          y="8"
          className="fill-primary/20 animate-[fade-in_1s_ease-in-out_infinite] text-[8px] font-bold"
          style={{ animationDelay: "0.6s" }}
        >
          Z
        </text>
      </svg>
      
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading...
      </p>
    </div>
  );
}
