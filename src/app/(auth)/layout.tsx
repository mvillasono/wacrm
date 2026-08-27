import type { Metadata } from "next";
import type { ReactNode } from "react";

// Shared metadata for auth pages (login / signup / forgot-password).
// None of these should be indexed — they'd compete with the marketing
// landing in SERPs and offer nothing to a searcher who hasn't already
// signed up. Each page still gets its own <title> via its own
// metadata.title override below the route group layout.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background px-4 py-12">
      {/* Fine dot grid, not a color blob — texture instead of empty void,
          fading out toward the edges so it reads as a considered surface
          rather than an infinite mechanical tile. --border keeps it correct
          across every accent theme and light/dark mode. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_45%,black,transparent)]"
      />
      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        {children}
        <footer className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://ytupacuando.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            YTuPaCuando
          </a>
        </footer>
      </div>
    </div>
  );
}
