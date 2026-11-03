Edit data/text.js to change the game; this file is a readable copy.

Words in {braces} are filled in when the game shows them.

# Systems

## Alpha Prime

A peaceful trading hub with stable orbits and friendly stations.

What they sell: Cheap: starlight extract, berry jam. Safe for new pilots.

Low prices: Starlight Extract (Bottled light. Lamps and kitchens both ask for it.); Berry Jam (Sweet preserves. Stations eat it and sometimes seal crates with it.).

### Central Station (dock)

A well-maintained orbital station offering standard docking services and trade goods.

### Terra Nova (planet)

A lush world with vast oceans and calm weather patterns.

Missions available at every dock here:

- Bounty. Titles: Quiet the chorus; Subtract some volume; Ask the rude ships to leave.
  The {faction} is rehearsing in {system}. Subtract {count} of them. They will apologize, incorrectly.
- Delivery. Mail that learned to breathe.
  Labels: postponed weather; a polite grudge; unlabeled singing; damp paperwork; a moon's baby tooth.
  Carry {hold} hold of {label} to {dock} in {system} before it becomes a hobby.
- Errand. A shopping list with opinions.
  {dock} wants {count} {good}. They insist the cheap ones taste louder.

## Static Orchard

Trees rooted in old parking orbits. Fruit ripens when ignored.

What they sell: Cheap: clock honey, spare echoes. Hungry for pickled starlight.

Low prices: Synth Honey (Made in orbit. It keeps, and the orchards buy it back.); Data Echoes (Recordings of routes, storms, and conversations no one finished.).

### The Trellis (dock)

A wooden lattice parked in orbit, knotted with vines that eat rumors. Do not lick the rails.

### Bark Without Weather (planet)

A forest wrapped around a lost climate. Fruit ripens when ignored, which is why the honey is always early.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

## Courtesy Void

Local law says you wave at explosions.

What they sell: Cheap: polite threats, bureaucratic moss.

Low prices: Security Protocols (Printed rules for who may board, and in what tone.); Agricultural Moss (A damp crop that travels well and feeds station gardens.).

### Please Remain (dock)

Take a number, a seat, and a breath. The breath is returned later, warmer, with a receipt.

### Thank You (planet)

A gas giant that bows when scanned. Storms end in signed notes. Mining without a card is considered loud.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

## Museum of Unfinished Storms

Weather that left before the ending. Labels outnumber stars.

What they sell: Cheap: unlicensed gravity. Pays dearly for pickled starlight.

