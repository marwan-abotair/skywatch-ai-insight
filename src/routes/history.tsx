import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TopControlBar } from "@/components/TopControlBar";
import { FEEDS } from "@/data/feeds";
import { SESSIONS } from "@/data/history";
import { Calendar, Filter, FileText, Plane, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session History · LiveATC AI-Analyzer" },
      {
        name: "description",
        content: "Browse previously recorded ATC sessions with AI summaries, callsign counts and timeline metrics.",
      },
      { property: "og:title", content: "Session History · LiveATC AI-Analyzer" },
      {
        property: "og:description",
        content: "Past ATC sessions with AI-generated summaries and segment statistics.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [feed, setFeed] = useState(FEEDS[0]);
  const [enhanced, setEnhanced] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [feedFilter, setFeedFilter] = useState<string>("all");
  const [onlySummary, setOnlySummary] = useState(false);

  const rows = useMemo(() => {
    return SESSIONS.filter((s) => (feedFilter === "all" ? true : s.feed === feedFilter)).filter((s) =>
      onlySummary ? s.hasSummary : true,
    );
  }, [feedFilter, onlySummary]);

  const uniqueFeeds = Array.from(new Set(SESSIONS.map((s) => s.feed)));

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

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 lg:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Past ATC recordings with AI summaries and segment statistics.
          </p>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={feedFilter}
            onChange={(e) => setFeedFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">All feeds</option>
            {uniqueFeeds.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlySummary}
              onChange={(e) => setOnlySummary(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-muted-foreground">Only with AI summary</span>
          </label>
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {rows.length} / {SESSIONS.length} sessions
          </span>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              <tr>
                <th className="text-left px-4 py-3"><Calendar className="inline h-3 w-3 mr-1" />Date</th>
                <th className="text-left px-4 py-3">Feed</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-right px-4 py-3"><Plane className="inline h-3 w-3 mr-1" />Speech segs</th>
                <th className="text-right px-4 py-3">Callsigns</th>
                <th className="text-center px-4 py-3"><FileText className="inline h-3 w-3 mr-1" />Summary</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{s.date}</td>
                  <td className="px-4 py-3 font-mono">{s.feed}</td>
                  <td className="px-4 py-3 font-mono">{s.duration}</td>
                  <td className="px-4 py-3 font-mono text-right text-primary">{s.speechSegments}</td>
                  <td className="px-4 py-3 font-mono text-right">{s.callsigns}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        s.hasSummary ? "bg-primary shadow-[0_0_8px_oklch(0.86_0.22_145/0.6)]" : "bg-white/15",
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No sessions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
