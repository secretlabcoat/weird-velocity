// All player-facing writing. Edit this file to change what the game says.
// Systems are in voyage order. The first system is where a new game starts.
// TEXT.md at the repo root is a readable copy of these words.

export function fill(template, vars) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = vars && vars[key];
    return value == null ? "" : String(value);
  });
}

const text = {
  // Browser tab and home-screen wording. The installed icon name also lives in manifest.webmanifest.
  meta: {
    title: "Rim Runner",
    shortTitle: "Rim Runner",
    description: "Rim Runner — a pocket space trading game.",
  },

  // The ship the player flies.
  ship: {
    name: "Probably",
  },
  pilot: {
    name: "Captain",
  },

  // Title screen.
  title: {
    kicker: "a pocket cosmos",
    nameLine1: "Rim",
    nameLine2: "Runner",
    tagline: "Trade odd cargo. Apologize with lasers.",
    help: [
      "Drag the stick, or use WASD. You keep your drift.",
      "Stop brakes. Fire shoots, and holding it is fine.",
      "Land and Jump appear when you are close.",
      "The chart plots a course. Beacons do the leaving.",
    ],
    newVoyage: "New voyage",
    continue: "Continue",
    erase: "Erase saved voyage",
    nameHeading: "Name your voyage",
    shipLabel: "Ship name",
    pilotLabel: "Your name",
    launch: "Launch",
    back: "Back",
  },

  // In-flight top bar, bars, and the buttons under the radar.
  hud: {
    noContract: "No contract",
    contract: "{job} — {destination}",
    landAt: "Land at {name}",
    jumpTo: "Jump to {name}",
    credits: "{n} cr",
    speed: "Speed {n}",
    sound: "Sound",
    muted: "Muted",
    shield: "SHD",
    armor: "ARM",
    fuel: "FUEL",
    stop: "Stop",
    fire: "Fire",
    chart: "Chart",
    landButton: "Land · {name}",
    jumpButton: "Jump · {name} · {n}",
    needFuel: "Need {n} fuel",
    stick: "Flight stick",
    jumpMark: "Jump {name}",
    chorusMark: "Association",
    routeTo: "To {name}",
  },

  // Dock, yard, trade rows, chart, and the death screen.
  screens: {
    trade: "Trade",
    missions: "Missions",
    yard: "Yard",
    launch: "Launch",
    chart: "Chart",
    dockFallback: "Dock",
    hold: "Hold {used} / {max} · {credits} cr",
    contractCargo: "Contract cargo: {label} ({hold}) → {dest}",
    cheap: "cheap",
    fair: "fair",
    steep: "steep",
    goodMeta: "buy {buy} · sell {sell} · you {have}",
    buy1: "Buy 1",
    buy5: "Buy 5",
    sell1: "Sell 1",
    sell5: "Sell 5",
    yours: "Yours",
    noActive: "No active contracts.",
    board: "Board",
    abandon: "Abandon",
    accept: "Accept",
    boardEmpty: "No jobs on the board.",
    bountyProgress: "{have}/{need} in {system}",
    errandProgress: "{have}/{count} {good} → {dest}",
    deliveryProgress: "{hold} hold → {dest}",
    yardIntro: "{ship} has one sincere engine and several decorative ones. The Apology Beam says excuse me at a frequency that stings.",
    yardFuel: "Fuel {have}/{max} · {price} cr each. Fuel is for leaving, not for flying.",
    fillFuel: "Fill · {cost} cr",
    addFuel: "+10 fuel",
    yardArmor: "Armor {have}/{max} · {price} cr each",
    repair: "Repair · {cost} cr",
    addArmor: "+10 armor",
    yardPlanet: "Repairs are a ladder and a strong opinion.",
    yardStation: "A hose, a stamp, and someone who has seen worse hulls.",
    chartKicker: "{customs} chart",
    alreadyHere: "You are already bothering this system.",
    route: "Route: {path}",
    beaconCost: "Next beacon costs {cost} fuel. You have {have}.",
    plotted: "Course plotted. Follow the amber arrow.",
    plot: "Plot course",
    backDock: "Back to dock",
    backShip: "Back to ship",
    deathKicker: "incident",
    deathTitle: "{ship} has become a statistic.",
    deathBody: "{faction} will deny everything. Your cargo is still in the argument. A little armor is loaned back, and ten percent of your credits files the paperwork.",
    appeal: "File an appeal",
  },

  debris: {
    scrap: "Jagged Scrap",
    asteroid: "Mineral Chunk",
    salvage: "Drift Cargo",
    harvested: "Harvested {n} {item}.",
  },

  // Short lines said after an action. The flight HUD does not print this log.
  messages: {
    lowFuel: "Not enough fuel.",
    accepted: "Accepted: {title}",
    abandoned: "Abandoned: {title}",
    bought: "Bought {n} {name}.",
    sold: "Sold {n} {name} for {gain} cr.",
    fueled: "Took on {n} fuel.",
    repaired: "Patched {n} armor.",
    course: "Course plotted toward {name}.",
    bountyCount: "{have} of {need}",
    noteGone: "That note blew away.",
    tooMany: "Three contracts is enough worry.",
    noHoldParcel: "Not enough hold for the parcel.",
    noHold: "Not enough hold.",
    holdFull: "Hold is full.",
    noCredits: "Not enough credits.",
    notOwned: "You don't have that.",
    tankFull: "Tank is already smug.",
    noShip: "No ship.",
    armorFull: "Armor is already smug.",
  },

  // Contract wording. Every dock posts one of each kind.
  missions: {
    complete: "Contract complete. +{reward} cr",
    bounty: {
      titles: [
        "Adjourn the Association",
        "Subtract some members",
        "Ask the loud ships to leave",
      ],
      detail: "{faction} is holding a meeting in {system}. Subtract {count} of them. They will apologize, incorrectly.",
    },
    delivery: {
      title: "Mail that learned to breathe",
      labels: [
        "postponed weather",
        "a polite grudge",
        "unlabeled singing",
        "damp paperwork",
        "a moon's baby tooth",
      ],
      detail: "Carry {hold} hold of {label} to {dock} in {system} before it becomes a hobby.",
    },
    errand: {
      title: "A shopping list with opinions",
      detail: "{dock} wants {count} {good}. They insist the cheap ones taste louder.",
    },
  },

  // Commodities, in the same order as the price table.
  goods: [
    { id: "starlight", name: "Earvine Extract", about: "Bottled tincture that elevates. Kitchens and squad houses both ask for it." },
    { id: "regret", name: "Dasper Marmalade", about: "Sweet preserves that stations eat and sometimes use to seal crates." },
    { id: "gravity", name: "Gravity Stabilizers", about: "Creates custom gravitational responses." },
    { id: "threats", name: "Extended Persons Data", about: "Printed names from across universes." },
    { id: "honey", name: "Cheese Honey", about: "Made in orbit. It keeps, and the orchards buy it back." },
    { id: "echoes", name: "Sound Bites", about: "Recordings of routes, storms, and conversations." },
    { id: "moss", name: "Architectural Moss", about: "A damp crop that travels well and feeds station gardens." },
    { id: "numbers", name: "Telemetry Data", about: "Warm figures from hulls, storms, and census buoys." },
    { id: "ore", name: "Raw Ore", about: "Mineral broken off drifting rock, which stations buy. You get it by shooting Jagged Scrap (1 ore) and Mineral Chunks (2 ore)." },
    { id: "squazzex", name: "Squazzex", about: "Kinda hard to travel without the stuff." },
  ],

  // Names shouted in a fight, and the groups the chart mentions.
  factions: {
    chorus: "The Association",
    customs: "Soft Customs",
    pirateNames: [
      "Corsair Alpha", "Raider One", "Vanguard", "Shadow Stalker",
      "Iron Wing", "Crimson Fleet", "Void Runner", "Dark Star",
      "Strikeforce", "Black Osprey", "Phantom", "Apex",
    ],
    soloNames: ["The Footnote", "Captain Meanwhile", "Soloist Annoyed"],
    barks: [
      "PREPARE TO BE BOARDED",
      "SURRENDER YOUR CARGO",
      "YOU CANNOT ESCAPE",
      "TARGET ACQUIRED",
      "OPEN FIRE",
      "PREPARE FOR COMBAT",
      "ALL YOUR ORE ARE BELONG",
      "HOLD YOUR POSITION",
    ],
  },

  // Voyage order. A new game starts in the first system.
  systems: [
    {
      id: "brine",
      name: "Beta Primo",
      short: "Beta",
      blurb: "A peaceful trading hub with stable orbits and friendly stations.",
      specialty: "Cheap: Earvine extract, Dasper marmalade. Safe for new pilots.",
      places: [
        { id: "pickle", name: "Gas Star Station", desc: "A well-maintained orbital station offering standard docking services and trade goods." },
        { id: "wetmoon", name: "Terra Li", desc: "A lush world with vast oceans and calm weather patterns." },
      ],
    },
    {
      id: "orchard",
      name: "Delaydian",
      short: "Delaydian",
      blurb: "Trees rooted in old parking orbits. Fruit ripens when ignored.",
      specialty: "Cheap: cheese honey, spare sound bites. Hungry for Earvine extract.",
      places: [
        { id: "trellis", name: "The Tremula", desc: "A wooden lattice parked in orbit, knotted with vines that eat rumors. Do not lick the rails." },
        { id: "bark", name: "Bark", desc: "A forest wrapped around a lost climate. Fruit ripens when ignored, which is why the honey is always early." },
      ],
    },
    {
      id: "courtesy",
      name: "Pigmoffa Prime",
      short: "Pigmoffa",
      blurb: "Local law says you wave at explosions.",
      specialty: "Cheap: extended persons data, architectural moss.",
      places: [
        { id: "remain", name: "Pleasant Meadows", desc: "Take a number, a seat, and a breath. The breath is returned later, warmer, with a receipt." },
        { id: "thankyou", name: "Thank You", desc: "A gas giant that bows when scanned. Storms end in signed notes. Mining without a card is considered loud." },
      ],
    },
    {
      id: "museum",
      name: "Astryd",
      short: "Astryd",
      blurb: "Weather that left before the ending. Labels outnumber stars.",
      specialty: "Cheap: unlicensed gravity. Pays dearly for Earvine extract.",
      places: [
        { id: "gallery", name: "Hall 9", desc: "Every airlock is labeled Door, Interrupted. The shop sells gravity with the tags still on." },
        { id: "exhibit", name: "76 Four", desc: "A planet kept under glass, including the glass. The plaque says it used to rain, then the rain got stage fright." },
      ],
    },
    {
      id: "census",
      name: "Glass Caucus",
      short: "Caucus",
      blurb: "Every pebble has paperwork. Most of it complies.",
      specialty: "Cheap: telemetry data, architectural moss. Pays for Dasper marmalade.",
      places: [
        { id: "counting", name: "Taratoga", desc: "Shaped like a column of figures. Speak clearly. The decimals are sensitive and unionized." },
        { id: "population", name: "Populata", desc: "Landing adds you to the census, and so does thinking about landing. Bring telemetry data or a spare pen." },
      ],
    },
    {
      id: "hum",
      name: "Bassecta",
      short: "Bassecta",
      blurb: "A held note. Ships arrive slightly sharp.",
      specialty: "Cheap: unlicensed gravity, Dasper marmalade. Pays for extended persons data.",
      places: [
        { id: "ear", name: "The Ear", desc: "It hears your engine early and hums the last note back, half a cent sharp, like a question at a door." },
        { id: "note", name: "Varnel 5", desc: "The world is one tone. Cities are rests. Stay long enough and your fillings join the choir." },
      ],
    },
    {
      id: "parcel",
      name: "Partial Orbit",
      short: "Partial",
      blurb: "Mail circled long enough to become geography.",
      specialty: "A careful middle. Slightly cheap sound bites, architectural moss, and extended persons data.",
      places: [
        { id: "lostmail", name: "The Plentiful", desc: "Parcels orbit the counter until claimed, denied, or evolved. One of them draws a pension." },
        { id: "envelope", name: "Swordbrine", desc: "A flat world with a flap. Inside is a smaller weather system and a letter nobody will read aloud." },
      ],
    },
  ],
};

export default text;
