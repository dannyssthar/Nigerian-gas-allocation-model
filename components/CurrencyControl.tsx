"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CURRENCIES, PINNED, byCode } from "@/lib/currencies";
import { useCurrency } from "@/lib/currency-context";

/**
 * The currency control.
 *
 * Two-step flow, like a remittance app: pick the currency, then confirm the
 * rate. The rate is typed rather than fetched \u2014 an explicit assumption the
 * reader owns, consistent with everything else in the tool \u2014 and the live
 * preview line converts the headline netback as you type, so the rate is
 * never abstract.
 */
export default function CurrencyControl() {
  const cur = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(cur.code);
  const [rateText, setRateText] = useState(String(cur.rate));
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Reopen fresh each time, seeded from the current state.
  useEffect(() => {
    if (open) {
      setPicked(cur.code);
      setRateText(cur.code === "USD" ? "1" : String(cur.rate));
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [open, cur.code, cur.rate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pinned = PINNED.map(byCode);
    const rest = CURRENCIES.filter((c) => !PINNED.includes(c.code));
    const all = [...pinned, ...rest];
    if (!q) return all;
    return all.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [query]);

  const parsedRate = parseFloat(rateText.replace(/,/g, ""));
  const rateOk = picked === "USD" || (Number.isFinite(parsedRate) && parsedRate > 0);
  const previewRate = picked === "USD" ? 1 : rateOk ? parsedRate : 0;
  const pickedCur = byCode(picked);

  function apply() {
    if (!rateOk) return;
    cur.set(picked, previewRate);
    setOpen(false);
  }

  return (
    <>
      {/* The trigger reads as a statement of current state, not a button label:
          which currency, at what rate. */}
      <button className="djn-currency-trigger r-field" onClick={() => setOpen(true)}>
        <span className="djn-currency-trigger__badge">{cur.symbol}</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <span className="djn-eyebrow" style={{ display: "block" }}>
            Display currency
          </span>
          <span className="djn-currency-trigger__line tnum">
            {cur.isUSD ? "US Dollar" : `1 USD = ${cur.rate.toLocaleString("en-US")} ${cur.code}`}
          </span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  className="djn-currency-scrim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  className="djn-currency-panel r-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Choose a display currency"
                  initial={{ opacity: 0, scale: 0.96, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                >
                  <div className="djn-currency-panel__head">
                    <h2 className="djn-title" style={{ fontSize: "1.05rem" }}>
                      Display currency
                    </h2>
                    <button className="djn-btn djn-btn--ghost r-pill" onClick={() => setOpen(false)}>
                      Close
                    </button>
                  </div>

                  <div className="djn-currency-search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
                      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search 150+ currencies"
                      aria-label="Search currencies"
                    />
                  </div>

                  <div className="djn-currency-list" role="listbox" aria-label="Currencies">
                    {results.map((c) => (
                      <button
                        key={c.code}
                        role="option"
                        aria-selected={picked === c.code}
                        className="djn-currency-row"
                        data-picked={picked === c.code}
                        onClick={() => {
                          setPicked(c.code);
                          if (c.code === "USD") setRateText("1");
                        }}
                      >
                        <span className="djn-currency-row__sym">{c.symbol}</span>
                        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <span style={{ fontWeight: 680 }}>{c.code}</span>
                          <span className="djn-currency-row__name">{c.name}</span>
                        </span>
                        {picked === c.code && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="m5 12 5 5 9-10" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {results.length === 0 && (
                      <p className="djn-data-label" style={{ padding: "var(--s5)", textAlign: "center" }}>
                        No currency matches &ldquo;{query}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Step two: the rate, typed. Hidden for USD, where it is 1
                      by definition. */}
                  {picked !== "USD" && (
                    <div className="djn-currency-rate">
                      <label className="djn-eyebrow" htmlFor="djn-rate">
                        Your exchange rate
                      </label>
                      <div className="djn-currency-rate__row">
                        <span className="tnum" style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                          1 USD =
                        </span>
                        <input
                          id="djn-rate"
                          inputMode="decimal"
                          value={rateText}
                          onChange={(e) => setRateText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && apply()}
                          placeholder="e.g. 1530"
                          aria-invalid={!rateOk}
                        />
                        <span style={{ fontWeight: 680, whiteSpace: "nowrap" }}>{picked}</span>
                      </div>
                      {!rateOk && rateText.trim() !== "" && (
                        <p className="djn-currency-rate__err">Enter a number greater than zero.</p>
                      )}
                    </div>
                  )}

                  <div className="djn-currency-foot">
                    <p className="djn-currency-preview tnum">
                      {rateOk ? (
                        <>
                          $81.37 →{" "}
                          <strong>
                            {pickedCur.symbol}
                            {(81.37 * previewRate).toLocaleString("en-US", {
                              maximumFractionDigits: 81.37 * previewRate >= 10000 ? 0 : 2,
                            })}
                          </strong>
                        </>
                      ) : (
                        "\u00a0"
                      )}
                    </p>
                    <button className="djn-btn djn-btn--accent r-pill" onClick={apply} disabled={!rateOk} style={{ opacity: rateOk ? 1 : 0.45 }}>
                      Use {picked}
                    </button>
                  </div>

                  <p className="djn-currency-note">
                    Display only. The model computes in US dollars, and figures quoted from
                    published papers stay in dollars so the citation stays exact.
                  </p>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}