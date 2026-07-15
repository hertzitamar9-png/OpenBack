import type { Request, Response } from "express";

type Page = {
  path: string;
  type: "Tutorial" | "Blog";
  title: string;
  description: string;
  sections: Array<{ title: string; text: string; tips?: string[] }>;
};

const tutorials: Page[] = [
  {
    path: "/guides/getting-started",
    type: "Tutorial",
    title: "OpenBack Beginner Guide: Your First Match",
    description:
      "Learn how to start an OpenBack match, expand safely, grow your economy, and survive your first wars.",
    sections: [
      {
        title: "Choose a useful starting position",
        text: "Look for room to expand before choosing your starting tile. Open directions are usually easier than a narrow pocket between strong nations. Coastlines can become valuable, but safe land growth matters more during the opening seconds.",
      },
      {
        title: "Expand without emptying your nation",
        text: "Expansion uses troops. Sending everything creates a large border that you cannot defend. Use controlled attacks, allow population to recover, and keep enough strength to discourage neighboring players.",
        tips: [
          "Take nearby neutral land before fighting an equal opponent.",
          "Adjust the troop percentage instead of always sending the same amount.",
          "Pause when troop recovery becomes slow.",
          "Watch every border after meeting another player.",
        ],
      },
      {
        title: "Turn gold into a plan",
        text: "Buildings are investments. Cities support population, ports and factories support income, defense posts strengthen important borders, and military structures unlock specialized attacks. Buy the building that solves your current problem instead of buying every available type.",
      },
      {
        title: "Read the map before attacking",
        text: "A smaller nation is not always easy to defeat. Check its troops, allies, defenses, and whether a third player can attack while you are committed. Good attacks improve your border shape and leave enough strength to survive the next response.",
      },
    ],
  },
  {
    path: "/guides/economy-buildings",
    type: "Tutorial",
    title: "OpenBack Economy and Building Guide",
    description:
      "Understand gold, population, cities, ports, factories, trains, defenses, and efficient building choices in OpenBack.",
    sections: [
      {
        title: "Balance population and gold",
        text: "Population supplies expansion and combat while gold pays for structures and advanced units. A rich nation can still be unable to attack, and a populous nation can lack the tools needed for late-game pressure. Build both resources toward the same strategy.",
      },
      {
        title: "Protect economic infrastructure",
        text: "Place cities and factories where they can survive. Ports open naval trade and construction, while compatible buildings can connect through rail networks. Economic infrastructure needs time to repay its cost, so an exposed front line is rarely the best position.",
      },
      {
        title: "Spend for visible threats",
        text: "Defense posts harden important areas. Missile silos, runways, and military bases unlock specialized attacks. SAM launchers, MANPADs, and tank mines answer different threats. Later copies of many buildings cost more, so leave an emergency reserve.",
        tips: [
          "Secure early growth before expensive military projects.",
          "Spread important structures so one strike cannot remove everything.",
          "Build defenses against threats that are actually developing.",
          "Avoid purchasing every unit type without a complete plan.",
        ],
      },
    ],
  },
  {
    path: "/guides/territorial-war-strategy",
    type: "Tutorial",
    title: "Territorial War Strategy: Expansion, Borders, and Conquest",
    description:
      "Master territorial conquest, efficient borders, army pressure, neutral expansion, and map control in OpenBack's online war strategy gameplay.",
    sections: [
      {
        title: "Treat territory as a strategic resource",
        text: "Every tile changes your border, population potential, attack routes, and exposure. Expand through neutral land that improves your shape instead of creating long narrow fronts. Compact territory is easier to reinforce, while key coastlines and corridors can unlock naval movement or block another country's growth.",
      },
      {
        title: "Win the economy before forcing the war",
        text: "A successful country conquest needs troops for expansion and gold for infrastructure. Grow population, protect income buildings, and preserve a reserve before committing to a long attack. Territory gained without enough strength to hold it can become an opening for every nearby nation.",
        tips: [
          "Expand into valuable neutral space before equal-strength wars.",
          "Shorten exposed borders whenever the map gives you a choice.",
          "Attack when the target is distracted or economically exhausted.",
          "Stop pushing when another rival can exploit your weakened army.",
        ],
      },
      {
        title: "Combine map control with military counters",
        text: "Territorial RTS combat is more than sending population across a border. Defense posts harden fronts, ships control water, aircraft establish distant pressure, tanks damage hostile routes, and specialized defenses answer those threats. Use the world map to make each unit support the same conquest plan.",
      },
    ],
  },
  {
    path: "/guides/nation-building-diplomacy",
    type: "Tutorial",
    title: "Nation Building, Diplomacy, and World Domination Guide",
    description:
      "Build a powerful nation through economy management, alliances, diplomacy, military planning, and long-term world domination strategy in OpenBack.",
    sections: [
      {
        title: "Build an empire that can survive pressure",
        text: "Nation building starts with a stable balance of population, gold, territory, and infrastructure. Cities and economic networks support growth, defenses protect important regions, and military buildings turn that economy into strategic options. Expanding faster is useful only when the new empire remains defensible.",
      },
      {
        title: "Use diplomacy as part of the map",
        text: "Alliances, clans, and short messages can change where armies are needed. A reliable ally can secure one border while both nations pressure a larger threat. Diplomacy is strongest when it creates a clear shared benefit, not when it depends on promises that ignore the current balance of power.",
      },
      {
        title: "Choose a path toward world domination",
        text: "Late-game geopolitical strategy requires priorities. Decide which rival controls the most dangerous economy, which border unlocks useful territory, and which military system can break the current defense. Conquest becomes sustainable when each victory improves your next position instead of exhausting the nation.",
        tips: [
          "Protect the economic center of your country.",
          "Keep allies informed about specific threats and timings.",
          "Avoid wars that benefit an uninvolved third empire.",
          "Convert temporary map advantages into permanent infrastructure.",
        ],
      },
    ],
  },
  {
    path: "/guides/multiplayer-friends",
    type: "Tutorial",
    title: "How to Play OpenBack Multiplayer with Friends",
    description:
      "Create a private OpenBack lobby, share its game URL or ID, and help friends join the same multiplayer match.",
    sections: [
      {
        title: "Host a private lobby",
        text: "Choose Host Multiplayer, configure the match, and create the lobby. Keep it open while friends join. The host controls the settings and starts when everyone is ready.",
      },
      {
        title: "Share the complete lobby URL",
        text: "Copy the full game link and send it to your friends. The game-specific part at the end tells OpenBack which lobby to connect to. A homepage-only link cannot identify the private game.",
      },
      {
        title: "Join with the game ID",
        text: "Players can also choose Join Multiplayer and paste the lobby ID. If joining fails, confirm that the lobby is still active, copy the ID without missing characters, and ensure the browser is not blocking WebSocket connections.",
      },
    ],
  },
  {
    path: "/guides/territorial-strategy-glossary",
    type: "Tutorial",
    title: "OpenBack Territorial Strategy Glossary: 120 RTS Terms",
    description:
      "Learn 120 useful terms for territorial strategy, online war games, nation building, military planning, diplomacy, world conquest, and multiplayer RTS gameplay.",
    sections: [
      {
        title: "Territory and map control",
        text: "These terms describe how countries gain, shape, defend, and use land on a conquest map.",
        tips: [
          "Territorial strategy — planning expansion, defense, and conquest around land ownership.",
          "Territory control — maintaining useful land while denying it to rival nations.",
          "Map conquest — taking regions until your country controls the strategic map.",
          "Border expansion — growing outward from the edge of owned territory.",
          "Neutral land — unclaimed territory available for early expansion.",
          "Frontline — the active border where hostile countries meet and fight.",
          "Chokepoint — a narrow route whose control limits enemy movement.",
          "Encirclement — surrounding hostile territory to weaken its position.",
          "Annexation — absorbing conquered land into a nation.",
          "Beachhead — a distant foothold established for further expansion.",
          "Border efficiency — gaining useful area without creating excessive exposure.",
          "Map pressure — forcing rivals to respond through position, growth, or threat.",
        ],
      },
      {
        title: "Nation building and economy",
        text: "These concepts explain how a country turns resources and infrastructure into lasting power.",
        tips: [
          "Nation building — developing territory, population, economy, and defenses together.",
          "Country strategy — directing one nation's growth and survival across the world map.",
          "Empire building — expanding a country into a large, connected, sustainable power.",
          "Economy management — deciding when to save, build, trade, or fund warfare.",
          "Gold income — the money generated for buildings, units, and strategic actions.",
          "Population growth — troop recovery that supports expansion and combat.",
          "Infrastructure — cities, ports, factories, bases, railways, and defensive buildings.",
          "Resource management — balancing population, gold, territory, time, and risk.",
          "Trade network — connected economic structures that generate continuing value.",
          "Logistics — moving fuel, resources, units, and support between useful locations.",
          "Production capacity — the ability of an economy to sustain new construction and war.",
          "Economic reserve — saved gold kept available for emergencies or opportunities.",
        ],
      },
      {
        title: "War and military planning",
        text: "These phrases cover the broad decisions behind armies, weapons, attacks, and defense.",
        tips: [
          "Online war game — a connected game where players fight for strategic control.",
          "Military strategy — coordinating forces and infrastructure toward a war objective.",
          "Army management — controlling troop strength, reserves, attacks, and recovery.",
          "Troop deployment — committing population or units to a selected destination.",
          "Combined arms — using land, air, naval, missile, and defensive systems together.",
          "Ground warfare — territorial combat involving borders, tanks, mines, and bases.",
          "Air warfare — aircraft operations launched from runways and opposed by air defense.",
          "Naval warfare — controlling water with ports, transports, trade ships, and warships.",
          "Missile warfare — attacking and defending with silos, missiles, and interception.",
          "Nuclear strategy — planning high-cost area attacks and protection from retaliation.",
          "Defensive strategy — preserving territory and resources while reducing enemy value.",
          "Offensive strategy — creating advantages through expansion, attacks, and pressure.",
        ],
      },
      {
        title: "Units and military structures",
        text: "These are important vehicles, counters, and buildings used in OpenBack warfare.",
        tips: [
          "Tank — a slow ground vehicle that damages hostile territory along its route.",
          "Aircraft — a runway-launched unit that carries troops toward a distant beachhead.",
          "Runway — infrastructure used to prepare aircraft and define their launch range.",
          "Military base — infrastructure used to deploy tanks and support military logistics.",
          "MANPAD — an air-defense unit that can intercept an incoming aircraft.",
          "Tank mine — a defensive counter that destroys a tank entering its protected radius.",
          "Warship — an armed naval unit that attacks hostile ships and transports.",
          "Transport ship — a vessel that carries troops across water toward another coast.",
          "SAM launcher — a surface-to-air defense that intercepts incoming strategic missiles.",
          "Missile silo — a structure required to launch nuclear and strategic weapons.",
          "Defense post — a fortification that makes nearby territory harder to conquer.",
          "Fuel train — a military railway vehicle moving value between a base and runway.",
        ],
      },
      {
        title: "Diplomacy and multiplayer relations",
        text: "These terms describe cooperation, negotiation, teams, and political map strategy.",
        tips: [
          "Diplomacy game — strategy where relationships can matter as much as armies.",
          "Alliance — an agreement between players to cooperate or avoid conflict.",
          "Clan — a persistent player identity used for organized multiplayer communities.",
          "Team strategy — coordinating roles, expansion, resources, and targets with allies.",
          "Coalition warfare — several nations combining pressure against a shared opponent.",
          "Ceasefire — a pause in fighting that changes where both sides can focus.",
          "Shared control — multiple players managing the same nation with divided resources.",
          "Multiplayer coordination — communicating locations, threats, timing, and actions.",
          "Alliance management — maintaining useful cooperation as power and borders change.",
          "Geopolitical strategy — using geography, power balance, and relationships together.",
          "Common enemy — a threatening rival that gives other nations a reason to cooperate.",
          "Diplomatic leverage — influence gained through strength, position, resources, or trust.",
        ],
      },
      {
        title: "Game modes and online play",
        text: "These phrases identify the different ways people discover and play territorial games.",
        tips: [
          "Real-time strategy — decision-making and combat that continue without fixed turns.",
          "Browser RTS — a real-time strategy game played directly through a web browser.",
          "Online multiplayer strategy — competitive or cooperative strategy between connected players.",
          "Ranked 1v1 — a rated duel between two matched players.",
          "Private lobby — a custom multiplayer room shared with selected friends.",
          "Solo strategy — a single-player match against computer-controlled nations.",
          "Bot match — a game containing artificial-intelligence countries or opponents.",
          "World map game — strategy played across geographic or planetary territory.",
          ".io strategy game — fast browser gameplay built around accessible online competition.",
          "Evolving strategy game — an actively developed game that continues adding features.",
          "Competitive matchmaking — automatically pairing available players into games.",
          "Shareable game link — a URL that connects another player directly to a lobby.",
        ],
      },
      {
        title: "Tactics and battlefield decisions",
        text: "These concepts describe shorter decisions that create or protect strategic advantages.",
        tips: [
          "Flanking — attacking through a less-protected direction instead of the strongest border.",
          "Attrition — gradually reducing enemy strength through sustained fighting.",
          "War exhaustion — economic and population penalties caused by a prolonged conflict.",
          "Defensive line — connected positions intended to slow or stop expansion.",
          "Counterattack — responding to an enemy attack with pressure of your own.",
          "Troop reserve — population deliberately kept away from current attacks.",
          "Economic warfare — targeting the systems that fund another nation's military.",
          "Strategic objective — a location or goal whose control provides a valuable benefit.",
          "Fog of war — limited information that hides distant territory or enemy activity.",
          "Map awareness — continuously reading borders, units, warnings, and changing threats.",
          "Timing attack — striking when the opponent is weak, distracted, or still investing.",
          "Threat assessment — comparing the danger posed by different rivals and weapons.",
        ],
      },
      {
        title: "Buildings, transport, and logistics",
        text: "These terms explain the infrastructure that keeps an economy and military operating.",
        tips: [
          "City building — constructing population-focused infrastructure inside owned land.",
          "Factory — an economic building that supports trade and railway connections.",
          "Port — coastal infrastructure for trade ships, warships, and naval operations.",
          "Railroad — a route connecting compatible buildings for train movement.",
          "Train logistics — visible transport of economic or military value by rail.",
          "Fuel convoy — a moving military shipment between supporting structures.",
          "Fortification — a structure or position designed to resist conquest.",
          "Supply line — the connection supporting forces, buildings, or distant operations.",
          "Infrastructure defense — protecting valuable buildings from capture and destruction.",
          "Military network — connected bases, runways, railways, defenses, and vehicles.",
          "Trade route — a path that generates income by connecting economic activity.",
          "Transport capacity — the ability to move troops or resources across distance.",
        ],
      },
      {
        title: "Victory, conquest, and empire strategy",
        text: "These phrases describe long-term goals and the final stages of a strategy match.",
        tips: [
          "World domination — becoming the decisive power across the entire playable map.",
          "Global conquest — defeating or overtaking rival powers across many regions.",
          "Nation conquest — capturing territory until an opposing country collapses.",
          "Country takeover — gaining control of land previously held by another nation.",
          "Strategic victory — winning through objectives, position, economy, or conquest.",
          "Territorial dominance — controlling enough useful land to dictate the match.",
          "Expansion game — gameplay centered on growth from a small starting territory.",
          "Conquest simulator — a map game that models attacks, borders, nations, and control.",
          "Empire strategy — managing a large power with many borders and priorities.",
          "Grand strategy — long-term planning across economy, diplomacy, warfare, and geography.",
          "Victory points — score awarded for controlling designated strategic objectives.",
          "Endgame strategy — decisions made when only the strongest powers remain.",
        ],
      },
      {
        title: "World events and match modifiers",
        text: "These terms cover optional systems that change normal territorial strategy rules.",
        tips: [
          "Natural disasters — optional events that disrupt countries and infrastructure.",
          "Earthquake event — ground disruption affecting a selected region of the map.",
          "Tsunami event — a coastal disaster that threatens shoreline territory.",
          "Tornado event — a moving storm that creates a changing danger path.",
          "Radiation storm — hazardous fallout affecting expansion and control.",
          "Rebellion event — internal unrest that challenges a nation's territory.",
          "Economic boom — a temporary event improving resource generation.",
          "Resource discovery — a world event creating new strategic value in a location.",
          "Strategic modifier — an optional rule that changes the match's priorities.",
          "Dynamic world event — an unpredictable occurrence that forces players to adapt.",
          "Fog modifier — a match setting that limits information beyond controlled vision.",
          "Neutral objective — an unowned location that rewards the nation controlling it.",
        ],
      },
    ],
  },
  {
    path: "/guides/ranked-1v1",
    type: "Tutorial",
    title: "OpenBack Ranked 1v1 Matchmaking Guide",
    description:
      "Learn how OpenBack ranked matchmaking pairs players and how to prepare for competitive 1v1 games.",
    sections: [
      {
        title: "Stay in the queue",
        text: "Press Ranked and remain on the matchmaking screen until a game is assigned. An outside click does not close the queue; use the explicit back or cancel control only when you really want to leave.",
      },
      {
        title: "How opponents are selected",
        text: "OpenBack favors the closest available rating but does not enforce a gap that leaves two available players waiting forever. The queue can form several matches at once. With an odd count, one player remains for the next arrival.",
      },
      {
        title: "Prepare for a duel",
        text: "In 1v1, every expansion affects the same opponent. Track their growth, protect your economy, and keep population in reserve. A short land lead is not worth much if the attack leaves your nation unable to recover.",
      },
    ],
  },
  {
    path: "/guides/aircraft-runways-manpads",
    type: "Tutorial",
    title: "OpenBack Aircraft, Runway, and MANPAD Guide",
    description:
      "Build runways, load aircraft, create beachheads, extend launch range, and defend flights with MANPADs.",
    sections: [
      {
        title: "Build and stack runways",
        text: "Runways cost 250,000 gold first, 500,000 second, and 750,000 afterward. Another runway placed in the valid snap zone stacks with the owned runway and expands its launch reach. Hover a completed runway to inspect its radius.",
      },
      {
        title: "Load and launch aircraft",
        text: "Place Aircraft on a completed owned runway. Aircraft cost 1,000,000 gold first, 1,500,000 second, and 2,000,000 afterward. Once ready, select Aircraft again and choose a valid destination inside the runway range. The committed troops travel aboard it.",
      },
      {
        title: "Create a beachhead",
        text: "The flight follows a visible dashed route. At its destination the aircraft crashes, damages a smaller area than a strategic nuclear weapon, and attempts to establish territory for the carried troops. Opponents can see the route and landing warning.",
      },
      {
        title: "Intercept with MANPADs",
        text: "A completed enemy MANPAD in range can destroy the aircraft and its troops. The successful interception consumes the defending level involved. MANPAD prices are 300,000, 600,000, then 1,000,000 gold.",
      },
    ],
  },
  {
    path: "/guides/tanks-bases-mines",
    type: "Tutorial",
    title: "OpenBack Tanks, Military Bases, and Tank Mines",
    description:
      "Deploy tanks from military bases, extend their range, damage hostile land, and stop them with tank mines.",
    sections: [
      {
        title: "Build and stack military bases",
        text: "Military bases cost 200,000 gold first, 400,000 second, and 750,000 afterward. A completed base launches tanks, while valid stacked bases extend their driving range. Hover a base to inspect that radius.",
      },
      {
        title: "Deploy a tank",
        text: "Tanks cost 500,000 gold first, 750,000 second, and 1,000,000 afterward. Place one on a completed base, then select a reachable destination. The vehicle moves slowly and damages hostile ground along its route before its final self-destruct strike.",
      },
      {
        title: "Stop tanks with mines",
        text: "Tank mines cost 250,000 gold first, 350,000 second, and 500,000 afterward. Their first level covers the same radius as a defense post, and every stacked level adds 25% more range. When an enemy tank enters that radius, one mine level is consumed and the tank begins destruction before reaching the destination.",
        tips: [
          "Cover likely approaches instead of scattering mines randomly.",
          "Stacked mines can answer more than one vehicle.",
          "Choose paths that cross valuable hostile territory.",
          "Remember that slow movement gives defenders time to react.",
        ],
      },
    ],
  },
  {
    path: "/guides/diplomacy-clans",
    type: "Tutorial",
    title: "OpenBack Alliances, Diplomacy, and Clans Guide",
    description:
      "Use alliances, clan identity, communication, and border planning effectively in OpenBack multiplayer.",
    sections: [
      {
        title: "Build alliances around shared interests",
        text: "A useful alliance gives both players security, time, or leverage against a common threat. Use the safer border to grow elsewhere, but keep watching it as the map changes.",
      },
      {
        title: "Coordinate clan play",
        text: "A clan provides shared identity, not automatic strategy. Agree on starting areas, economic roles, targets, and which player will invest in specialized infrastructure before a team match begins.",
      },
      {
        title: "Send actionable messages",
        text: "Useful communication names a player, location, timing, or action. A warning about an aircraft approaching a specific area is more useful than a general danger message. Keep messages short enough to read while controlling the map.",
      },
    ],
  },
  {
    path: "/guides/nuclear-weapons-defense",
    type: "Tutorial",
    title: "OpenBack Nuclear Weapons and Defense Guide",
    description:
      "Plan silo attacks, understand atom bombs, hydrogen bombs and MIRVs, and reduce nuclear damage in OpenBack.",
    sections: [
      {
        title: "Build a silo for a reason",
        text: "A missile silo is expensive infrastructure. Protect it and make sure you can afford the intended weapon. A silo without an economic plan can delay every other part of your nation.",
      },
      {
        title: "Choose the correct weapon",
        text: "Atom bombs provide focused destruction, hydrogen bombs cover a much larger area at a higher cost, and MIRVs spread warheads across a nation. Use the smallest weapon that achieves the goal.",
      },
      {
        title: "Reduce enemy strike value",
        text: "Spread essential structures so one blast cannot remove everything. SAM launchers defend an area from incoming missiles, but their timing and interception behavior can be tested by a determined attacker.",
        tips: [
          "Watch launch trajectories as well as warnings.",
          "Separate buildings that perform the same essential role.",
          "Keep gold for rebuilding and defense.",
          "Avoid strikes that leave your own nation defenseless.",
        ],
      },
    ],
  },
];

