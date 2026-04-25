import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopControlBar } from "@/components/TopControlBar";
import { PlayerHeatmap } from "@/components/PlayerHeatmap";
import { TranscriptWindow } from "@/components/TranscriptWindow";
import { AgentChat } from "@/components/AgentChat";
import { FlightMap } from "@/components/FlightMap";
import { FEEDS } from "@/data/feeds";
import { Headphones, Map as MapIcon } from "lucide-react";
import { LiveTranscriptProvider } from "@/stores/liveTranscript";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiveATC AI-Analyzer · Mission-Critical ATC Audio Intelligence" },
      {
        name: "description",
        content:
          "Real-time ATC radio analysis: AI-enhanced audio, activity heatmap, live transcript, live flight map and the SkyWatch agent for instant insights.",
      },
      { property: "og:title", content: "LiveATC AI-Analyzer · ATC Audio Intelligence" },
      {
        property: "og:description",
        content: "Mission-critical dashboard for ATC audio, transcripts, live flight tracking and AI-powered analysis.",
      },
    ],
  }),
  component: DashboardWrapper,
});

type Tab = "audio" | "map";

function DashboardWrapper() {
  return (
    <LiveTranscriptProvider>
      <Dashboard />
    </LiveTranscriptProvider>
  );
}

function Dashboard() {
  const [feed, setFeed] = useState(FEEDS[0]);
  const [enhanced, setEnhanced] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [tab, setTab] = useState<Tab>("audio");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Drives MediaRecorder + /api/transcribe when Go Live is on AND the audio is actually playing.
  useLiveTranscription({ enabled: isLive && isPlaying, stream });

  return (
    <div className="min-h-screen flex flex-col">
      <TopControlBar
        feed={feed}
        onFeedChange={setFeed}
        enhanced={enhanced}
        onEnhancedChange={setEnhanced}
        isLive={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        isPlaying={isPlaying}
      />

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 lg:px-6 py-6 space-y-6">
        <h1 className="sr-only">ATC Audio Intelligence Dashboard</h1>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10">
          <TabButton active={tab === "audio"} onClick={() => setTab("audio")} icon={<Headphones className="h-4 w-4" />}>
            Audio Intelligence
          </TabButton>
          <TabButton active={tab === "map"} onClick={() => setTab("map")} icon={<MapIcon className="h-4 w-4" />}>
            Live Flight Map
          </TabButton>
          <div className="ml-auto text-[11px] font-mono text-muted-foreground pb-2">
            {feed.station} · {feed.region}
          </div>
        </div>

        {tab === "audio" ? (
          <>
            <PlayerHeatmap
              audioUrl={feed.audioUrl}
              enhanced={enhanced}
              onStreamReady={setStream}
              onPlayingChange={setIsPlaying}
              autoPlay={isLive}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TranscriptWindow />
              <AgentChat />
            </div>
          </>
        ) : (
          <FlightMap bbox={feed.bbox} station={feed.station} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-mono uppercase tracking-wider transition-all border-b-2 -mb-px",
        active
          ? "text-primary border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-white/20",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
