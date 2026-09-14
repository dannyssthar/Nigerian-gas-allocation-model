# DJN · DanJohn–Nwobi Gas Allocation Model

A decision-support tool for siting AI data centres in Nigeria.

Daniel Dan-John, Matriculation No. 206611
M.Sc. Energy Economics, Centre for Petroleum, Energy Economics and Law, University of Ibadan
Supervisor: Dr. Dilinna Lucy Nwobi

---

## The question

Nigerian natural gas has competing claims on it. The same molecule can be exported as LNG,
converted to urea, burned for grid power, or burned to run AI accelerators. Each use pays
differently, and each leaves the country in a different position.

That comparison is usually argued rather than computed, because the four uses are measured in
different units. This model puts them on one unit, United States dollars per MMBtu of gas at
the wellhead, and solves for the price at which the ranking flips.

## What it does today

Given a scenario, the model returns:

- the netback of one MMBtu down all four pathways, as a point estimate and as a P10 to P90 range
- the accelerator-hour price at which compute stops out-earning its best alternative
- the levelised cost of compute-grade electricity at six candidate Nigerian sites
- which parameters actually drive the answer, by Sobol global sensitivity

## An early result

Under the current working assumptions, the entire opportunity cost of the gas is about
**six United States cents per accelerator-hour**, against a cash cost of roughly 2.12 dollars
to run the accelerator for that hour. Gas is under three per cent of the cost stack.

If that holds once the cost stack is sourced, gas pricing cannot steer where this load lands.
Moving the price across the whole regulated band barely moves a developer's decision. The
levers that would work are licensing conditions, embedded-generation obligations and siting
rules.

This is provisional. See the warning below.

---

## Status of the numbers

**Two of thirty-two parameters are sourced.** Everything else is tagged `WORKING` in
`engine/gascompute/parameters.py` and shown as unsourced in the interface.

No figure produced by this tool may be reported as a finding until those values are replaced.

```bash
cd engine
python -m gascompute.parameters      # prints the full provenance audit
```

Sourced so far:

| Parameter | Value | Source |
|---|---|---|
| Gas price, power sector | 2.18 US$/MMBtu | NMDPRA, 2026 |
| Gas price, gas-based industry | 0.90 to 2.18 US$/MMBtu | NMDPRA, 2026 |

The one sourced comparator, used to sanity-check the LCOE engine, is the 25.11 US$/MWh
solar-plus-battery figure from Uranbold and Lima (2025).

---

## Objectives

| # | Objective | Status |
|---|---|---|
| 1 | Value gas across four pathways; establish the break-even | **Built** |
| 2 | Levelised cost of compute-grade electricity by site | **Built** |
| 3 | Opportunity cost in connections and agro-capacity; crowd-out and crowd-in | Scheduled, Oct 2026 |
| 4 | Carbon intensity by gas-supply pathway | Scheduled, Nov 2026 |
| 5 | Deliver as an open tool; assess regulatory implications | In progress |

Objectives 3 and 4 follow the project Gantt chart. They are marked as scheduled in the
interface itself rather than quietly omitted.

---

## Method

**Netback on one boundary.** All four pathways include capital recovery, or none does. Mixing
boundaries is the usual way a netback ranking gets attacked, so each pathway's cost list is
written out rather than folded into a constant.

Two corrections that change the ranking and are easy to miss:

- **Grid power.** The tariff is not the revenue. A large share of energy sent out is never
  billed or collected. Netting back at the headline tariff overstates grid power.
- **LNG.** Liquefaction burns a share of the feed gas. Only the surviving fraction is sold.
  Omitting this shrinkage inflates LNG, which is compute's closest rival.

Both push the comparison against compute, which is the conservative direction.

**Uncertainty by Latin Hypercube.** Document 2 commits the study to reporting ranges rather
than points. LHS stratifies each parameter's range so the sample covers the space evenly,
giving stable percentiles at a fraction of the draws plain random sampling would need. Seeded,
so every run is reproducible.

**Break-even by root-find, not by scanning.** Brent's method, solved inside the Monte Carlo, so
the output is a distribution of break-evens rather than a single figure.