const blogs: Page[] = [
  {
    path: "/blog/openback-territorial-rts",
    type: "Blog",
    title: "OpenBack Territorial RTS Foundations",
    description:
      "How OpenBack combines deterministic territorial strategy, browser warfare, multiplayer, and combined-arms gameplay.",
    sections: [
      {
        title: "A deterministic territorial strategy foundation",
        text: "OpenBack uses a deterministic simulation and renderer with organic country borders, real map expansion, nations, bots, economy, diplomacy, structures, ships, missiles, and synchronized multiplayer turns. The result is a real territorial RTS system rather than a visual imitation of a map game.",
      },
      {
        title: "An expanded OpenBack identity",
        text: "OpenBack's gameplay direction includes aircraft and runways, tanks and military bases, MANPADs, tank mines, military fuel railways, ranked matchmaking, clans, profiles, shareable lobbies, and optional match modifiers. These systems create broader air, ground, logistics, and competitive strategy.",
      },
      {
        title: "Online strategy in the browser",
        text: "Solo battles, private multiplayer, ranked games, and world-map warfare share the same browser interface. Players can practice nation building against computer countries and then apply the same economy, diplomacy, and military strategy against people online.",
      },
    ],
  },
  {
    path: "/blog/world-map-conquest-games",
    type: "Blog",
    title: "Why World Map Conquest Games Create Deep Strategy",
    description:
      "Explore how territory control, nation building, diplomacy, armies, economies, and real-time multiplayer create deep world map conquest gameplay.",
    sections: [
      {
        title: "The map records every strategic decision",
        text: "In a world map conquest game, expansion is visible and permanent until another country takes it. Borders reveal pressure, coastlines create naval opportunities, narrow corridors become defensive positions, and neutral land becomes a race between nearby nations.",
      },
      {
        title: "Real-time action meets grand-strategy planning",
        text: "OpenBack combines fast territorial expansion with longer decisions about economy management, diplomacy, infrastructure, alliances, and military technology. Players react in real time while building the kind of long-term plan normally associated with geopolitical and grand-strategy games.",
      },
      {
        title: "Multiplayer makes every empire unpredictable",
        text: "Bots can teach the rules, but online players create changing coalitions, surprise attacks, shared threats, and competing paths toward world domination. The strongest army does not automatically win when diplomacy, timing, geography, and economic exhaustion reshape the war.",
      },
    ],
  },
  {
    path: "/blog/air-and-ground-warfare",
    type: "Blog",
    title: "Designing Air and Ground Warfare for OpenBack",
    description:
      "Why OpenBack aircraft and tanks use visible travel, dedicated bases, and specialized counters.",
    sections: [
      {
        title: "Infrastructure creates commitment",
        text: "Aircraft need runways and tanks need military bases, so each strategy is visible before a vehicle moves. Several stacked runways warn opponents to prepare MANPAD coverage, while a base network signals possible tank pressure.",
      },
      {
        title: "Travel creates counterplay",
        text: "Aircraft display a dashed route and tanks move across the ground. These journeys give the attacker useful feedback and give the defender time to respond instead of receiving an unexplained instant hit.",
      },
      {
        title: "Counters are consumed",
        text: "A MANPAD can intercept an aircraft and a tank mine can stop a tank, but a successful defense uses the relevant level. One inexpensive placement therefore cannot permanently delete every future vehicle.",
      },
    ],
  },
  {
    path: "/blog/ranked-matchmaking-design",
    type: "Blog",
    title: "How OpenBack Ranked Matchmaking Works",
    description:
      "Inside OpenBack's closest-rating queue, multiple simultaneous matches, and reliable game assignment.",
    sections: [
      {
        title: "Fairness without endless waiting",
        text: "The matchmaker prefers the closest available rating, but rating is not a hard wall. If two players are the only opponents available, they can still play instead of waiting indefinitely.",
      },
      {
        title: "The queue supports many players",
        text: "Four queued players can become two matches and six can become three. If the count is odd, the unmatched player stays ready for the next arrival.",
      },
      {
        title: "Assignment reaches both clients",
        text: "The shared game ID is delivered before queue connections close. Both browsers can then join the assigned game instead of interpreting a normal matchmaking disconnect as a failure.",
      },
    ],
  },
  {
    path: "/blog/shareable-lobby-links",
    type: "Blog",
    title: "Why OpenBack Lobbies Have Shareable URLs",
    description:
      "Why every OpenBack private lobby uses a game-specific URL and still supports joining by ID.",
    sections: [
      {
        title: "The link is the invitation",
        text: "A complete lobby link loads OpenBack and identifies the matching game. Friends can move from a message to the lobby without first learning which menu contains the manual join field.",
      },
      {
        title: "Manual IDs remain valuable",
        text: "Chat applications can truncate links. Join Multiplayer provides a second route: paste the game ID and reach the same active lobby without relying on the original URL formatting.",
      },
      {
        title: "One service hosts many games",
        text: "The public website is shared while each active game has its own identifier. Players do not need to deploy a separate website or server for every friends-only match.",
      },
    ],
  },
  {
    path: "/blog/military-fuel-railways",
    type: "Blog",
    title: "Military Fuel Railways in OpenBack",
    description:
      "How military bases, nearby runways, camouflage trains, and fuel income form a logistics system.",
    sections: [
      {
        title: "A dedicated military network",
        text: "A completed base and runway within range can create military stations and rails. Military logistics remain separate from ordinary civilian factory routes, and structure levels influence the useful connection distance.",
      },
      {
        title: "Visible convoys",
        text: "Camouflage-styled trains carry fuel between the linked structures. Animated smoke and a physical rail path show the relationship on the map instead of hiding it inside a passive number change.",
      },
      {
        title: "Placement becomes economic strategy",
        text: "A runway near a base can support launch reach and convoy income, but concentrated infrastructure is easier to identify and target. The network rewards useful placement without removing risk.",
      },
    ],
  },
  {
    path: "/blog/browser-multiplayer-strategy",
    type: "Blog",
    title: "Building OpenBack as a Browser Multiplayer Game",
    description:
      "Why OpenBack runs in a browser and combines solo, private multiplayer, shareable links, and ranked play.",
    sections: [
      {
        title: "A link is enough to begin",
        text: "Browser delivery lets a player open the game without installing a launcher. It also keeps friends on the deployed version, reducing version mismatches when they join a private lobby.",
      },
      {
        title: "Several modes share one simulation",
        text: "Solo games, private lobbies, public multiplayer, and ranked 1v1 use the same map interface and core rules. Players can practice against computer nations before using the same knowledge online.",
      },
      {
        title: "The server coordinates shared matches",
        text: "Game IDs identify lobbies, WebSocket connections carry live communication, and the deployed service coordinates ranked assignments. The browser remains easy to open while multiplayer state stays shared.",
      },
    ],
  },
];

