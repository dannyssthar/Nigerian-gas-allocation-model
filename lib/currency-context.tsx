"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { byCode } from "./currencies";

/**
 * Display currency.
 *
 * One rule holds everything together: THE MODEL COMPUTES IN US DOLLARS,
 * ALWAYS. The currency system converts what the reader sees, never what the
 * engine calculates. If conversion touched the engine, a stale rate typed at
 * the screen would silently corrupt the economics, and no figure could ever
 * be reproduced from the parameter set and seed alone.
 *
 * The rate is typed by the person, not fetched. That is deliberate for a
 * research tool: a fetched rate changes daily and silently, which is exactly
 * what a reproducible instrument cannot allow. A typed rate is an explicit,
 * visible assumption, like every other number here.
 *
 * Published figures quoted from papers (Uranbold and Lima's benchmarks) stay
 * in dollars no matter what: converting a citation misquotes it.
 */

interface CurrencyState {
  code: string;
  symbol: string;
  /** Units of the display currency per one US dollar. */
  rate: number;
  isUSD: boolean;
  /** Format a US-dollar model value in the display currency. */
  fmt: (usd: number, dp?: number) => string;
  set: (code: string, rate: number) => void;
}

const Ctx = createContext<CurrencyState | null>(null);
const STORE_KEY = "djn-currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState("USD");
  const [rate, setRate] = useState(1);

  // Restore the reader's last choice; a tool that forgets your currency every
  // visit never feels like yours.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { code: string; rate: number };
        if (saved.code && saved.rate > 0) {
          setCode(saved.code);
          setRate(saved.code === "USD" ? 1 : saved.rate);
        }
      }
    } catch {
      /* storage unavailable; USD default stands */
    }
  }, []);

  const set = useCallback((c: string, r: number) => {
    const clean = c === "USD" ? 1 : Math.max(r, 0.000001);
    setCode(c);
    setRate(clean);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ code: c, rate: clean }));
    } catch {
      /* no-op */
    }
  }, []);

  const value = useMemo<CurrencyState>(() => {
    const symbol = byCode(code).symbol;
    return {
      code,
      symbol,
      rate,
      isUSD: code === "USD",
      fmt: (usd: number, dp = 2) => {
        const v = usd * rate;
        // Large-rate currencies drown two decimals in six digits of naira;
        // once a value is in the thousands the pennies are noise.
        const effDp = Math.abs(v) >= 10000 ? 0 : dp;
        const sign = v < 0 ? "\u2212" : "";
        return (
          sign +
          symbol +
          Math.abs(v).toLocaleString("en-US", {
            minimumFractionDigits: effDp,
            maximumFractionDigits: effDp,
          })
        );
      },
      set,
    };
  }, [code, rate, set]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}