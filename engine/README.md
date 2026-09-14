# Gas-to-Compute Decision Engine

Techno-economic engine for *Powering Compute or Powering the Nation? A Decision-Support
Tool for Siting AI Data Centres in Nigeria*. Daniel Chibuzor, CPEEL, University of Ibadan.
Supervisor: Dr. Dilinna Lucy Nwobi.

## What it does

Values one MMBtu of Nigerian natural gas across four competing pathways on a single
common boundary, and solves for the accelerator-hour price at which compute stops
out-earning its best alternative.

| Module | Role |
|---|---|
| `provenance.py` | Every parameter must declare its source. A sourced value without a citation raises. |
| `compute_unit.py` | The gas-to-compute chain from Document 2. Returns 170.07 accelerator-hours per MMBtu. |
| `netback.py` | The four pathways: compute, grid, fertiliser, LNG. |
| `uncertainty.py` | Latin Hypercube sampling and Brent break-even solver. |
| `sensitivity.py` | Sobol global sensitivity indices. |
| `lcoe.py` | Objective 2: levelised cost of compute-grade electricity by site. |
| `sites.py` | Six candidate Nigerian sites: climate, gas access, flare distance, fibre. |

## Status of the numbers

Only the gas price is sourced. **The entire cost stack is unsourced** and is marked
`WORKING` in `parameters.py`. No figure from this engine may be reported as a finding
until those values are replaced. Print the outstanding list with:

```bash
python -m gascompute.parameters
```

## Install and run

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest tests/ -v         # 23 golden tests, all must pass
python -m gascompute.parameters    # provenance audit
```

## Reproducibility

Results are stamped with a parameter set id and a random seed. Price feeds write a new
set id; they never modify an existing one. A thesis figure cites its set id so an
examiner can reproduce it exactly.