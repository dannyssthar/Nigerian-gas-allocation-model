Parameter set: base-2026-09
Initial working snapshot. Gas price sourced from the NMDPRA 2026 wholesale framework. Physical chain as stated in Document 2. The full cost stack is unsourced and must be replaced before any figure is reported as a finding.

SOURCED (2)
  Gas price, gas-based industry: 1.54 US$/MMBtu    Nigerian Midstream and Downstream Petroleum Regulatory Authority, 2026
  Gas price, power sector: 2.18 US$/MMBtu    Nigerian Midstream and Downstream Petroleum Regulatory Authority, 2026

WORKING (30)
  Accelerator capital cost: 3e+04 US$ each    Placeholder for a current-generation training accelerator. Source before use.
  Accelerator rated power: 0.7 kW    Document 2, stated working value
  Accelerator economic life: 3 years    Short life is the defining feature of compute economics and drives the break-even.
  ATC&C losses: 0.35 fraction    Energy sent out but never billed or collected. Verify against Nigerian Electricity Regulatory Commission, 2025.
  Data-centre availability: 0.9 fraction    
  Compute operating cost: 0.25 US$/accelerator-hour    Staff, network, bandwidth, maintenance. Excludes energy, which is the gas.
  Discount rate: 0.15 fraction    Nigerian project cost of capital. Dominant term in every capital charge.
  Electricity tariff: 0.14 US$/kWh    Naira tariff converted at an unverified rate. Two sources needed: tariff order and FX.
  Facility capital cost: 9,000 US$/kW    Shell, power train and cooling. Nigerian build cost unverified.
  Facility economic life: 15 years    
  Flare gas price discount: 0.5 multiplier    Flare gas has no domestic offtake and no regulated price. 1.00 means no discount, which is the conservative test.
  Compute price: 2.6 US$/accelerator-hour    The decision variable. Marketplace spot rates differ sharply from hyperscaler contract rates; state which is meant.
  Turbine heat rate: 7,000 Btu/kWh    Document 2, stated working value
  LNG delivered price: 11 US$/MMBtu    Candidate live feed: World Bank Pink Sheet LNG series.
  Liquefaction cost: 2.5 US$/MMBtu feed    
  Regasification cost: 0.5 US$/MMBtu delivered    
  Shipping cost: 1.2 US$/MMBtu delivered    
  Liquefaction fuel shrinkage: 0.1 fraction    Feed gas burned to run the liquefaction train. Omitting this overstates LNG.
  Generator availability: 0.75 fraction    
  Generator capital cost: 1,100 US$/kW    
  Generator life: 25 years    
  Generator non-fuel operating cost: 0.006 US$/kWh    
  Power usage effectiveness: 1.5 ratio    Document 2, stated working value. Nigerian climate raises cooling load; the upper bound matters.
  PUE rise per unit humidity: 0.45 PUE/fraction RH    Humidity degrades evaporative cooling. Referenced to 0.62 RH. This is the weakest assumption in the site model; say so.
  PUE rise per degree: 0.03 PUE/deg C    Linear placeholder. The defensible version uses wet-bulb hours from a NiMet or ERA5 series, not a single coefficient.
  Reference ambient temperature: 26 deg C    Temperature at which the base PUE holds. Abuja's mean is the anchor.
  Urea non-gas conversion cost: 120 US$/tonne    Plant capital recovery, catalyst, labour, bagging, inland freight.
  Gas per tonne of urea: 26 MMBtu/tonne    Feedstock and process fuel combined.
  Urea price, FOB: 400 US$/tonne    Candidate live feed: World Bank Pink Sheet, monthly.
  Accelerator utilisation: 0.8 fraction    Document 2, stated working value

Outstanding sourcing tasks: 30
