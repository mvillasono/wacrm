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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      {children}
      <footer className="text-center text-xs text-muted-foreground">
        Creado por{" "}
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
  );
}
