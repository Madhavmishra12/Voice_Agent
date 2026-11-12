// Shared dark two-column GrowQR auth shell, used by BOTH the Stack Auth handler
// (/handler/[...stack], cloud) and the local/OSS auth pages (/auth/login,
// /auth/signup). LEFT: a centered card that wraps the auth form (`children`).
// RIGHT (lg+ only): a brand/value panel with the GrowQR logo and product story.
// Mobile collapses to the single card column. The form column scrolls and stays
// centered so tall (sign-up) forms never clip on short viewports. Palette is the
// deep charcoal surfaces with GrowQR's orange CTA accent.

import type { ReactNode } from "react";

import { BrandLogo } from "@/components/BrandLogo";

const HIGHLIGHTS = [
  "Agentic AI",
  "Growth workflows",
  "Built to scale",
];

export function AuthShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-[55%_45%]">
      {/* Form column (LEFT) — scrolls and stays centered so tall forms never
          clip. */}
      <main className="flex min-h-screen flex-col overflow-y-auto bg-white">
        <div className="flex min-h-full items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-900/5 sm:p-9">
            {/* Mobile-only wordmark (brand panel is hidden) */}
            <div className="lg:hidden">
              <BrandLogo className="h-10" />
            </div>
            {children}
          </div>
        </div>
      </main>

      {/* Brand / value panel (RIGHT) — hidden on mobile */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-orange-100 bg-orange-50/70 p-10 lg:flex xl:p-14">
        {/* A restrained orange glow echoes the mark. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 size-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--cta), transparent 70%)" }}
        />

        <div className="relative">
          <BrandLogo inverse className="h-11" />
        </div>

        <div className="relative max-w-md space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
            Grow with intelligence
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-950 xl:text-5xl">
            Make every customer moment count.
          </h1>
          <p className="max-w-sm text-base leading-7 text-zinc-600">
            Put agentic AI to work across your growth journey, from the first conversation to lasting customer relationships.
          </p>
          <ul className="flex flex-wrap gap-2">
            {HIGHLIGHTS.map((point) => (
              <li
                key={point}
                className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

          <div className="relative mb-8 max-w-md rounded-2xl border border-orange-200 bg-white p-5 shadow-sm xl:mb-12">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-800">A smarter way to grow</span>
            <span className="size-2 rounded-full bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.8)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Connect", "Automate", "Grow"].map((step, index) => (
              <div key={step} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <span className="mb-3 block text-[10px] tracking-widest text-orange-700">0{index + 1}</span>
                <span className="text-xs font-medium text-zinc-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
