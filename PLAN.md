# N64/PlayStation-Style Wrestling Game Plan

## Working Title

**Rumble64**

A low-poly, simulation-leaning wrestling game inspired by late-1990s console wrestling titles. The first version will focus on a tight one-on-one match with heavy movement, readable positioning, stamina management, grapples, strikes, pins, and wrestler-specific finishers.

## Core Fantasy

The player controls a wrestler in a chunky angled pseudo-3D arena presentation built with 2D HTML5 Canvas. The feel should be physical, weighty, and tactical: circle the opponent, manage momentum and stamina, weaken them with strikes and grapples, land a unique finisher, then pin them before they recover.

## Player Goal

Win the match by pinning the opponent for a three-count.

To create a successful pin opportunity, the player must:

1. Reduce the opponent's stamina through strikes, grapples, throws, and finishers.
2. Build momentum by attacking, countering, and controlling the match.
3. Knock the opponent into a vulnerable downed state.
4. Initiate a pin while the opponent has low enough stamina to stay down for the three-count.

The opponent can kick out if they still have enough stamina or if the pin is attempted too early.

## Match Structure

The first playable loop will be a single one-on-one match:

- Player wrestler vs CPU wrestler.
- First playable characters: **Johnny Toxic** and **Joey Image**.
- Both starting characters have equal stats in the first playable loop.
- Player chooses whether to play as Johnny Toxic or Joey Image before the match begins.
- One rectangular wrestling ring.
- No entrances, menus, weapons, rope breaks, submissions, tag partners, or crowd systems in the first version.
- Match ends only by pinfall.

## Main Game Loop

Each frame of the game will update in this order:

1. **Read input**
   - Capture keyboard movement and action buttons.
   - Track taps, holds, and contextual button presses.

2. **Update player intent**
   - Convert input into movement, facing, strikes, grapples, pins, or special move attempts.
   - Prevent actions during recovery animations, stun, knockdown, or pin states.

3. **Update CPU behavior**
   - CPU approaches, circles, attacks, grapples, retreats, or attempts a pin based on distance, stamina, and current match state.

4. **Resolve movement**
   - Move wrestlers around the ring.
   - Clamp positions inside ring bounds.
   - Prevent wrestlers from overlapping too deeply.

5. **Resolve combat**
   - Check attack and grapple ranges.
   - Apply damage, stamina loss, stun, knockdown, throws, counters, and momentum gain.

6. **Update match states**
   - Handle downed recovery.
   - Handle pin attempts and pin count timing.
   - Check for kickouts or match-ending three-counts.

7. **Update animation state**
   - Advance simple sprite/pose states such as idle, walk, strike, grapple, slam, downed, pinning, and celebrating.

8. **Render**
   - Clear canvas.
   - Draw the ring, ropes, wrestlers, shadows, UI bars, pin count, and match result text.

## Control Scheme

Target input: keyboard.

### Movement

- `Arrow Up`: Move up-ring.
- `Arrow Down`: Move down-ring.
- `Arrow Left`: Move left.
- `Arrow Right`: Move right.
- Movement is 8-directional when combining arrow keys, mapped onto an angled pseudo-3D ring plane.
- Movement should feel heavy and simulation-like, with acceleration, deceleration, turn commitment, and slower recovery after missed attacks.
- Wrestler automatically faces the nearest opponent when close enough, otherwise faces movement direction.

### Basic Actions

- `Z`: Punch.
  - Quick standing punch.
  - Deals light stamina damage.
  - Can interrupt careless movement.

- `V`: Kick.
  - Slower standing kick.
  - Has slightly longer range than a punch.
  - Deals more stamina damage, but is easier to punish if it misses.

- `X`: Grapple.
  - Starts a collar-and-elbow grapple if close enough.
  - If the opponent is already stunned, performs a stronger throw or slam.
  - If too far away, the wrestler reaches and whiffs briefly.

- `C`: Run / Irish whip modifier.
  - Hold while moving to run at increased speed with faster stamina drain.
  - Press during a successful grapple to throw the opponent toward ropes or across the ring in a later version.
  - For the first playable loop, this can begin as a simple run button.

- `A`: Pin / context action.
  - Near a downed opponent: attempt pin.
  - Standing and close to ropes or turnbuckle: reserved for later contextual actions.

- `S`: Finisher.
  - Available only when the player momentum meter is full.
  - Requires close range and a standing or stunned opponent.
  - Performs the selected wrestler's unique finishing move.
  - Deals heavy stamina damage and causes a long knockdown.

### Defensive Actions

- `Shift`: Block / brace.
  - Reduces incoming strike damage while held.
  - Slows movement.
  - Timing a block near an incoming grapple may trigger a counter chance.

