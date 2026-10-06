import { createFileRoute } from "@tanstack/react-router";
import autoShowcase from "../assets/auto-showcase.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA GT — Electric Grand Tourer" },
      {
        name: "description",
        content: "Discover the AURA GT, a refined electric grand tourer shaped for effortless performance.",
      },
      { property: "og:title", content: "AURA GT — Electric Grand Tourer" },
      {
        property: "og:description",
        content: "A refined electric grand tourer shaped for effortless performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-showroom-glow" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-10 lg:px-14">
        <a href="#vehicle" className="text-sm font-semibold tracking-[0.24em] text-foreground">
          AURA
        </a>
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Electric GT
        </span>
      </header>

      <section id="vehicle" className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-7xl flex-col px-6 pb-8 sm:px-10 lg:px-14">
        <div className="relative flex flex-1 items-center justify-center py-3 sm:py-5">
          <div className="pointer-events-none absolute left-0 top-8 z-10 sm:top-12 lg:top-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              The new grand tourer
            </p>
            <h1 className="font-display text-[clamp(3.75rem,10vw,9rem)] font-semibold leading-[0.82] text-foreground">
              AURA <span className="text-muted-foreground">GT</span>
            </h1>
          </div>

          <img
            src={autoShowcase}
            alt="Graphite AURA GT electric grand tourer in a dark studio"
            width={1600}
            height={1104}
            className="showcase-car mt-24 w-full max-w-6xl object-contain sm:mt-28 lg:mt-20"
          />
        </div>

        <div className="grid border-t border-border py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10 lg:py-8">
          <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Quiet power, precise control, and a silhouette designed to move through the world effortlessly.
          </p>
          <dl className="mt-7 grid grid-cols-3 gap-5 sm:mt-0 sm:gap-10 lg:gap-16">
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Range</dt>
              <dd className="mt-2 text-lg font-semibold text-foreground sm:text-xl">620 km</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">0–100</dt>
              <dd className="mt-2 text-lg font-semibold text-foreground sm:text-xl">3.2 s</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Power</dt>
              <dd className="mt-2 text-lg font-semibold text-foreground sm:text-xl">480 kW</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
