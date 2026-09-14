/**
 * The glossary.
 *
 * Every technical term in the interface is defined here once, so the same
 * word never gets two explanations. Written for someone who knows energy but
 * not data centres, or data centres but not energy, since the tool sits
 * between two audiences and neither should feel talked down to.
 *
 * Keep definitions to two or three sentences. A tooltip is a nudge, not a
 * chapter.
 */

export interface Term {
  title: string;
  body: string;
}

export const GLOSSARY: Record<string, Term> = {
  netback: {
    title: "Netback",
    body:
      "What a unit of gas is worth at the wellhead once every cost downstream of it is paid. Revenue from the finished product, minus conversion, transport and capital recovery, divided by the gas consumed. The gas price is not subtracted: the netback IS the implied gas price, so comparing it against the regulated price tells you whether the pathway clears.",
  },
  mmbtu: {
    title: "MMBtu",
    body:
      "One million British thermal units, the standard trading unit for natural gas. Roughly the energy in a thousand cubic feet of gas. Every pathway in this model is expressed per MMBtu so the four can be compared directly.",
  },
  acceleratorHour: {
    title: "Accelerator-hour",
    body:
      "One AI accelerator, meaning a GPU or similar chip, run for one hour at a stated utilisation. It is the unit compute is actually bought and sold in, which lets the revenue side of the model sit on a real market price rather than an invented one.",
  },
  pue: {
    title: "Power usage effectiveness",
    body:
      "Total facility power divided by the power reaching the chips. A PUE of 1.50 means that for every 1.5 kW drawn from the grid, 1 kW does computing and 0.5 kW runs cooling, power conversion and lighting. Hot, humid climates push it up, which is how geography enters the economics.",
  },
  heatRate: {
    title: "Heat rate",
    body:
      "British thermal units of gas burned per kilowatt-hour of electricity produced. Lower is more efficient. A modern combined-cycle turbine sits near 7,000 Btu/kWh; an open-cycle unit is much worse.",
  },
  computeGrade: {
    title: "Compute-grade electricity",
    body:
      "A kilowatt-hour that actually reaches an accelerator, not one that leaves the generator. Since only 1/PUE of generated power arrives at the chips, a compute-grade kWh costs PUE times as much as a busbar kWh. This is the cost a data centre really faces.",
  },
  lcoe: {
    title: "Levelised cost of electricity",
    body:
      "The average cost of each kilowatt-hour across a plant's whole life, with capital, fuel and operating costs discounted to today. It is how generation options of different shapes are compared on one number.",
  },
  busbar: {
    title: "Busbar cost",
    body:
      "The cost of a kilowatt-hour as it leaves the generator, before any facility overhead. Published LCOE comparisons are almost always busbar figures, so a fair comparison has to use busbar on both sides.",
  },
  breakeven: {
    title: "Break-even price",
    body:
      "The price per accelerator-hour at which compute stops out-earning the best alternative use of the same gas. Above it, compute wins. Below it, the gas is worth more as fertiliser, LNG or grid power.",
  },
  percentiles: {
    title: "P10, P50 and P90",
    body:
      "The spread rather than a single guess. P50 is the middle outcome: half the runs land above it. P10 and P90 mark the low and high ends, with 80 per cent of runs falling between them. A wide gap means the answer is sensitive to assumptions.",
  },
  lhs: {
    title: "Latin Hypercube sampling",
    body:
      "A way of exploring uncertainty that divides each input's range into equal slices and samples every slice exactly once. It covers the possibility space far more evenly than plain random draws, so the percentiles stay stable instead of jittering between runs.",
  },
  provenance: {
    title: "Where this number came from",
    body:
      "Every input is tagged. Sourced means it comes from a published, citable figure. Unsourced means it is a plausible placeholder chosen so the model runs, and it is not evidence. Yours means you have overridden it. Nothing is hidden: if a number is not yet backed by a source, the tool says so.",
  },
  opportunityCost: {
    title: "Opportunity cost of the gas",
    body:
      "The gap between the break-even price and the cash cost of running the accelerator. It is what the gas itself is worth per accelerator-hour, once the machine has paid for itself. When it is small, the gas price cannot influence a siting decision.",
  },
  crowdOut: {
    title: "Crowd-out and crowd-in",
    body:
      "Crowd-out is when gas committed to a data centre would otherwise have served households or agro-processing, and that service does not happen. Crowd-in is when the data centre's anchor demand makes generation bankable and the surplus reaches the community. Which one occurs depends on four conditions, not on data centres being good or bad.",
  },
  atcc: {
    title: "ATC&C losses",
    body:
      "Aggregate technical, commercial and collection losses: the share of electricity sent out that is lost in the network, never billed, or billed and never paid. It means the tariff is not the revenue, and netting back at the headline tariff overstates what grid power earns.",
  },
  shrinkage: {
    title: "Liquefaction shrinkage",
    body:
      "The portion of feed gas burned to run the liquefaction train. Only the surviving fraction is ever sold as LNG. Omitting it inflates LNG netback, and LNG is compute's closest rival in this ranking.",
  },
  crf: {
    title: "Capital recovery factor",
    body:
      "The annual payment that repays a capital sum over its life at a given cost of capital. It carries the cost of money, which in a Nigerian project at a high discount rate is most of the answer. Short-lived assets like AI accelerators are punished hardest.",
  },
  sobol: {
    title: "Sobol sensitivity",
    body:
      "A method that splits the variance of the result among the inputs that caused it, across the whole space at once rather than one variable at a time. It shows which handful of assumptions actually decide the answer, and which make no difference.",
  },
  flareGas: {
    title: "Flare gas",
    body:
      "Associated gas burned off at oil wells because there is no pipeline or buyer. It has no domestic offtake and no regulated price, so it is cheap. It also sits in the Niger Delta, hundreds of kilometres from where Nigeria's data centres actually are.",
  },
  fuelShare: {
    title: "Fuel share",
    body:
      "How much of the cost of a kilowatt-hour is the gas itself, as opposed to the generator's capital and operating cost. A low fuel share means gas price changes barely move the cost of power.",
  },
  designScience: {
    title: "Design science research",
    body:
      "A research method where the contribution is an artefact that solves a real problem, evaluated by whether it works, rather than a hypothesis tested against data. The tool is the thesis, not an illustration of it.",
  },

/* ── Units and abbreviations ──────────────────────────────────────────
   Everything short enough to be mistaken for jargon gets an entry. A reader
   should never have to leave the page to find out what a symbol means.      */

  MMBtu: {
    title: "MMBtu · million British thermal units",
    body:
      "The standard trading unit for natural gas. One MMBtu is one million Btu, roughly the energy in a thousand cubic feet of gas, or about 293 kWh of raw heat. The double M is Roman: M for thousand, twice.",
  },
  Btu: {
    title: "Btu · British thermal unit",
    body:
      "The heat needed to raise one pound of water by one degree Fahrenheit. About 1,055 joules. Used here in heat rate, which counts Btu of gas burned per kWh of electricity produced.",
  },
  kWh: {
    title: "kWh · kilowatt-hour",
    body:
      "One kilowatt of power drawn for one hour. The unit electricity is billed in. A 700 W accelerator running flat out for an hour uses 0.7 kWh.",
  },
  MWh: {
    title: "MWh · megawatt-hour",
    body:
      "One thousand kilowatt-hours. Generation and wholesale power costs are usually quoted per MWh, which is why the benchmark comparison on this page uses it.",
  },
  MW: {
    title: "MW · megawatt",
    body:
      "One million watts of power capacity, an instantaneous rate rather than a quantity. A mid-sized Nigerian data centre might draw 20 to 60 MW.",
  },
  GPU: {
    title: "GPU · graphics processing unit",
    body:
      "The chip class that runs AI workloads. Used interchangeably here with accelerator, since compute is priced and traded per GPU-hour.",
  },
  PUEabbr: {
    title: "PUE · power usage effectiveness",
    body:
      "Total facility power divided by the power reaching the chips. 1.50 means half as much again is spent on cooling and conversion as on computing itself. Lower is better; 1.0 is the unreachable ideal.",
  },
  LCOEabbr: {
    title: "LCOE · levelised cost of electricity",
    body:
      "The average lifetime cost of a kilowatt-hour, with capital, fuel and operating costs discounted to today. It is how generation options of different shapes get compared on one number.",
  },
  ATCCabbr: {
    title: "ATC&C · aggregate technical, commercial and collection losses",
    body:
      "The share of electricity sent out that is lost in the network, never billed, or billed and never paid. In Nigeria it is large enough that the tariff and the revenue are very different numbers.",
  },
  LNGabbr: {
    title: "LNG · liquefied natural gas",
    body:
      "Gas chilled to about minus 162 degrees Celsius so it becomes liquid and can be shipped. Liquefaction burns part of the feed gas, which is why shrinkage appears in the LNG pathway.",
  },
  CRFabbr: {
    title: "CRF · capital recovery factor",
    body:
      "The annual payment that repays a capital sum over its life at a given cost of capital. CRF = r(1+r)^n / ((1+r)^n − 1). Short-lived, expensive assets like AI accelerators are punished hardest by it.",
  },
  LHSabbr: {
    title: "LHS · Latin Hypercube sampling",
    body:
      "A sampling method that divides each input range into equal slices and draws from every slice exactly once. It covers the possibility space far more evenly than random draws, so percentiles stay stable between runs.",
  },
  USDMMBtu: {
    title: "US$/MMBtu · dollars per million Btu",
    body:
      "The common unit of this whole model. Every pathway is expressed as dollars earned per MMBtu of gas consumed, which is what makes four unlike uses directly comparable.",
  },
  centsKwh: {
    title: "US cents/kWh · cents per kilowatt-hour",
    body:
      "The retail-facing way of quoting electricity cost. 7.64 cents per kWh is the same as 76.40 dollars per MWh.",
  },
  gCO2: {
    title: "gCO₂/kWh · grams of carbon dioxide per kilowatt-hour",
    body:
      "Carbon intensity of electricity. Gas generation typically sits between 350 and 500; coal is roughly double; solar and wind are near zero in operation.",
  },
  NMDPRA: {
    title: "NMDPRA",
    body:
      "Nigerian Midstream and Downstream Petroleum Regulatory Authority. Sets the regulated wholesale gas price schedule this model uses, including the 2.18 US$/MMBtu power-sector price.",
  },
  NERC: {
    title: "NERC",
    body:
      "Nigerian Electricity Regulatory Commission. Source of the grid generation and ATC&C loss figures underlying the grid pathway.",
  },
  CPEEL: {
    title: "CPEEL",
    body:
      "Centre for Petroleum, Energy Economics and Law, University of Ibadan. The centre this study is conducted within.",
  },
  NUPRC: {
    title: "NUPRC",
    body:
      "Nigerian Upstream Petroleum Regulatory Commission. Publishes the flare tracker data that the flare-gas pathway will be sourced from.",
  },
  utilisation: {
    title: "Utilisation",
    body:
      "The share of an accelerator's rated power actually drawn in normal operation. 0.80 means a 700 W chip averages 560 W. Raising it means more work per chip but more energy per chip-hour.",
  },
  availability: {
    title: "Availability",
    body:
      "The fraction of the year an asset is running and earning. Capital is recovered over those hours only, so lower availability makes every productive hour carry more of the capital cost.",
  },
  discountRate: {
    title: "Discount rate",
    body:
      "The project's cost of capital, used to convert future costs into today's money. Nigerian projects carry a high rate, and in a capital-heavy business like compute it is one of the largest single drivers of the answer.",
  },
};


export const term = (key: keyof typeof GLOSSARY) => GLOSSARY[key];