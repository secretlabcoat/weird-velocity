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
    title: "Weird Velocity",
    shortTitle: "Velocity",
    description: "Weird Velocity — a pocket space trading game.",
  },

  // The ship the player flies.
  ship: {
    name: "Probably",
  },

  // Title screen.
  title: {
    kicker: "a pocket cosmos",
    nameLine1: "Weird",
    nameLine2: "Velocity",
    tagline: "You fly a ship named {ship}. Trade odd cargo. Apologize with lasers.",
    help: [
      "Drag the stick, or use WASD. You keep your drift.",
      "Stop brakes. Fire shoots, and holding it is fine.",
      "Land and Jump appear when you are close.",
      "The chart plots a course. Beacons do the leaving.",
    ],
    newVoyage: "New voyage",
    continue: "Continue",
    erase: "Erase saved voyage",
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
    chorusMark: "Chorus",
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
    deathBody: "The {faction} will deny everything. Your cargo is still in the argument. A little armor is loaned back, and ten percent of your credits files the paperwork.",
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
        "Quiet the chorus",
        "Subtract some volume",
        "Ask the rude ships to leave",
      ],
      detail: "The {faction} is rehearsing in {system}. Subtract {count} of them. They will apologize, incorrectly.",
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
    { id: "starlight", name: "Starlight Extract", about: "Bottled light. Lamps and kitchens both ask for it." },
    { id: "regret", name: "Berry Jam", about: "Sweet preserves. Stations eat it and sometimes seal crates with it." },
    { id: "gravity", name: "Gravity Stabilizers", about: "Crates that keep a room's weight where you left it." },
    { id: "threats", name: "Security Protocols", about: "Printed rules for who may board, and in what tone." },
    { id: "honey", name: "Synth Honey", about: "Made in orbit. It keeps, and the orchards buy it back." },
    { id: "echoes", name: "Data Echoes", about: "Recordings of routes, storms, and conversations no one finished." },
    { id: "moss", name: "Agricultural Moss", about: "A damp crop that travels well and feeds station gardens." },
    { id: "numbers", name: "Telemetry Data", about: "Warm figures from hulls, storms, and census buoys." },
    { id: "ore", name: "Raw Ore", about: "Mineral broken off drifting rock. Stations buy it." },
  ],

  // Names shouted in a fight, and the groups the chart mentions.
  factions: {
    chorus: "Rude Chorus",
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
      name: "Alpha Prime",
      short: "Alpha",
      blurb: "A peaceful trading hub with stable orbits and friendly stations.",
      specialty: "Cheap: starlight extract, berry jam. Safe for new pilots.",
      places: [
        { id: "pickle", name: "Central Station", desc: "A well-maintained orbital station offering standard docking services and trade goods." },
        { id: "wetmoon", name: "Terra Nova", desc: "A lush world with vast oceans and calm weather patterns." },
      ],
    },
    {
      id: "orchard",
      name: "Static Orchard",
      short: "Orchard",
      blurb: "Trees rooted in old parking orbits. Fruit ripens when ignored.",
      specialty: "Cheap: clock honey, spare echoes. Hungry for pickled starlight.",
      places: [
        { id: "trellis", name: "The Trellis", desc: "A wooden lattice parked in orbit, knotted with vines that eat rumors. Do not lick the rails." },
        { id: "bark", name: "Bark Without Weather", desc: "A forest wrapped around a lost climate. Fruit ripens when ignored, which is why the honey is always early." },
      ],
    },
    {
      id: "courtesy",
      name: "Courtesy Void",
      short: "Courtesy",
      blurb: "Local law says you wave at explosions.",
      specialty: "Cheap: polite threats, bureaucratic moss.",
      places: [
        { id: "remain", name: "Please Remain", desc: "Take a number, a seat, and a breath. The breath is returned later, warmer, with a receipt." },
        { id: "thankyou", name: "Thank You", desc: "A gas giant that bows when scanned. Storms end in signed notes. Mining without a card is considered loud." },
      ],
    },
    {
      id: "museum",
      name: "Museum of Unfinished Storms",
      short: "Museum",
      blurb: "Weather that left before the ending. Labels outnumber stars.",
      specialty: "Cheap: unlicensed gravity. Pays dearly for pickled starlight.",
      places: [
        { id: "gallery", name: "Gallery of Almost", desc: "Every airlock is labeled Door, Interrupted. The shop sells gravity with the tags still on." },
        { id: "exhibit", name: "Exhibit Four", desc: "A planet kept under glass, including the glass. The plaque says it used to rain, then the rain got stage fright." },
      ],
    },
    {
      id: "census",
      name: "Glass Census",
      short: "Census",
      blurb: "Every pebble has paperwork. Most of it complies.",
      specialty: "Cheap: warm numbers, bureaucratic moss. Pays for regret jam.",
      places: [
        { id: "counting", name: "Counting House", desc: "Shaped like a column of figures. Speak clearly. The decimals are sensitive and unionized." },
        { id: "population", name: "Population: Yes", desc: "Landing adds you to the census, and so does thinking about landing. Bring warm numbers or a spare pen." },
      ],
    },
    {
      id: "hum",
      name: "Low Hum",
      short: "Low Hum",
      blurb: "A held note. Ships arrive slightly sharp.",
      specialty: "Cheap: unlicensed gravity, regret jam. Pays for polite threats.",
      places: [
        { id: "ear", name: "The Ear", desc: "It hears your engine early and hums the last note back, half a cent sharp, like a question at a door." },
        { id: "note", name: "A Note Held Too Long", desc: "The world is one tone. Cities are rests. Stay long enough and your fillings join the choir." },
      ],
    },
    {
      id: "parcel",
      name: "Parcel Orbit",
      short: "Parcel",
      blurb: "Mail circled long enough to become geography.",
      specialty: "A careful middle. Slightly cheap echoes, moss, and threats.",
      places: [
        { id: "lostmail", name: "Lost & Misdelivered", desc: "Parcels orbit the counter until claimed, denied, or evolved. One of them draws a pension." },
        { id: "envelope", name: "The Envelope", desc: "A flat world with a flap. Inside is a smaller weather system and a letter nobody will read aloud." },
      ],
    },
  ],
};

export default text;
