/* Types mirror the FastAPI response exactly. The engine is the single source
   of truth: nothing numeric is hard-coded on this side. */

export type ProvenanceKind = "sourced" | "derived" | "working" | "user";

export interface ParameterDef {
  name: string;
  label: string;
  value: number;
  unit: string;
  provenance: ProvenanceKind;
  citation: string | null;
  low: number | null;
  high: number | null;
  note: string;
}

export interface ParametersResponse {
  set_id: string;
  description: string;
  parameters: ParameterDef[];
  unsourced_count: number;
  sourced_count: number;
}

export interface NetbackRow {
  key: string;
  label: string;
  value: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface SiteRow {
  key: string;
  name: string;
  state: string;
  pue: number;
  gas_access: string;
  flare_distance_km: number;
  fibre_quality: string;
  gas_price_applied: number;
  lcoe_busbar_usd_per_kwh: number;
  lcoe_compute_usd_per_kwh: number;
  lcoe_compute_us_cents_per_kwh: number;
  fuel_share: number;
  vs_solar_battery_busbar: number;
  note: string;
}

export interface ScenarioResponse {
  set_id: string;
  seed: number;
  draws: number;
  chain: {
    gas_mmbtu: number;
    electricity_kwh: number;
    compute_grade_kwh: number;
    overhead_kwh: number;
    draw_kwh_per_accelerator_hour: number;
    accelerator_hours: number;
  };
  netback: NetbackRow[];
  winner: string;
  gas_price_power: number;
  cost_stack: {
    accelerator_capital: number;
    facility_capital: number;
    operating: number;
    total: number;
  };
  breakeven: {
    point: number;
    cash_cost: number;
    gas_opportunity_cost: number;
    p10: number;
    p50: number;
    p90: number;
  };
  compute_ranks_first_share: number;
  lcoe: {
    busbar_usd_per_mwh: number;
    solar_battery_benchmark_usd_per_mwh: number;
    sites: SiteRow[];
  };
  samples?: {
    compute_netback: number[];
    breakeven: number[];
  };
}

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    // Errors say what happened and what to do, never just "something broke".
    throw new Error(
      `The engine returned ${res.status} for ${path}. If you are running ` +
        `locally, check that uvicorn is up on port 8000.`
    );
  }
  return res.json() as Promise<T>;
}

export const getParameters = () => request<ParametersResponse>("/api/parameters");

export const runScenario = (
  overrides: Record<string, number>,
  opts: { draws?: number; includeSamples?: boolean } = {}
) =>
  request<ScenarioResponse>("/api/scenario", {
    method: "POST",
    body: JSON.stringify({
      overrides,
      draws: opts.draws ?? 4096,
      include_samples: opts.includeSamples ?? true,
    }),
  });

/* ── formatting ──────────────────────────────────────────────────────
   Every number on screen goes through one of these, so decimal places are
   consistent across the interface. Money always gets tabular figures in the
   markup, per the type rules. */

export const money = (v: number, dp = 2) =>
  `${v < 0 ? "\u2212" : ""}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;

export const num = (v: number, dp = 2) =>
  v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const pct = (v: number, dp = 0) => `${(v * 100).toFixed(dp)}%`;

/* Parameters span six orders of magnitude, from a 0.006 opex rate to a 30,000
   capex. One decimal rule cannot serve both, so the step and precision follow
   the size of the range. */
export function stepFor(low: number, high: number): number {
  const span = high - low;
  if (span >= 10000) return 250;
  if (span >= 1000) return 50;
  if (span >= 100) return 5;
  if (span >= 10) return 0.5;
  if (span >= 1) return 0.01;
  return 0.001;
}

export function dpFor(low: number, high: number): number {
  const span = high - low;
  if (span >= 100) return 0;
  if (span >= 1) return 2;
  return 3;
}