const pages = [...tutorials, ...blogs];

export const OPENBACK_CONTENT_PATHS = [
  "/guides",
  "/blog",
  ...pages.map((page) => page.path),
];

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cards(items: Page[]): string {
  return items
    .map(
      (page) =>
        `<article class="card"><small>${page.type}</small><h2><a href="${page.path}">${esc(page.title)}</a></h2><p>${esc(page.description)}</p><a class="more" href="${page.path}">Read more &rarr;</a></article>`,
    )
    .join("");
}

function layout(
  origin: string,
  path: string,
  title: string,
  description: string,
  body: string,
  schemaType: string,
): string {
  const canonical = `${origin}${path}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | OpenBack</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" sizes="192x192" href="/favicon.png"><meta property="og:site_name" content="OpenBack"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": schemaType, name: title, headline: title, description, url: canonical, author: { "@type": "Organization", name: "OpenBack" }, isPartOf: { "@type": "WebSite", name: "OpenBack", url: `${origin}/` } }).replace(/</g, "\\u003c")}</script><style>
  :root{color-scheme:dark;--text:#f4f8ff;--muted:#b3c0d3;--line:#29405f;--panel:#10213a;--blue:#6dccff;--green:#18c964}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:var(--text);background:radial-gradient(circle at 15% 0,#183b61 0,#081523 46%,#050b13 100%);line-height:1.65}a{color:var(--blue)}header{position:sticky;top:0;background:#07111deb;border-bottom:1px solid var(--line);z-index:3}nav{max-width:1100px;margin:auto;padding:14px 20px;display:flex;align-items:center;gap:22px}.brand{margin-right:auto;color:white;font-size:1.35rem;font-weight:900;text-decoration:none}nav a:not(.brand){color:var(--muted);font-weight:700;text-decoration:none}.play{background:var(--green);color:#03150a!important;padding:8px 14px;border-radius:8px}main{width:min(1100px,calc(100% - 32px));margin:auto;padding:58px 0 80px}.hero{max-width:820px;margin-bottom:38px}small{color:#72d2ff;font-weight:900;letter-spacing:.13em;text-transform:uppercase}h1{font-size:clamp(2.3rem,6vw,4.5rem);line-height:1.05;letter-spacing:-.04em;margin:.2em 0}.lead{font-size:1.15rem;color:#ced9e9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}.card{padding:24px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#132a47,#0b192b)}.card h2{font-size:1.3rem;line-height:1.22}.card h2 a{color:white;text-decoration:none}.card p,article p,article li{color:var(--muted)}.more,.back{font-weight:800;text-decoration:none}article.content{max-width:800px}article.content section{padding:24px 0;border-top:1px solid var(--line)}article.content h2{font-size:1.7rem;line-height:1.2}.related{margin-top:55px;padding-top:25px;border-top:1px solid var(--line)}footer{text-align:center;border-top:1px solid var(--line);padding:28px;color:var(--muted)}footer a{margin:0 8px}@media(max-width:600px){nav{gap:12px}nav a:not(.brand):not(.play){display:none}main{padding-top:38px}}
  </style></head><body><header><nav><a class="brand" href="/">OpenBack</a><a href="/guides">Tutorials</a><a href="/blog">Blog</a><a class="play" href="/">Play now</a></nav></header><main>${body}</main><footer><strong>OpenBack</strong> &middot; Online browser territorial strategy game<br><a href="/">Play</a><a href="/guides">Tutorials</a><a href="/blog">Blog</a><a href="/privacy-policy.html">Privacy</a></footer></body></html>`;
}