**Sensitivity by Sobol, not by tornado.** The parameters interact: discount rate and
accelerator life multiply each other inside the capital recovery factor, so a one-at-a-time
chart would understate both. Sobol decomposes variance across the whole input space and
separates first-order effects from interactions.

**Provenance as a type.** A parameter cannot exist without declaring its source. A value marked
`SOURCED` without a citation raises an error at construction, so an unsourced number cannot
hide inside a default.

---

## Architecture

```
Browser  --POST /api/scenario-->  Python engine  --JSON-->  Browser
(Next.js, TypeScript)              (numpy, scipy)
```

The economics lives in the engine. The interface collects inputs and displays results, and
holds no numbers of its own: every control, range and provenance tag is rendered from what
`/api/parameters` returns, so the engine stays the single source of truth.

A full recompute, 4,096 Latin Hypercube draws plus 2,048 break-even root-finds, returns in
about 270 ms, which is why the sliders recompute live rather than behind a Run button.

---

## Project structure

```
djn-gas-allocation/
├── app/                     Next.js App Router
│   ├── page.tsx             main interface
│   ├── layout.tsx           fonts, theme bootstrap
│   └── globals.css          design tokens, three layers
├── components/
│   ├── ChainDiagram.tsx     the Document 2 conversion, animated
│   ├── ParameterRail.tsx    sliders, each with a provenance chip
│   ├── Results.tsx          netback, break-even, distribution, sites
│   ├── ThemeToggle.tsx      light and dark, View Transitions reveal
│   └── Primitives.tsx       count-up numbers, provenance chips
├── lib/
│   └── api.ts               typed client and formatters
├── engine/
│   ├── gascompute/
│   │   ├── __init__.py
│   │   ├── provenance.py    Parameter and ParameterSet
│   │   ├── compute_unit.py  the gas-to-compute chain
│   │   ├── parameters.py    the base-case snapshot
│   │   ├── netback.py       the four pathways
│   │   ├── lcoe.py          cost of compute-grade power
│   │   ├── sites.py         six candidate Nigerian sites
│   │   ├── uncertainty.py   Latin Hypercube, Brent solver
│   │   └── sensitivity.py   Sobol indices
│   ├── tests/
│   │   └── test_golden.py   23 tests
│   ├── requirements.txt
│   └── README.md
├── api/
│   ├── index.py             FastAPI service
│   └── requirements.txt
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── vercel.json
└── README.md
```

---

## Running it

Two terminals. Git Bash on Windows, any shell elsewhere.

**Terminal 1, the engine**

```bash
cd engine
python -m venv .venv
source .venv/Scripts/activate      # macOS and Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/ -v         # 23 tests must pass before going further
cd ../api
pip install -r requirements.txt
python -m uvicorn index:app --reload --port 8000
```

**Terminal 2, the interface**

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploying

One Vercel project from the repository root. `vercel.json` routes `/api/*` to the Python
function; Next.js serves everything else. One push, one URL, no separate backend host.

---

## Tests

The golden tests lock the engine to figures already published in the proposal. If a refactor
changes the 170.07 accelerator-hours per MMBtu that Document 2 states, the suite fails.

```bash
cd engine
python -m pytest tests/ -v
```

They cover the conversion chain step by step, capital recovery against a textbook value, the
LNG shrinkage and grid loss corrections, the break-even as a true root, and the provenance
rules themselves.

---

## Reproducibility

Every result carries a parameter set id and a random seed. Live price feeds, when added, will
write a new set id rather than editing an existing one, so a figure quoted in a chapter can be
reproduced years later even after prices have moved.

Cite the set id and the seed alongside any number taken from this tool.

---

## Licence

Apache License 2.0 for the code. CC-BY-4.0 for derived data.

## Citation

```
Dan-John, D. and Nwobi, D. L. 2026. DanJohn-Nwobi Gas Allocation Model:
a decision-support tool for siting AI data centres in Nigeria.
Centre for Petroleum, Energy Economics and Law, University of Ibadan.
```