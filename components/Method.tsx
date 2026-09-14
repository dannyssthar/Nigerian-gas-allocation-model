"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ScenarioResponse } from "@/lib/api";
import { SectionHead } from "./Primitives";
import { Term, Unit } from "./Tooltip";

/**
 * Method and standing.
 *
 * Two jobs. First, explain how the model works to a reader who will be asked
 * to trust its output, in language that assumes intelligence but not
 * specialism. Second, state plainly what is not built yet, because a tool that
 * declares its own gaps is more credible than one that waits to be caught.
 */

const METHOD = [
  {
    q: "Why compare on one number?",
    a: (
      <>
        Fertiliser is priced per tonne, LNG per unit of energy delivered, electricity per
        kilowatt-hour, compute per chip-hour. Four units, no comparison possible. Converting all of
        them into what the gas itself is worth at the wellhead puts them on the same footing, and
        that single move is what the whole model exists to make possible.
      </>
    ),
  },
  {
    q: "What keeps the comparison fair?",
    a: (
      <>
        One cost boundary for everyone. Either every route carries the cost of the capital it needs,
        or none does. Mixing them is the usual way a comparison like this gets taken apart, so each
        route&rsquo;s costs are written out in full rather than hidden inside a single number.
      </>
    ),
  },
  {
    q: "Two corrections most models miss",
    a: (
      <>
        Grid power is not paid for at the tariff: a large share of what is sent out is lost, never
        billed, or never collected, so netting back at the headline tariff flatters it. And
        liquefaction burns some of the feed gas, so only part of an <Unit k="LNGabbr" /> cargo is
        ever sold. Both corrections push the comparison{" "}
        <em>against</em> compute, which is the conservative direction and therefore the credible
        one.
      </>
    ),
  },
  {
    q: "Why a range instead of one number?",
    a: (
      <>
        Because no single set of assumptions is right. Every input is sampled across a stated range
        thousands of times using <Term k="lhs">Latin Hypercube sampling</Term>, and the result is
        reported as a spread. A model that answers with one confident figure is hiding how much it
        does not know.
      </>
    ),
  },
  {
    q: "How do you know which assumptions matter?",
    a: (
      <>
        <Term k="sobol">Sobol sensitivity analysis</Term> splits the variance of the result among
        the inputs that caused it, across the whole space at once rather than nudging one variable
        at a time. It turns out four inputs out of twenty-seven explain most of the answer, and none
        of them is a gas parameter.
      </>
    ),
  },
  {
    q: "Can I reproduce what I see?",
    a: (
      <>
        Yes, and you should be able to. Every result carries a parameter set identifier and a random
        seed. Quote both alongside any figure and the exact run can be recreated later, even after
        prices have moved on. The code is open.
      </>
    ),
  },
];

export function Method() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="method" className="djn-card djn-squircle djn-section" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="How it works"
        title="The method, in plain terms"
        glossary="designScience"
        explain="No background in energy economics needed. Six questions, answered the way you would answer them out loud."
      />

      <div style={{ borderTop: "1px solid var(--line)" }}>
        {METHOD.map((m, i) => (
          <div key={m.q} style={{ borderBottom: "1px solid var(--line)" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s4)",
                padding: "var(--s5) 0",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: "var(--fs-body)",
                  fontWeight: 640,
                  color: open === i ? "var(--accent-text)" : "var(--text-primary)",
                  transition: "color .2s",
                }}
              >
                {m.q}
              </span>
              <motion.span
                animate={{ rotate: open === i ? 45 : 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ flexShrink: 0, color: "var(--text-tertiary)", lineHeight: 1 }}
                aria-hidden="true"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="djn-explain" style={{ paddingBottom: "var(--s5)" }}>
                    {m.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

const OBJECTIVES = [
  { n: 1, text: "Value gas across four pathways and establish the break-even", done: true },
  { n: 2, text: "Levelised cost of compute-grade electricity by site", done: true },
  { n: 3, text: "Opportunity cost in household connections and agro-processing capacity", done: false },
  { n: 4, text: "Carbon intensity by gas-supply pathway", done: false },
  { n: 5, text: "Deliver as an open tool and assess the regulatory implications", done: false },
];

export function Standing({ data }: { data: ScenarioResponse }) {
  return (
    <section className="djn-card djn-squircle djn-section" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="Standing"
        title="What is built, and what is not"
        explain="Two of five research objectives are implemented. The remaining three are scheduled, and the tool says so rather than implying more than exists."
      />

      <ul style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
        {OBJECTIVES.map((o) => (
          <li
            key={o.n}
            style={{ display: "flex", alignItems: "flex-start", gap: "var(--s3)" }}
          >
            <span className="djn-data-label" style={{ width: 16, flexShrink: 0, paddingTop: 3, color: "var(--text-muted)" }}>
              {o.n}
            </span>
            <span
              style={{
                fontSize: "var(--fs-sm)",
                color: o.done ? "var(--text-primary)" : "var(--text-tertiary)",
                flex: 1,
                lineHeight: 1.6,
              }}
            >
              {o.text}
            </span>
            <span
              className="djn-chip"
              data-prov={o.done ? "sourced" : "derived"}
              style={{ flexShrink: 0 }}
            >
              {o.done ? "Built" : "Scheduled"}
            </span>
          </li>
        ))}
      </ul>

      <p className="djn-note">
        Objectives 3 and 4 are scheduled for October and November 2026 in the project timeline. Every
        unsourced input is tagged in the assumptions panel. Nothing here should be quoted as a
        finding until those are replaced with sourced figures. Parameter set{" "}
        <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent-text)" }}>{data.set_id}</code>.
      </p>
    </section>
  );
}