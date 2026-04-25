import { Link } from "@tanstack/react-router";
import { Radar, History as HistoryIcon, Settings, Activity } from "lucide-react";

const linkBase =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-white/5";
const linkActive = "!text-primary !bg-primary/10 ring-1 ring-primary/30";

export function AppNav() {
  return (
    <nav className="flex items-center gap-1">
      <Link to="/" activeOptions={{ exact: true }} className={linkBase} activeProps={{ className: linkActive }}>
        <Activity className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      <Link to="/history" className={linkBase} activeProps={{ className: linkActive }}>
        <HistoryIcon className="h-4 w-4" />
        <span>History</span>
      </Link>
      <Link to="/settings" className={linkBase} activeProps={{ className: linkActive }}>
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </Link>
    </nav>
  );
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30 group-hover:ring-primary/60 transition">
        <Radar className="h-4.5 w-4.5 text-primary" />
        <span className="absolute inset-0 rounded-md bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
      <div className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight text-sm">
          LiveATC <span className="text-primary">AI-Analyzer</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Mission Control
        </span>
      </div>
    </Link>
  );
}
