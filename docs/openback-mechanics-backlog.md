# OpenBack mechanics and unit backlog

This is a design backlog, not a promise that every idea should ship. New units
should add a readable decision and a counter, reuse deterministic simulation
systems, and avoid permanent per-tick whole-map scans.

## Best next additions

1. **Engineer vehicle** — spawns at a Military Base, clears Tank Mines and
   fallout, repairs damaged railways, and is vulnerable to tanks and artillery.
   This completes the ground-war counter loop without simply adding more damage.
2. **Radar station** — reveals aircraft warnings and trajectories earlier inside
   its radius, but does not shoot. MANPADs remain the weapon; Radar supplies
   information and becomes a valuable target.
3. **Anti-tank emplacement** — a visible defensive structure with a narrow land
   radius and reload time. Tanks can route around it, artillery can destroy it,
   and Engineers can dismantle captured positions.
4. **Recon drone** — launched from a Military Base, briefly reveals structures,
   defenses, and vehicle readiness around a target. It carries no troops and can
   be intercepted by MANPADs.
5. **Artillery battery** — fires slow, visible shells at nearby enemy structures
   or borders. It needs a spotter or Radar, has a clear reload animation, and is
   vulnerable while firing.
6. **Aircraft carrier** — a costly naval runway with a smaller aircraft capacity
   and range than stacked land Runways. Warships and submarines counter it.

## Air units and mechanics

- **Fighter** — intercepts aircraft inside a patrol radius; no land capture.
- **Bomber** — damages structures and fallout tiles but deploys no troops.
- **Cargo aircraft** — moves gold or reinforcements between owned bases.
- **Helicopter** — short-range troop deployment, slower and more vulnerable than
  aircraft, but does not require a full Runway.
- **Electronic-warfare aircraft** — temporarily reduces Radar and MANPAD range.
- **Air patrol order** — assigns a fighter to defend a circle instead of choosing
  a single destination.
- **Runway capacity** — each runway level provides a limited number of parked
  aircraft slots, making stacking meaningful beyond range.
- **Fuel state** — optional advanced rule where aircraft can divert to a friendly
  runway instead of always crashing after a mission.

## Ground units and mechanics

- **Mobile artillery** — lower range than a battery but can relocate slowly.
- **Armored personnel carrier** — carries troops safely until destroyed, with
  less terrain damage than a Tank.
- **Tank destroyer** — strong against Tanks, weak against normal territory.
- **Mine-clearing vehicle** — cheaper specialized alternative to the Engineer.
- **Command vehicle** — boosts nearby vehicle range or reload speed; losing it
  removes the bonus.
- **Field hospital** — slowly returns a fraction of recent defensive troop losses.
- **Supply depot** — increases nearby Base capacity and creates supply trains.
- **Pontoon bridge** — temporary crossing over narrow water, destroyable by fire.
- **Entrenchment order** — a stationary Tank gains defense but loses movement.
- **Vehicle veterancy** — surviving missions earn small capped bonuses and a
  visible rank, never enough to remove counter-play.

## Naval units and mechanics

- **Submarine** — hidden until attacking or entering Sonar range; targets trade
  ships, carriers, and warships.
- **Destroyer** — detects submarines and protects convoys.
- **Naval mine** — stationary anti-ship defense with a visible friendly radius.
- **Minesweeper** — clears naval mines and escorts transports.
- **Landing craft** — cheaper short-distance troop transport for coastlines.
- **Blockade order** — warships reduce enemy port income while remaining nearby.
- **Naval fuel ship** — extends carrier or warship operating range and creates a
  target worth escorting.

## Strategic structures and weapons

- **Radar station** — shared detection for aircraft and missiles.
- **Early-warning satellite** — expensive global launch warning with no weapon.
- **Jammer** — temporarily hides friendly launches or shortens enemy warnings.
- **EMP missile** — disables structures for a short time without destroying land.
- **Bunker** — protects troops locally but cannot attack.
- **Command center** — unlocks advanced orders and becomes a high-value target.
- **Uranium site** — neutral objective that reduces nuclear weapon cost while held.
- **Oil field** — neutral objective that improves vehicle or fuel-train economy.
- **Rail repair station** — automatically repairs nearby sabotaged rail segments.
- **Decoy structure** — appears as a real silo, Radar, or Base until scouted.

## Economy and logistics

- Supply trains that carry visible fuel, ammunition, or gold cargo.
- Train interception and recoverable cargo instead of automatic disappearance.
- Rail sabotage followed by Engineer repair.
- Regional resources such as oil, uranium, and industrial capacity.
- Trade contracts between allies with a duration and cancellable route.
- Wartime production choice: troops, vehicles, aircraft, or infrastructure.
- Upkeep for only the strongest late-game units, with clear UI before purchase.
- Captured structures requiring a short repair period before reuse.

## Diplomacy, clans, and information

- Timed ceasefires that prevent attacks until the visible expiry tick.
- Demilitarized zones drawn by both players and enforced by the server.
- Shared Radar intelligence between allies.
- Loaned units that automatically return when an agreement ends.
- Alliance objectives that pay both players for holding a neutral zone.
- Clan wars with scheduled team lobbies, standings, and replay links.
- Spectator and replay mode with delayed information for live ranked games.
- Pings for attack, defend, Radar contact, supply request, and rally point.

## Map and match mechanics

- Capturable airfields, ports, factories, and resource sites.
- King-of-the-hill strategic zones that generate score instead of territory.
- Convoy escort objectives that cross the map along generated routes.
- Disaster events as optional lobby modifiers: storms, drought, or radiation wind.
- Day/night gameplay modifier where Radar matters more at night, kept optional.
- Destructible bridges and narrow passes on selected maps.
- Limited-vision or fog-of-war mode with remembered last-known structures.
- Drafted ranked modifiers so both players see and veto extreme rules.
- Co-op survival against increasingly coordinated nations.
- Multi-team objective mode where territory alone does not decide the winner.

## Quality and performance rules for every addition

- Every offensive unit needs at least one clear defense and one avoidable warning.
- Use spatial indexes for local effects; never scan all map tiles every tick.
- Cache deterministic paths and send motion plans rather than per-frame positions.
- Keep effects instanced and bounded by lifetime.
- Index active units by relevant type instead of filtering every unit each frame.
- Make AI use the same validation, cost, range, and counter rules as humans.
- Add deterministic tests for launch, interception, destruction, capture, stacking,
  multiplayer synchronization, and AI use before enabling a unit publicly.
- Preserve readable silhouettes, player-color ownership, visible radii, sounds,
  build previews, and explicit affordability feedback.
