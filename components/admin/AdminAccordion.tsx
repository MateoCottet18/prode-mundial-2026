"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type AccordionBadgeTone = "amber" | "emerald" | "red" | "neutral" | "cyan";

export type AdminAccordionProps = {
  id: string;
  title: string;
  description?: string;
  badge?: string | number | null;
  badgeTone?: AccordionBadgeTone;
  meta?: string;
  isOpen: boolean;
  onToggle: () => void;
  unmountWhenClosed?: boolean;
  children: ReactNode;
};

const TONE_CLASSES: Record<AccordionBadgeTone, string> = {
  amber: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  emerald: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  red: "border-red-300/40 bg-red-300/10 text-red-100",
  neutral: "border-white/15 bg-white/[0.06] text-slate-200",
  cyan: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
};

const TONE_DOT: Record<AccordionBadgeTone, string> = {
  amber: "bg-amber-300",
  emerald: "bg-emerald-300",
  red: "bg-red-300",
  neutral: "bg-slate-400",
  cyan: "bg-cyan-300",
};

const ANIMATION_MS = 300;

/**
 * Accordion con estética "broadcast": header con bullet LED de color tonal,
 * badge a la derecha, animación CSS en `grid-template-rows` y lazy mount
 * opcional para listas pesadas.
 */
export function AdminAccordion({
  id,
  title,
  description,
  badge,
  badgeTone = "amber",
  meta,
  isOpen,
  onToggle,
  unmountWhenClosed = false,
  children,
}: AdminAccordionProps) {
  const [keepMounted, setKeepMounted] = useState(isOpen);
  const closingTimerRef = useRef<number | null>(null);

  if (unmountWhenClosed && isOpen && !keepMounted) {
    setKeepMounted(true);
  }

  const shouldRender = !unmountWhenClosed || isOpen || keepMounted;

  useEffect(() => {
    if (!unmountWhenClosed || isOpen) {
      return;
    }

    closingTimerRef.current = window.setTimeout(() => {
      setKeepMounted(false);
      closingTimerRef.current = null;
    }, ANIMATION_MS);

    return () => {
      if (closingTimerRef.current !== null) {
        window.clearTimeout(closingTimerRef.current);
        closingTimerRef.current = null;
      }
    };
  }, [isOpen, unmountWhenClosed]);

  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;

  return (
    <section
      className={`fc-card overflow-hidden transition ${
        isOpen ? "border-emerald-300/25" : ""
      }`}
    >
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.025] sm:px-6 sm:py-5"
      >
        {/* Bullet LED tonal — varía con el badgeTone */}
        <span
          aria-hidden
          className={`relative flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full ${TONE_DOT[badgeTone]} transition`}
        >
          <span
            className={`absolute inset-0 rounded-full ${TONE_DOT[badgeTone]} ${
              isOpen ? "fc-pulse-dot opacity-70" : "opacity-30"
            }`}
          />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="fc-display text-lg uppercase tracking-[0.06em] text-white sm:text-xl">
              {title}
            </h2>
            {badge !== undefined && badge !== null && badge !== "" ? (
              <span
                className={`fc-display rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] tabular-nums ${TONE_CLASSES[badgeTone]}`}
              >
                {badge}
              </span>
            ) : null}
            {meta ? (
              <span className="fc-display rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-slate-300">
                {meta}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="text-sm text-slate-400">{description}</p>
          ) : null}
        </div>

        <span
          aria-hidden
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-slate-950/55 text-emerald-200 transition-transform duration-300 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          <Chevron />
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-white/5 px-5 py-5 sm:px-6 sm:py-6 transition-opacity duration-200 ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            {shouldRender ? children : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
