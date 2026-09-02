import { UnitType } from "../../core/game/Game";

/**
 * What the tutorial can see of a match while it is being played.
 *
 * Deliberately a plain snapshot rather than the GameView itself, so the script
 * is a piece of data that can be reasoned about and tested without a running
 * game, a renderer, or a DOM.
 */
export interface TutorialProgress {
  /** Still choosing a starting position. */
  spawning: boolean;
  /** Tiles the player holds. */
  tiles: number;
  /** Tiles the player held when the step began. */
  tilesAtStepStart: number;
  /** Gold in hand. */
  gold: bigint;
  /** Attacks the player currently has running against someone else. */
  outgoingAttacks: number;
  /** Alliances the player has agreed. */
  alliances: number;
  /**
   * Unit types the player has owned at any point since the match began.
   *
   * A latch rather than a live count, because the interesting ones do not
   * last: a transport ship unloads, a bomb detonates. Asking "do you have a
   * nuke right now" would only ever be true for the instant between launch and
   * impact, and a player would be stuck on that step forever.
   */
  everOwned: ReadonlySet<UnitType>;
}

/** Which on-screen control a step is asking the player to use. */
export interface TutorialTarget {
  /** CSS selector, resolved against the document when the step opens. */
  selector: string;
  /** Where the pointer sits relative to the control. */
  place: "above" | "below";
}

export interface TutorialStep {
  id: string;
  /** Short imperative heading: what to do. */
  title: string;
  /** Why it matters, in a sentence or two. */
  body: string;
  /** The control to point at, when the step is about pressing something. */
  target?: TutorialTarget;
  /** True once the player has done the thing. */
  done: (progress: TutorialProgress) => boolean;
}

/**
 * The build bar button for a unit.
 *
 * Addressed by unit rather than by the number printed on it: the numbers are
 * positions, and they shift whenever a match disables a unit, which would have
 * the tutorial pointing at whatever moved into that slot.
 */
const buildButton = (unit: UnitType): TutorialTarget => ({
  selector: `[data-build-unit="${unit}"]`,
  place: "above",
});

const owns = (type: UnitType) => (p: TutorialProgress) => p.everOwned.has(type);

/**
 * The tutorial match, start to finish.
 *
 * Ordered so each step is possible when it is asked for: land before gold,
 * gold before buildings, a port before anything that sails, a silo before a
 * bomb. Every step is judged on the real match, so nothing advances because a
 * timer ran out -- the player has to actually do it.
 */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: "spawn",
    title: "Choose where to begin",
    body: "The world is yours to pick from. Tap anywhere on land to place your nation. Somewhere with a coast and a quiet neighbour is kinder than the middle of a continent.",
    done: (p) => !p.spawning,
  },
  {
    id: "expand",
    title: "Take the land around you",
    body: "Tap empty ground next to your border to march troops into it. Every tile you hold earns you troops and gold, so early room is worth more than early fighting.",
    done: (p) => p.tiles >= p.tilesAtStepStart + 60,
  },
  {
    id: "troop-ratio",
    title: "Decide how much to send",
    body: "The slider sets the share of your army each attack spends. High takes ground quickly and leaves you thin; low is slow and safe. Move it, then keep expanding.",
    target: { selector: '[data-tutorial="troop-ratio"]', place: "above" },
    done: (p) => p.tiles >= p.tilesAtStepStart + 60,
  },
  {
    id: "city",
    title: "Build a city",
    body: "Cities raise the population your land can hold, which raises the troops it produces. They are the first thing worth spending gold on.",
    target: buildButton(UnitType.City),
    done: owns(UnitType.City),
  },
  {
    id: "factory",
    title: "Build a factory",
    body: "Factories turn your territory into gold, and gold is what every other building costs. Two or three early ones pay for the rest of the match.",
    target: buildButton(UnitType.Factory),
    done: owns(UnitType.Factory),
  },
  {
    id: "port",
    title: "Build a port",
    body: "A port puts you on the water. It sends trade ships to other ports for gold, and it is what lets you launch an invasion across the sea.",
    target: buildButton(UnitType.Port),
    done: owns(UnitType.Port),
  },
  {
    id: "attack",
    title: "Attack a neighbour",
    body: "Tap land that belongs to somebody else to send troops against it. You take ground while your attack lasts, and lose troops doing it.",
    done: (p) => p.outgoingAttacks > 0,
  },
  {
    id: "defense-post",
    title: "Fortify your border",
    body: "A defence post makes the ground around it far more expensive to attack. One on the border facing your strongest neighbour is worth several elsewhere.",
    target: buildButton(UnitType.DefensePost),
    done: owns(UnitType.DefensePost),
  },
  {
    id: "boat",
    title: "Send troops by sea",
    body: "With a port built, tap a coast across the water to land an invasion there. It is how you reach an island, or the back of an enemy who is watching their border.",
    done: owns(UnitType.TransportShip),
  },
  {
    id: "warship",
    title: "Build a warship",
    body: "Warships sink transports and trade ships, and guard your own. A coast without one is an open door.",
    target: buildButton(UnitType.Warship),
    done: owns(UnitType.Warship),
  },
  {
    id: "silo",
    title: "Build a missile silo",
    body: "Silos are where bombs are launched from, and they take a while to build. Put one up before you need it, somewhere away from your border.",
    target: buildButton(UnitType.MissileSilo),
    done: owns(UnitType.MissileSilo),
  },
  {
    id: "nuke",
    title: "Launch an atom bomb",
    body: "Choose the bomb, then tap where it should land. It clears the ground it hits and everything built on it. Expect the rest of the world to remember you did it.",
    target: buildButton(UnitType.AtomBomb),
    done: owns(UnitType.AtomBomb),
  },
  {
    id: "grow",
    title: "Take the fight outward",
    body: "You have every tool the game gives you. Hold more ground than anyone else and the match is yours -- keep expanding, keep building, and defend what pays for it.",
    done: (p) => p.tiles >= p.tilesAtStepStart + 400,
  },
];

/** Total steps, for the "3 of 13" readout. */
export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;
