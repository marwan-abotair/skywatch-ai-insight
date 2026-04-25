import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopControlBar } from "@/components/TopControlBar";
import { FEEDS } from "@/data/feeds";
import { Plus, Trash2, Save, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · LiveATC AI-Analyzer" },
      {
        name: "description",
        content: "Configure ATC feeds, audio defaults, AI agent model and context window for the SkyWatch analyzer.",
      },
      { property: "og:title", content: "Settings · LiveATC AI-Analyzer" },
      {
        property: "og:description",
        content: "Manage feeds, audio defaults and AI configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

type Settings = {
  feeds: string[];
  defaultVolume: number;
  autoEnhanced: boolean;
  autoPlay: boolean;
  model: string;
  contextWindow: "15m" | "1h" | "session";
  systemPrompt: string;
};

const DEFAULTS: Settings = {
  feeds: FEEDS.map((f) => f.label),
  defaultVolume: 70,
  autoEnhanced: true,
  autoPlay: false,
  model: "google/gemini-3-flash-preview",
  contextWindow: "1h",
  systemPrompt:
    "You are SkyWatch, an expert ATC radio analysis assistant. Use Markdown tables for structured answers (Time UTC, Callsign, Details). Be concise and precise.",
};

const STORAGE_KEY = "skywatch.settings.v1";

function SettingsPage() {
  const [feed, setFeed] = useState(FEEDS[0]);
  const [enhanced, setEnhanced] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const [s, setS] = useState<Settings>(DEFAULTS);
  const [newFeed, setNewFeed] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopControlBar
        feed={feed}
        onFeedChange={setFeed}
        enhanced={enhanced}
        onEnhancedChange={setEnhanced}
        isLive={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
      />

      <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 lg:px-6 py-8 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage feeds, audio defaults and the SkyWatch AI agent.
            </p>
          </div>
          <button
            onClick={save}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition",
              saved
                ? "bg-primary/30 text-primary border border-primary/50"
                : "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_12px_oklch(0.86_0.22_145/0.4)]",
            )}
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>

        {/* Feed management */}
        <section className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> ATC Feeds
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Feeds available in the dashboard dropdown.
          </p>
          <ul className="space-y-2">
            {s.feeds.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-white/5 border border-white/10 font-mono text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(0.86_0.22_145/0.6)]" />
                <span className="flex-1">{f}</span>
                <button
                  onClick={() => setS({ ...s, feeds: s.feeds.filter((_, idx) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive transition"
                  aria-label={`Remove ${f}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={newFeed}
              onChange={(e) => setNewFeed(e.target.value)}
              placeholder="e.g. KSFO Tower"
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => {
                if (!newFeed.trim()) return;
                setS({ ...s, feeds: [...s.feeds, newFeed.trim()] });
                setNewFeed("");
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </section>

        {/* Audio defaults */}
        <section className="glass rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">Audio Defaults</h2>

          <div className="flex items-center justify-between">
            <label className="text-sm">Default volume</label>
            <div className="flex items-center gap-3 w-1/2">
              <input
                type="range"
                min={0}
                max={100}
                value={s.defaultVolume}
                onChange={(e) => setS({ ...s, defaultVolume: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                {s.defaultVolume}
              </span>
            </div>
          </div>

          <ToggleRow
            label="Auto-enable Enhanced (ai-coustics) on load"
            value={s.autoEnhanced}
            onChange={(v) => setS({ ...s, autoEnhanced: v })}
          />
          <ToggleRow
            label="Auto-play feed when opening dashboard"
            value={s.autoPlay}
            onChange={(v) => setS({ ...s, autoPlay: v })}
          />
        </section>

        {/* AI agent */}
        <section className="glass rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold">SkyWatch AI Agent</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                Model
              </label>
              <select
                value={s.model}
                onChange={(e) => setS({ ...s, model: e.target.value })}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="google/gemini-3-flash-preview">gemini-3-flash (fast)</option>
                <option value="google/gemini-2.5-pro">gemini-2.5-pro (deep)</option>
                <option value="openai/gpt-5">gpt-5 (premium)</option>
                <option value="openai/gpt-5-mini">gpt-5-mini</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                Context window
              </label>
              <select
                value={s.contextWindow}
                onChange={(e) =>
                  setS({ ...s, contextWindow: e.target.value as Settings["contextWindow"] })
                }
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="15m">Last 15 minutes</option>
                <option value="1h">Last hour</option>
                <option value="session">Whole session</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              System prompt
            </label>
            <textarea
              value={s.systemPrompt}
              onChange={(e) => setS({ ...s, systemPrompt: e.target.value })}
              rows={5}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Advanced — overrides the default SkyWatch persona on the next chat session.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={cn(
          "relative h-6 w-11 rounded-full border transition",
          value ? "bg-primary/25 border-primary/50" : "bg-white/5 border-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full transition-all",
            value ? "left-5 bg-primary" : "left-0.5 bg-muted-foreground",
          )}
        />
      </button>
    </div>
  );
}