Low prices: Gravity Stabilizers (Crates that keep a room's weight where you left it.).

### Gallery of Almost (dock)

Every airlock is labeled Door, Interrupted. The shop sells gravity with the tags still on.

### Exhibit Four (planet)

A planet kept under glass, including the glass. The plaque says it used to rain, then the rain got stage fright.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

## Glass Census

Every pebble has paperwork. Most of it complies.

What they sell: Cheap: warm numbers, bureaucratic moss. Pays for regret jam.

Low prices: Agricultural Moss (A damp crop that travels well and feeds station gardens.); Telemetry Data (Warm figures from hulls, storms, and census buoys.).

### Counting House (dock)

Shaped like a column of figures. Speak clearly. The decimals are sensitive and unionized.

### Population: Yes (planet)

Landing adds you to the census, and so does thinking about landing. Bring warm numbers or a spare pen.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

## Low Hum

A held note. Ships arrive slightly sharp.

What they sell: Cheap: unlicensed gravity, regret jam. Pays for polite threats.

Low prices: Berry Jam (Sweet preserves. Stations eat it and sometimes seal crates with it.); Gravity Stabilizers (Crates that keep a room's weight where you left it.).

### The Ear (dock)

It hears your engine early and hums the last note back, half a cent sharp, like a question at a door.

### A Note Held Too Long (planet)

The world is one tone. Cities are rests. Stay long enough and your fillings join the choir.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

## Parcel Orbit

Mail circled long enough to become geography.

What they sell: A careful middle. Slightly cheap echoes, moss, and threats.

Low prices: Security Protocols (Printed rules for who may board, and in what tone.); Data Echoes (Recordings of routes, storms, and conversations no one finished.); Agricultural Moss (A damp crop that travels well and feeds station gardens.).

### Lost & Misdelivered (dock)

Parcels orbit the counter until claimed, denied, or evolved. One of them draws a pension.

### The Envelope (planet)

A flat world with a flap. Inside is a smaller weather system and a letter nobody will read aloud.

Missions: the same three jobs as the first system — a bounty, a delivery, and an errand.

# Title screen

a pocket cosmos

Weird Velocity

You fly a ship named Probably. Trade odd cargo. Apologize with lasers.

- Drag the stick, or use WASD. You keep your drift.
- Stop brakes. Fire shoots, and holding it is fine.
- Land and Jump appear when you are close.
- The chart plots a course. Beacons do the leaving.

New voyage. Continue. Erase saved voyage.

# Ship

Probably

# HUD

- noContract: No contract
- contract: {job} — {destination}
- landAt: Land at {name}
- jumpTo: Jump to {name}
- credits: {n} cr
- speed: Speed {n}
- sound: Sound
- muted: Muted
- shield: SHD
- armor: ARM
- fuel: FUEL
- stop: Stop
- fire: Fire
- chart: Chart
- landButton: Land · {name}
- jumpButton: Jump · {name} · {n}
- needFuel: Need {n} fuel
- stick: Flight stick
- jumpMark: Jump {name}
- chorusMark: Chorus
- routeTo: To {name}

# Dock, chart, and death

- trade: Trade
- missions: Missions
- yard: Yard
- launch: Launch
- chart: Chart
- dockFallback: Dock
- hold: Hold {used} / {max} · {credits} cr
- contractCargo: Contract cargo: {label} ({hold}) → {dest}
- cheap: cheap
- fair: fair
- steep: steep
- goodMeta: buy {buy} · sell {sell} · you {have}
- buy1: Buy 1
- buy5: Buy 5
- sell1: Sell 1
- sell5: Sell 5
- yours: Yours
- noActive: No active contracts.
- board: Board
- abandon: Abandon
- accept: Accept
- boardEmpty: No jobs on the board.
- bountyProgress: {have}/{need} in {system}
- errandProgress: {have}/{count} {good} → {dest}
- deliveryProgress: {hold} hold → {dest}
- yardIntro: {ship} has one sincere engine and several decorative ones. The Apology Beam says excuse me at a frequency that stings.
- yardFuel: Fuel {have}/{max} · {price} cr each. Fuel is for leaving, not for flying.
- fillFuel: Fill · {cost} cr
- addFuel: +10 fuel
- yardArmor: Armor {have}/{max} · {price} cr each
- repair: Repair · {cost} cr
- addArmor: +10 armor
- yardPlanet: Repairs are a ladder and a strong opinion.
- yardStation: A hose, a stamp, and someone who has seen worse hulls.
- chartKicker: {customs} chart
- alreadyHere: You are already bothering this system.
- route: Route: {path}
- beaconCost: Next beacon costs {cost} fuel. You have {have}.
- plotted: Course plotted. Follow the amber arrow.
- plot: Plot course
- backDock: Back to dock
- backShip: Back to ship
- deathKicker: incident
- deathTitle: {ship} has become a statistic.
- deathBody: The {faction} will deny everything. Your cargo is still in the argument. A little armor is loaned back, and ten percent of your credits files the paperwork.
- appeal: File an appeal

# Messages

- lowFuel: Not enough fuel.
- accepted: Accepted: {title}
- abandoned: Abandoned: {title}
- bought: Bought {n} {name}.
- sold: Sold {n} {name} for {gain} cr.
- fueled: Took on {n} fuel.
- repaired: Patched {n} armor.
- course: Course plotted toward {name}.
- bountyCount: {have} of {need}
- noteGone: That note blew away.
- tooMany: Three contracts is enough worry.
- noHoldParcel: Not enough hold for the parcel.
- noHold: Not enough hold.
- holdFull: Hold is full.
- noCredits: Not enough credits.
- notOwned: You don't have that.
- tankFull: Tank is already smug.
- noShip: No ship.
- armorFull: Armor is already smug.

# Goods

- Starlight Extract: Bottled light. Lamps and kitchens both ask for it.
- Berry Jam: Sweet preserves. Stations eat it and sometimes seal crates with it.
- Gravity Stabilizers: Crates that keep a room's weight where you left it.
- Security Protocols: Printed rules for who may board, and in what tone.
- Synth Honey: Made in orbit. It keeps, and the orchards buy it back.
- Data Echoes: Recordings of routes, storms, and conversations no one finished.
- Agricultural Moss: A damp crop that travels well and feeds station gardens.
- Telemetry Data: Warm figures from hulls, storms, and census buoys.

# Factions

Rude Chorus. Soft Customs.

Pirates: Corsair Alpha, Raider One, Vanguard, Shadow Stalker, Iron Wing, Crimson Fleet, Void Runner, Dark Star, Strikeforce, Black Osprey, Phantom, Apex.

Solos: The Footnote, Captain Meanwhile, Soloist Annoyed.

Combat lines:

- PREPARE TO BE BOARDED
- SURRENDER YOUR CARGO
- YOU CANNOT ESCAPE
- TARGET ACQUIRED
- OPEN FIRE
- PREPARE FOR COMBAT
- ALL YOUR ORE ARE BELONG
- HOLD YOUR POSITION

# Missions

Finished contract: Contract complete. +{reward} cr

Missions available at every dock here:

- Bounty. Titles: Quiet the chorus; Subtract some volume; Ask the rude ships to leave.
  The {faction} is rehearsing in {system}. Subtract {count} of them. They will apologize, incorrectly.
- Delivery. Mail that learned to breathe.
  Labels: postponed weather; a polite grudge; unlabeled singing; damp paperwork; a moon's baby tooth.
  Carry {hold} hold of {label} to {dock} in {system} before it becomes a hobby.
- Errand. A shopping list with opinions.
  {dock} wants {count} {good}. They insist the cheap ones taste louder.
# Browser title

Weird Velocity (Velocity). Weird Velocity — a pocket space trading game.
