import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brand, AppNav } from "@/components/AppNav";
import { FEEDS, type Feed } from "@/data/feeds";
import { ChevronDown, Radio, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  feed: Feed;
  onFeedChange: (f: Feed) => void;
  enhanced: boolean;
  onEnhancedChange: (v: boolean) => void;
  isLive: boolean;
  onToggleLive: () => void;
  isPlaying?: boolean;
};

const LEGEND = [
  { label: "Speech", className: "bg-speech shadow-[0_0_8px_oklch(0.86_0.22_145/0.6)]" },
  { label: "Silent", className: "bg-silent" },
  { label: "Pending", className: "bg-pending" },
  { label: "Playing", className: "bg-playing shadow-[0_0_8px_oklch(0.74_0.19_55/0.6)]" },
];

export function TopControlBar({
  feed,
  onFeedChange,
  enhanced,
  onEnhancedChange,
  isLive,
  onToggleLive,
  isPlaying,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-white/10">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3 flex items-center gap-4">
        {/* Brand + nav */}
        <div className="flex items-center gap-6 shrink-0">
          <Brand />
          <div className="hidden md:block h-6 w-px bg-white/10" />
          <div className="hidden md:block">
            <AppNav />
          </div>
        </div>

        {/* Feed dropdown */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-2 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md glass hover:bg-white/5 transition text-sm font-mono"
              aria-label="Select feed"
            >
              <Radio className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">{feed.label}</span>
              <span className="text-muted-foreground">({feed.segments} seg)</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 glass-strong border-white/10">
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              ATC Feeds
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FEEDS.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => onFeedChange(f)}
                className={cn(
                  "font-mono text-sm flex flex-col items-start gap-0.5 cursor-pointer",
                  f.id === feed.id && "bg-primary/10 text-primary",
                )}
              >
                <span>{f.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {f.station} · {f.segments} segments
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Enhanced toggle */}
        <div className="ml-auto lg:ml-0 lg:mx-auto flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors",
              !enhanced ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Volume2 className="inline h-3.5 w-3.5 mr-1" />
            Raw
          </span>
          <button
            onClick={() => onEnhancedChange(!enhanced)}
            role="switch"
            aria-checked={enhanced}
            className={cn(
              "relative h-7 w-14 rounded-full border transition-all duration-300",
              enhanced
                ? "bg-primary/20 border-primary/50 neon-glow"
                : "bg-white/5 border-white/10 hover:bg-white/10",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full transition-all duration-300",
                enhanced
                  ? "left-7 bg-primary shadow-[0_0_12px_oklch(0.86_0.22_145/0.8)]"
                  : "left-0.5 bg-muted-foreground",
              )}
            />
          </button>
          <span
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1",
              enhanced ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Enhanced
            <span className="hidden xl:inline text-[10px] opacity-70">(ai-coustics)</span>
          </span>
        </div>

        {/* Legend */}
        <div className="hidden xl:flex items-center gap-3 mr-3 px-3 py-1.5 rounded-md glass">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className={cn("h-2.5 w-2.5 rounded-sm", l.className)} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>

        {/* Go Live button */}
        <button
          onClick={onToggleLive}
          className={cn(
            "shrink-0 flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all",
            isLive
              ? "bg-primary text-primary-foreground shadow-[0_0_18px_oklch(0.86_0.22_145/0.45)]"
              : "bg-destructive text-destructive-foreground live-pulse hover:brightness-110",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isLive ? "bg-primary-foreground" : "bg-white",
            )}
          />
          {isLive ? "LIVE" : "Go Live"}
        </button>
      </div>
    </header>
  );
}