function hub(origin: string, type: "guides" | "blog"): string {
  const isGuide = type === "guides";
  const items = isGuide ? tutorials : blogs;
  const path = isGuide ? "/guides" : "/blog";
  const title = isGuide
    ? "OpenBack Tutorials and Strategy Guides"
    : "OpenBack Development Blog";
  const description = isGuide
    ? "Learn OpenBack with practical tutorials for beginners, multiplayer, ranked, economy, aircraft, tanks, diplomacy, and nuclear defense."
    : "Read OpenBack articles about multiplayer, matchmaking, aircraft, tanks, military railways, and browser game design.";
  return layout(
    origin,
    path,
    title,
    description,
    `<div class="hero"><small>${isGuide ? "Learn the game" : "Behind the game"}</small><h1>${title}</h1><p class="lead">${description}</p></div><div class="grid">${cards(items)}</div>`,
    "CollectionPage",
  );
}

function article(origin: string, page: Page): string {
  const hubPath = page.type === "Tutorial" ? "/guides" : "/blog";
  const sections = page.sections
    .map(
      (section) =>
        `<section><h2>${esc(section.title)}</h2><p>${esc(section.text)}</p>${section.tips ? `<ul>${section.tips.map((tip) => `<li>${esc(tip)}</li>`).join("")}</ul>` : ""}</section>`,
    )
    .join("");
  const related = (page.type === "Tutorial" ? tutorials : blogs)
    .filter((item) => item.path !== page.path)
    .slice(0, 3);
  const body = `<a class="back" href="${hubPath}">&larr; All ${page.type === "Tutorial" ? "tutorials" : "posts"}</a><article class="content"><div class="hero"><small>${page.type}</small><h1>${esc(page.title)}</h1><p class="lead">${esc(page.description)}</p></div>${sections}</article><aside class="related"><h2>Keep reading</h2><div class="grid">${cards(related)}</div></aside>`;
  return layout(
    origin,
    page.path,
    page.title,
    page.description,
    body,
    page.type === "Tutorial" ? "TechArticle" : "BlogPosting",
  );
}

export function handleOpenBackContent(req: Request, res: Response): void {
  // Render terminates TLS before forwarding the request to Express, so
  // req.protocol can be "http" even when the public page is HTTPS. Prefer the
  // proxy's original protocol to keep canonical and Open Graph URLs aligned
  // with the public URLs in sitemap.xml.
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (
    Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  )
    ?.split(",")[0]
    ?.trim();
  const origin =
    `${protocol ?? req.protocol ?? "https"}://${req.get("host")}`.replace(
      /\/+$/,
      "",
    );
  if (req.path === "/guides")
    return void res.type("html").send(hub(origin, "guides"));
  if (req.path === "/blog")
    return void res.type("html").send(hub(origin, "blog"));
  const page = pages.find((candidate) => candidate.path === req.path);
  if (!page) return void res.status(404).type("text").send("Page not found");
  res.type("html").send(article(origin, page));
}
