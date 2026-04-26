import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopControlBar } from "@/components/TopControlBar";
import { PlayerHeatmap } from "@/components/PlayerHeatmap";
import { TranscriptWindow } from "@/components/TranscriptWindow";
import { AgentChat } from "@/components/AgentChat";
import { FEEDS } from "@/data/feeds";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiveATC AI-Analyzer · Mission-Critical ATC Audio Intelligence" },
      {
        name: "description",
        content:
          "Real-time ATC radio analysis: AI-enhanced audio, activity heatmap, live transcript and the SkyWatch agent for instant flight insights.",
      },
      { property: "og:title", content: "LiveATC AI-Analyzer · ATC Audio Intelligence" },
      {
        property: "og:description",
        content: "Mission-critical dashboard for ATC audio, transcripts and AI-powered analysis.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [feed, setFeed] = useState(FEEDS[0]);
  const [enhanced, setEnhanced] = useState(true);
  const [isLive, setIsLive] = useState(false);

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

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 lg:px-6 py-6 space-y-6">
        <h1 className="sr-only">ATC Audio Intelligence Dashboard</h1>
        <PlayerHeatmap audioUrl={feed.audioUrl} enhanced={enhanced} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TranscriptWindow />
          <AgentChat />
        </div>
      </main>
    </div>
  );
}
