import { lazy, Suspense } from "react";

const Inner = lazy(() => import("./FlightMapInner"));

type Props = {
  bbox?: [number, number, number, number];
  station: string;
};

export function FlightMap(props: Props) {
  if (typeof window === "undefined") {
    return (
      <section className="glass rounded-xl p-5 lg:p-6 h-[600px] flex items-center justify-center">
        <p className="text-xs font-mono text-muted-foreground">Loading map…</p>
      </section>
    );
  }
  return (
    <Suspense
      fallback={
        <section className="glass rounded-xl p-5 lg:p-6 h-[600px] flex items-center justify-center">
          <p className="text-xs font-mono text-muted-foreground">Loading map…</p>
        </section>
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}