- `Space`: Kick out / struggle.
  - During a pin against the player, repeated taps increase kickout chance.
  - Outside pin states, reserved for future taunts or crowd momentum.

## Core Stats

Each wrestler has:

- **Health/Stamina**: Represents physical condition and ability to kick out.
- **Momentum**: Builds from offense, counters, and risky moves. Enables finishers.
- **Stun Timer**: Short window where a wrestler is vulnerable to stronger grapples.
- **Downed Timer**: Time spent on the mat after heavy attacks.
- **Recovery Rating**: Determines kickout and stand-up speed.
- **Strength Rating**: Affects grapple and slam damage.
- **Speed Rating**: Affects walk and run speed.

For the first version, these can be simple numeric values instead of a full character customization system.

## Combat Rules

### Strikes

- Fast, short-range attacks.
- Best for safely reducing stamina and interrupting movement.
- Repeated strikes can briefly stun the opponent.
- Blocked strikes deal reduced stamina damage.

### Grapples

- Require close range.
- Riskier than strikes because whiffing leaves the player open.
- Normal grapple causes medium damage and short stun.
- Grapple against a stunned opponent causes a slam and knockdown.

### Finishers

- Require full momentum.
- Require close range.
- Do not require the opponent to be stunned.
- Spend all momentum on use.
- Cause high stamina damage and a long knockdown.
- Create the best pin opportunity.
- Are unique per wrestler.
- Can be used by both the player and the CPU.

Initial finishers:

- **Johnny Toxic**: `Toxic Spill`
  - A dirty, sudden impact finisher that causes heavy stamina damage and a long stun-heavy knockdown.
- **Joey Image**: `Picture Perfect`
  - A flashier, crowd-pleasing finisher that causes heavy stamina damage and grants slightly more momentum payoff if it ends the match.

### Pins

- Can only be attempted near a downed opponent.
- Pin count advances from one to three over time.
- The pinned wrestler gets a kickout check before each count.
- Pins use a mix of stat-based and button-mash logic.
- Lower stamina and weaker recovery stats make kickouts less likely.
- Player taps `Space` during incoming pins to improve kickout odds.
- Button mashing helps, but cannot fully override terrible stamina or a badly timed pin attempt.

## Win State

The player wins when:

- The CPU opponent is downed.
- The player starts a pin.
- The pin count reaches three before the CPU kicks out.

On win:

- Freeze active combat.
- Show victory text.
- Play a simple celebration animation.
- Allow restart with a key press in a later version.

## Fail State

The player loses when:

- The player is downed.
- The CPU starts a pin.
- The pin count reaches three before the player kicks out.

On loss:

- Freeze active combat.
- Show defeat text.
- Play CPU celebration animation.
- Allow restart with a key press in a later version.

## First Playable Scope

The first playable loop should include:

- Canvas setup and game loop.
- One ring arena.
- Two placeholder wrestlers rendered as low-poly-style 2D shapes.
- Player movement.
- Basic CPU movement and attack behavior.
- Stamina and momentum bars.
- Strike action.
- Grapple action.
- Slam from stunned grapple.
- Finisher.
- Downed state.
- Pin attempt.
- Kickout logic.
- Win/loss result screen.

The first playable loop should not include:

- Character select.
- Menus.
- Entrances.
- Audio.
- Complex animations.
- Rope physics.
- Submissions.
- Multiple match types.
- Multiplayer.
- Save data.

## Visual Direction

The game should evoke N64/PlayStation wrestling games without requiring true 3D models:

- Chunky, low-detail wrestler bodies.
- Limited animation poses.
- Pixelated or low-resolution canvas scaling.
- Flat-shaded colors.
- Thick outlines or hard-edged shadows.
- Angled pseudo-3D ring view.
- Wrestlers are drawn as layered, chunky body shapes that scale subtly by vertical ring position to fake depth.
- Minimal but bold UI bars.

## Technology Stack

- **HTML5 Canvas** for rendering.
- **Plain JavaScript** for game logic.
- **CSS** for page layout, canvas scaling, and retro presentation.
- No external game engine for the first playable loop.
- No build step required initially.
- File structure can begin as:
  - `index.html`
  - `styles.css`
  - `src/main.js`
  - `PLAN.md`

## Implementation Priorities

1. Make movement and spacing feel readable.
2. Make attacks visibly connect or miss.
3. Make stamina matter for pins.
4. Make the match winnable and losable.
5. Keep the code small enough to iterate quickly.

## Confirmed First-Loop Decisions

- Johnny Toxic and Joey Image have equal starting stats.
- The player can choose either wrestler before the match.
- Finishers require full momentum and close range, but do not require the opponent to be stunned.
- The CPU can use finishers when its momentum meter is full.
