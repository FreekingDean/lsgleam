# lsgleam

Opinionated lightshow UI on top of TouchDesigner.

## TD bridge

A WebServer DAT inside TD that execs whatever Python it is sent and replies with `result`. That is the whole TD side; everything node-related lives in the web client (`web/src/td.ts`).

### Setup in TD

1. In `/project1`, create a Base COMP named `bridge`.
2. Inside it:
   - Text DAT named `callbacks`, paste `td/bridge_callbacks.py` into it.
   - WebServer DAT named `webserver1`: Port `9980`, Callbacks DAT `callbacks`, Active on.

### Protocol

Send `{"id": any, "code": "<python>"}` over WebSocket (`ws://localhost:9980`) or HTTP POST. The code runs in the callbacks DAT's namespace; assign `result` to return something. Reply is `{"id", "ok": true, "result"}` or `{"id", "ok": false, "error"}`.

```sh
curl -s localhost:9980 -d '{"code":"result = [c.name for c in op(\"/project1\").children]"}'
curl -s localhost:9980 -d '{"code":"o = op(\"/project1\").create(noiseCHOP, \"noise1\"); o.par.period = 2; result = o.path"}'
```

## Web UI

```sh
cd web && npm install && npm run dev
```

Opens on http://localhost:5173 and connects straight to the WebServer DAT (URL editable in the header).

### Layout, show, scenes

The build page has a **layout** tab, a **show** tab and one tab per scene.

The **layout** tab sets the hardware, and its placements also drive the simulator. The **show** tab collects the show from scenes. Each **scene** decides what happens to the data.

The layout is the physical room, top-down, one grid square per metre. It holds only hardware and sources: Art-Net nodes, DMX controllers, fixtures, audio sources (CDJs), audio inputs (the interface), BLT and AudioSlice, and boxes. A node's position is its floor position. Its panel sets:
- name, height, X and Z (metres, or type `100ft` / `30'`);
- turn, tilt and roll, with ↺/↻ 90°, flip H to turn around and flip V to hang upside down (the arrow on the node shows its turn);
- "flip ports", which swaps the in and out sides.

The simulator's selection panel is the same editor, and both edit the same placement.

Selecting several nodes shows every setting they share, greyed where values differ; editing sets all of them, and rotate buttons turn each one. Dragging a wire highlights the ports it can connect to and dims the rest. ⌘C/⌘V copies whole devices one metre over and selects the copies.

- **Fixture** (`fix<n>`): one light, cabled into a DMX chain. Its sliders are its own values, shown for whatever weight the scenes leave (see blending below).
- **Art-Net / sACN node** (`net<n>`): protocol, IP, active, and a universe list where each universe is out or in.
  - Out universes are output ports. Cable one to a fixture's DMX in, then that fixture's DMX out to the next fixture's in: a light's universe is whatever its chain starts from.
  - In universes are input ports for DMX controllers.
  - Each port takes one cable, and loops are refused. The panel lists each out universe's chain with addresses.
  - In TD each node is one COMP. Per out universe it builds Constant `c[1-512]` → Replace `patch_u<n>` → DMX Out CHOP `dmxout_u<n>`, merging every fixture chained to that universe. Cable changes rebuild the nodes and controllers.
- **DMX controller** (`dmxin<n>`): a lighting desk or fader box. Cable its DMX out into an Art-Net node's in universe. It shows N faders, one signal each, on the show tab's Inputs node, for optional overrides such as season, drop mode or blackout.
  - In TD: DMX In CHOP (protocol and universe from the cable; inactive while uncabled) → Rename `ch[1-512]` → Select the first N → Math (0–255 → 0–1) → Out.
- **LED tubes** (`tset<n>`): one or more LED tubes in a shape, placed on the layout as one node. There is no separate single-tube node: a single tube is a design with one tube.
  - Designs are templates. Each new LED tubes node gets its own design, and every design appears under Saved tube designs in the palette to drop more copies. "Edit design" changes every copy.
  - Each tube has a name, LED count, pixel protocol (SK9822, APA102, WS2812, WS2811), length and a 3D path. The node has a pixel in and out per tube, which only take cables of the same protocol: cable a controller output into a tube, and chain tube out → next tube in (in the same or another node); LEDs number on along the chain. Underneath, every tube is an ordinary tube block (`tset<n>t<k>`) that follows the node's placement.
  - "Edit design" opens a 3D editor with a tab per tube and "+ tube". Every tube starts at the design's origin (the blue point, its layout position). Double-click a tube to add a bend there; click a yellow bend and drag its arrows (5 cm snap), or type its segment length or X / height / Z (m, ft or '). A tube keeps its length: after every edit the other segments scale so the path adds up to it, so you can bend a tube but not stretch it.
  - Prebuilt shapes replace the design's tubes from a tube count, LEDs per tube and tube length: **tree** (each tube rises 35% as a shared trunk, then branches out and up, spread evenly around), **burst** (straight out over the upper hemisphere) and **fan** (an upright half circle).
  - LEDs are spread evenly along each path, and the simulator draws them as points on a translucent tube coloured from the controller's universes.
  - On the show tab the Outputs node lists each copy as its own section, with one port per tube.
  - Older shows: a standalone tube loads as a one-tube LED tubes node with the same id, and its cables and wires move to its tube.
- **Pixel controller** (`board<n>`, Art-Net only): IP, pixel protocol, number of outputs, LEDs per output, LEDs per universe (150 by default) and a start universe.
  - Each output gets `ceil(LEDs per output / LEDs per universe)` universes, numbered on from the start universe: with 300 LEDs per output, output 1 is U0–U1 and output 2 is U2–U3. LED k of an output lands on channel `(k mod per-universe) × 3 + 1`.
  - The panel lists that config per output, with the tubes and LED ranges on it, and flags an output that is over its LED count.
  - In TD it builds like an Art-Net node: one DMX Out per universe to the board's IP. The simulator keys DMX by node, so a board's U0 never collides with the lighting node's U0.
- **Audio source** (`cdj<n>`, no TD build): a player number and an audio out, cabled into an audio input.
- **Audio input** (`audio<n>`): the device, its number of mono channels and a stereo-pairs toggle. It gets one port per channel (or per pair, labelled 1-2, 3-4…), and each port takes one cable. On the Inputs node each port is its own audio signal, named after the cabled source, and selects only its channels (`chan1 chan2` for 1-2).
- **Box** (`box<n>`): width, depth and height for a room, stage or bar, drawn behind everything and as a wireframe in the simulator. It is click-through except its title label; tick "locked" to stop it moving.

The show tab has two fixed rails:
- **Inputs**: every output of the layout's sources — AudioSlice signals, audio inputs, BLT signals and DMX controller faders — grouped by device.
- **Outputs**: one port per layout fixture, grouped by type.

Between the rails sit the scene nodes, Scene select and logic (Equals, Latch, And, Counter, and transformers such as Drop and Hold). Wires from the Inputs rail are ordinary wires from the source block, so a scene input, a Counter or a Level can all listen to the same signal.

- **Scene** (`scene<n>`): a node on the show tab.
  - Left side: `on` (its weight, 0–1, ramped linearly by the panel's fade in as it rises and fade out as it falls; e.g. drop 0 s in / 4 s out with season 4 s in / 0 s out snaps into a drop and crossfades back) and one port per Input block declared inside it.
  - Right side: one teal port per output declared inside it. Wire an output to any number of fixtures of the same type on the Outputs rail. A fixture takes one wire per scene, and several scenes blend.
  - Double-click it, or use its tab, to edit its graph: Input blocks → transformers and looks → outputs.
  - A scene with `on` unwired takes the weight the others leave, so it is the fallback. Reorder scenes with the arrows in the scene's panel; order only breaks exact ties.
- **Fixture output** (`lt<n>`, scenes only): a virtual fixture of one type with the fixture inputs (`look`, `position`, every channel) and its own sliders, which are what the scene sends on unwired channels. Every fixture wired to it gets the same values. Stored positions live here.
- **Group output** (`grp<n>`, scenes only): a virtual set of N members (the Members field) of one fixture type, with a built-in pattern.
  - On the show tab the scene node shows one port per member ("Kick PARs 1…8"). Wire each member to one or more fixtures, so the show tab stays fixture-level.
  - Inputs: `look`, `color`, `pattern` (spread over the members' Dimmer by mode), `step` or `trigger` (a "reset pattern" button in the panel puts it back on step 1, to line groups up); **Minimum** (or the `floor` input) is a hard floor: no member's Dimmer goes below it, `position` and `nudge` for heads, and every channel.
  - Each member has its own aim (Pan/Tilt), and stored positions are kept per member.
- **Pixel output** (`px<n>`, scenes only): an effect for LED tubes. It appears as a yellow port on the scene node; wire it to any tubes in the Outputs rail's LED tubes section, and a tube takes one wire per scene.
  - Every setting the effect uses is also an input port: `color`, `dimmer`, `position`, `width`, `speed` (laps/s) and, for ramp, `stop<k>` (colour) and `at<k>` (spot) per stop. Only the ports the current effect uses appear; untick the rest under Ports. A wired port greys out its field. In TD each wired port lands on a Null `p_<port>` feeding the `params` Script CHOP, which falls back to the panel value for anything unwired; scrolling integrates speed per frame so changing it never jumps.
  - **Spread across tubes** (0–1, also a port) shifts the effect's position by `spread × tube index / tube count` within its LED tubes node: at 1 a chase spirals once round a tree and a ramp rotates around it.
  - **Runs along** picks the 0–1 axis the effect uses: each tube from its start (the default), height across the whole design (the same height lights on every branch: rings, flames, a level meter), or distance from the base (shockwaves out to the tips). The UI computes each LED's height and distance from the design's paths and passes them to the tube's Script CHOP.
  - Along each tube, effects run from its start whatever its LED count:
    - **solid**: the whole tube.
    - **band**: a soft band at `position`, `width` each side.
    - **fill**: lit from the start up to `position` with a soft edge (wire an energy for a meter).
    - **chase**: a band lapping the tube at `speed` laps/s, offset by `position`.
    - **ramp**: a gradient through colour stops (colour + 0–1 spot along the tube, add or remove stops), shifted by `position` and scrolled at `speed` laps/s. The params script sends the stops as `s<k>`/`r<k>`/`g<k>`/`b<k>` channels and the tube interpolates them per LED with `np.interp`; stop edits update TD live. Make the last stop match the first for a seamless scroll.
  - Colour, dimmer, position and width are sliders or wired inputs.
  - In TD it is built from Script CHOPs (numpy):
    - The output computes `Red Green Blue pos width`; chase uses `absTime`, so it keeps moving while the timeline is paused.
    - Each tube renders its pixels (3 channels × N samples) for every scene driving it and blends them by scene weight, black for the remainder.
    - Each pixel controller universe (`patch_u<n>`) interleaves the slices of the tubes that fall in it into `c1…c512` (0–255) → DMX Out to the board's IP.
- **Composite** (`comp<n>`, show tab, scenes or other composites): your own block. Double-click it (or "open") to edit inside; the tab bar shows the path as `› name` tabs. Inside, the palette has Inputs, Outputs and transformers: each Input block becomes an input port on the composite's node and each **Output** block (`out<n>`, signal / index / number / colour) an output port. A wire from a composite's output port reads that Output block. In TD each composite is a COMP holding its blocks, nested like the app.
- **Input** (`in<n>`, scenes and composites): declares a value the scene or composite takes from outside, typed signal / index / audio / number / colour (one palette entry per type). Its name is the port label on the scene node. Built as In CHOPs from the show-tab wires into that port (signals sum and clamp) → `out1`.
- **Scene select** (`manual<n>`): one signal output per scene, 1 for the chosen one. Buttons in its panel set it live. Or wire an `index` in (Steps on a DMX fader, BLT `song`, a Counter) and scene N is chosen by the index (an Equals chain per scene). Wire each output into its scene's `on`.
- **Constant** (`const<n>`): a test source, signal or index, with a value slider (live, no rebuild) and an optional pulse rate that turns it into a square wave (LFO CHOP) between 0 and the value.
- **Values** (`val<n>`): the number version of Colours: named rows × N steps picked by a wrapping `index`, one signal output per row (e.g. per-season dimmer minimums and maximums into Range). Editing values updates TD live.
- **Colours** (`col<n>`): a table of named colour rows × N steps, picked by an `index` input that wraps. Each row is a pink `color` output carrying Red, Green and Blue. Wire the season count in and feed the rows to scene Colour inputs, then into a fixture or group output's `color` (it replaces Red/Green/Blue and hides those ports) or a Looks block's `color` (which replaces the look's colour and keeps its dimmer window). In TD: one Constant per step → Switch on the wrapped index; consumers select their row's `c<i>_*` channels and strip the prefix.
  - **Palette view**: double-click a Colours node (or "palette view" in its panel) for a full-screen editor: big swatches for every row × step (rename, add or remove rows and steps; colour edits update TD live) and, for every RGB fixture type (the ones in the show first), a "looks like" row showing each swatch as that fixture would show it, with the DMX red, green and blue it sends underneath.
  - **Fixture colour response** (per fixture type, saved as `responses` in the show): R/G/B strength says how bright that fixture's red, green and blue LEDs are relative to each other (1 = as bright as the others); raise a channel until the "looks like" white matches the real fixture. "Looks like" is sent × strength, scaled down so nothing exceeds full. **Compensate** multiplies the fixture's Red/Green/Blue output by min(strength) / strength, so the weakest channel stays at 100% and nothing goes above 255: strength 1 / 1 / 4 sends magenta `#ff00ff` as 255 / 0 / 64. In TD a compensated fixture gets a `gains` Constant and a `compensate` Math CHOP (multiply, matched by name) before its 0–255 scale; fixture types without compensation build as before. Changing a response rebuilds every fixture of that type.
- **Equals** (`eq<n>`): 1 while the index equals a value. Built as Math pre-add −value → Math square → Limit → invert; the two Math CHOPs are separate because TD applies a post-op before the pre-add. BLT `song` → Equals → scene `on` is "this scene for that song".
- **Latch** (`latch<n>`): 1 from a `set` edge until `reset`. The output decays over 0.25 s (Lag) so an And sees it on the same frame the reset arrives.
- **And** multiplies two signals.
- **Fade** (`fade<n>`): ramps a signal linearly, a full 0→1 over `rise` seconds and 1→0 over `fall` (Lag CHOP with Clamp Slope). Curve `smooth` uses the Lag CHOP's exponential lag instead (time constant = time/3, ~95% there at the set time). Put timing on the signal rather than the scene when only some transitions should fade: drop → Hold → Fade (rise 0, fall 4) into drop's `on`, and Not of it into season's, crossfades back to the season while battle still cuts hard.
- **Mix** (`mix<n>`): crossfades two signals or two colours (Type), `a × (1 − mix) + b × mix` (Math CHOPs). Slides one value with a Fade instead of switching scenes.
- **Not** (`not<n>`): 1 − signal, clamped 0–1. Precedence (battle → drop → season): battle `on` = battle; drop `on` = drop × Not(battle); season `on` = Not(battle) × Not(drop).
- **Counter** counts edges into an index clamped at max.

Scenes **blend by weight**.

**Selector.** The tagged COMP `/project1/lsgleam/show/lsgleam_scene` turns each scene's `on` into a weight channel `w<k>`: summed, clamped 0–1, then a Lag CHOP with Clamp Slope on (max slope 1/fade in rising, 1/fade out falling), so fades are linear ramps of exactly that length. An unwired `on` gets whatever weight the wired scenes leave (`1 − Σ`, clamped).

**Scene outputs.** Each output is its own COMP producing 0–1 channel values: a group output names each member's channels `m<i>_<channel>`. Positions and patterns resolve inside the output, so everything a fixture receives is plain channel values.

**Fixtures.** Each fixture with scene wires computes `(Σ out_k × w_k + own × rest) / (Σ w_k + rest)` over the scenes driving it, where `rest = max(0, 1 − Σ w_k)` and `own` is its layout values. It takes a group member's channels with a Select and a Rename that strips the `m<i>_` prefix. The blend then goes through Math (0–255) → Rename to `c<address+i>` → Out.

So a lone scene fades in from the fixture's own values, two scenes crossfade (heads sweep between positions), and a fade of 0 is a hard switch.

Rebuilds follow the dependency graph, because TD connections into a destroyed COMP are lost. Changing a block rebuilds it and everything downstream in dependency order: Input consumers, scene outputs, fixtures, then their Art-Net node. Wiring a group output rebuilds the group, since its member list changed.

- Old shows migrate on load:
  - Each light-to-universe wire becomes a chain in address order.
  - Old groups split into fixtures, with one group-output member per fixture.
  - Every scene that drove a light gets an output with that light's settings, wired to its fixtures.
  - DMX in blocks become controllers cabled to their interface.

### Model

The UI owns the show: `web/src/show.ts` defines blocks (fixtures, DMX outputs) with their settings, slider values and positions. TD is a render target. The show JSON is saved into a Text DAT `/project1/lsgleam_show` on every change, so the `.toe` is the project file, and loaded from there on connect.

Each block is rebuilt as a whole (destroy COMP, recreate from the model) when a structural setting changes. Other blocks keep running. Slider values and node moves write straight to known op paths without a rebuild. "rebuild all" forces every block. On connect, blocks missing in TD are built and tagged COMPs not in the show are destroyed.

Everything generated lives in one Base COMP, `/project1/lsgleam`, laid out like the app:

- `layout/`: Art-Net nodes, DMX controllers, pixel boards and sources (audio, BLT, AudioSlice).
- `show/`: show-tab blocks, scene select, the selector and every fixture (the Outputs rail). Each scene is a COMP `show/<scene id>` holding its blocks, and each LED tubes node is a COMP `show/<tset id>` holding its tubes.
- Blocks are COMPs named by id, tagged `lsgleam`, coloured by kind (hardware blue, sources red, fixtures and tubes teal, outputs yellow, inputs green, logic grey, scenes purple) with the app name as their node comment.
- Wires inside a COMP are real wires. A wire that crosses levels climbs out through an Out CHOP `out_<source id>` on each container and down through an In CHOP `in_<source id>`, so at show level you see sources → scene COMPs → fixtures wired like the show tab, and fixtures → `layout` → Art-Net nodes.
- On connect, lsgleam COMPs left flat in `/project1` by older versions are destroyed and the tree is rebuilt.

Anything hand-edited inside a `lsgleam`-tagged COMP is lost on its next rebuild. Nothing outside `/project1/lsgleam` is touched except the `lsgleam_show` DAT.

### Blocks

Palette categories follow the signal: Inputs → Transformers → Fixtures → Outputs. Several wires into one signal port are summed and clamped to 0–1 (a Math add → Limit per port inside the target block); other port types take one wire. Ports are typed and colour-coded by type (audio red, signal green, index orange, number grey for raw values like BPM, look purple, colour pink, dmx blue); the UI only accepts matching types.

- **Audio in** (`audio<n>`): Audio Device In CHOP → Out. Device list fetched live from TD. Each input port selects its own `chan<n>` channels.
- **Beat Link Trigger** (`blt<n>`): OSC In CHOP on the block's port → Rename `*?<deck>?<signal>` → `d<deck>_<signal>` → per-signal scaling (`beat` pre-add −1 to an index 0–3, `bpm` and `pitch` pass through unscaled on the grey `number` port type, the rest are 0/1 signals) → Merge → Out. The panel picks the deck count (1–4), whether to include the Master Player (ports `master_<signal>`, from a trigger watching the Master Player that sends `/blt/master/<signal>`), and which signals (playing, onair, master, beat, bpm, pitch, progress, song) to expose; each deck × signal is a port. `song` is the index of the playing track's title in the panel's song list (case-insensitive, sent only on a match), so a list of cue songs becomes an index you can wire into Scenes. BLT has no fixed OSC output, and a trigger only tracks one player, so the block needs one trigger per deck (Watch Player N, Enabled Always, Message Custom). "Download BLT config" writes a `.blt` file (BLT's EDN preferences format: `:triggers` with `#beat_link_trigger.util.PlayerChoice` players and `:expressions {:tracked :beat}`, plus global `:expressions {:setup :shutdown}`) that you load with Triggers → File → Load or `-c file.blt` on launch; loading replaces the current triggers. The same expressions are shown for pasting by hand: Global Setup opens one OSC client, each trigger's Tracked Update sends `/blt/<device-number>/<signal>` on every status packet and its Beat expression sends `/blt/<device-number>/beat`. Pro DJ Link does not carry channel fader levels, only the mixer's on-air flag; use AudioSlice loudness for volume.
- **AudioSlice** (`as<n>`): OSC In CHOP on the block's port → Rename each chosen `stem/stream` (matched as `*stem?stream`) to `stem_stream` → Select → Out. One signal port per chosen signal, using AudioSlice's own stem and stream names (`kick/energy`, `beat/onset`, …). "Push to AudioSlice" has TD call AudioSlice's local HTTP API (`http://127.0.0.1:8722/api/v1`, token optional, enable it under Advanced settings): it deletes any output group named `lsgleam <id>`, creates it sending to `127.0.0.1:<port>`, and adds one modulator per signal with path `/as/<stem>/<stream>`. Onset streams and the beat stems (`beat`, `model_beat`, `model_downbeat`) are created with AudioSlice's envelope generator (tempo-synced, no attack or sustain, 1/8-note release for onsets and 1/4 for beats, retrigger on, FLOAT output) because the OSC In CHOP holds the last value, so a switch-mode single message would latch at 1; the envelope gives a decaying hit that works both as a trigger edge and as an intensity. The rest get the block's smoothing (default 0 ms, sent as an explicit alpha so AudioSlice's 1 s default never applies). Going through TD keeps the browser at one hop and sidesteps CORS; TD blocks for ~120 ms per modulator while it runs. AudioSlice outputs 0–1 by default so nothing is rescaled.
- **Level** (`level<n>`): audio loudness as a 0–1 signal. Analyze CHOP (RMS power) → Math average to mono → Lag (attack, release) → gain → Limit 0–1. Feed it an audio input port from the Inputs rail.
- **Steps** (`steps<n>`): quantises a 0–1 signal into an index 0…N−1 (Math × N → Limit floor), e.g. a DMX fader into Scene select.
- **Gate** (`gate<n>`): zero below a threshold. With rescale (default) the part above is stretched back to 0–1 (Math pre-add −t, gain 1/(1−t) → Limit), so a gate at 0.3 turns 0.3→1 into 0→1 and lights fade up from nothing; without rescale the signal passes unchanged once it is over. Put one between an energy signal and a dimmer to keep quiet passages dark.
- **Drop** (`drop<n>`): kick-dropout detector. Inputs `kick` (energy) and `beat` (a beat pulse). Math/Limit gate the kick to 0/1; a Count CHOP counts beat edges and is held at zero while the kick is on (reset input, "while on"), so it holds "beats since the last kick"; gating it at `beats − 0.5` gives `armed`. A short Lag holds `armed` for 0.25 s after the kick returns, and `kick × hold` is the `drop` pulse; `armed` is also an output, for build-up looks. A Count CHOP with a re-trigger delay of `cooldown` seconds counts them into `drops` (index).
- **Hold** (`hold<n>`): inputs `trigger` and `beat`; `hold` is 1 from the trigger until N beats have passed (Count CHOP on beats, held at zero while the trigger is on, then `beats − count` gated above 0.5).""","""- **Hold** (`hold<n>`): inputs `trigger` and `beat`; `hold` is 1 from the trigger until N beats have passed (Count CHOP on beats, held at zero while the trigger is on, then `beats − count` gated above 0.5), and stays 0 until the first trigger.""")
- **Range** (`rng<n>`): remaps `signal` into a brightness window: output = min + signal × (max − min), where min and max slide from the tame pair at `amount` 0 to the wild pair at `amount` 1 (Math CHOPs for lo/hi, sub, mul, add). Sum a Scenes level, a Hold and a song highlight into `amount` for "tame early, wild late, extreme on drops". The four window edges can also be wired (`tame min`, `tame max`, `wild min`, `wild max`), which overrides the fields, so a Values table indexed by season can set them; each edge is lerped by `amount` with Math CHOPs.
- **Sequence** (`seq<n>`): a list of values stepped through on `trigger`, wrapping; `reset` jumps back to the first (Count CHOP reset input). Output is center + value × unit, so "1 -1 2 -1" with unit 0.05 is right, left, right twice as far. Built as Constant per value → Switch on the wrapped count.
- **Looks** (`look<n>`, formerly Scenes): a look is colour plus brightness. Inputs `scene`/`next`, `dimmer` (the brightness before the window; 1 if unwired) and `wild`; output `look` carries `Red Green Blue Dimmer`, with Dimmer = lo + dimmer × (hi − lo) after `wild` has widened the window. On a scene tab a light shows both `look` and the separate Red/Green/Blue/Dimmer (plus `pattern` on groups) until one side is wired, then the other side disappears for that scene; the same rule hides Pan/Tilt once `position` is wired and vice versa. A group runs a wired look's Dimmer through its pattern. Every block also has a **Ports** checklist to hide inputs you don't use; hiding a wired port drops its wires.
- **Pattern** (`pat<n>`): fan-out transformer. Inputs `signal` plus either `step` (index) or `trigger` (signal), chosen by the Advance option; outputs `slot1..N`. The UI computes a mask table for the mode (all; alternate odd/even; chase one at a time; outsidein from the ends to the middle and back; alternate ×2 two on, two off; fill in lighting from the ends inward and staying lit until full; fill out the same from the middle) and builds one Constant CHOP per step feeding a Switch CHOP. The switch index comes from `step`, or from a Count CHOP on rising edges of `trigger` (divided by the "Every N triggers" field via a Math CHOP with floor, so a pattern can advance every 4 or 16 beats; Scenes, Sequence and Group have the same field), or 0 if unwired; a Limit CHOP loops it over the step count. If `signal` is wired, a Math CHOP multiplies the mask by it. Wire each slot to a fixture's Dimmer. "Reset pattern" in its panel jumps back to step 1, and **Minimum** (or the `floor` input) is a hard floor, applied with a Math CHOP max: no slot goes below it.
- **Fixture output / Group output**:
  - `look` input: Replace fills Red/Green/Blue from it, and the Dimmer is windowed as `lo + Dimmer × (hi − lo)` by Looks.
  - Each wired port gets In → (Select) → Rename to the channel, merged into a Replace over the sliders → Limit 0–1 → Out.
  - Positionable profiles get an orange `position` port and a Positions list: "store current" reads live Pan/Tilt from TD, "go" moves the sliders there, "set" overwrites. When `position` is wired, a Switch CHOP picks one Constant per stored position (input 0 is the aim) and the Pan/Tilt ports are locked.
  - A group runs each member through its own `m<i>_` chain, with its pattern slot as Dimmer and its own position Switch, then merges them.
- Profiles live in `web/src/fixtures.ts`.

Any block with inputs gets one In CHOP per wire plus a Merge; wires are real TD connections made when the target is built, so rebuilding a block also rebuilds everything it feeds. Node heights grow with port count and are pinned in TD.

### Repatch

"repatch" in the header walks every DMX chain from its universe and assigns consecutive addresses from 1 along it (each stepping by the profile's channel count), then rebuilds the lights and their interfaces. Lights with no cable keep their address. Use it whenever addresses have drifted into overlapping after adding members or editing addresses by hand.

### Debug overlay

The "debug" checkbox in the header polls TD every 150 ms (one eval returning every tagged COMP's `out1` channel values) and shows a live number and a 60-sample sparkline next to each port dot. Output ports show their own channel (first channel for single-output blocks, otherwise the channel named like the port); input ports show the value of the wire feeding them.

### Simulator

The "simulate" tab is a port of ArtNetPreview's Three.js scene (floor, grid, orbit camera, PAR with lens, beam cone and spotlight) that needs no fixture config and no Art-Net listener: every layout fixture becomes a 3D light using the lsgleam profile (PAR, or a moving head with pan/tilt yoke, colour wheel and a narrow beam). While the tab is open the UI polls TD every 33 ms (`readDmx`, one eval reading the 512 patched channels of every interface universe, keyed by universe) and drives each light from its universe and DMX address exactly as the real fixture would read them, so an unpatched fixture or an address clash shows up in the simulation. RGB fixtures are drawn as they look (DMX × the fixture type's colour strength, scaled to full), so the sim matches the palette view's "looks like". The HUD shows the selected light's universe and address. Layout devices (nodes, controllers, CDJs, audio inputs) render as small boxes and boxes as wireframe rooms. Left-drag looks around, WASD moves, Q/E go down and up, Shift is faster, the wheel moves forward and back, right-drag pans and Esc deselects. Click anything to select it and drag the gizmo (move / rotate); placements are shared with the layout tab and saved as `sim` on the block. STL environments and LED strips are not ported yet.

### Export and import

`shows/seasons.json` is a full example: 25 PARs and 8 moving heads chained on universe 0 inside a 100 × 30 ft room, an 8-fader DMX controller on in universe 1 (unwired, ready for overrides), two CDJs into a Scarlett's first two stereo pairs, four season scenes (Fall → Winter → Spring → Summer, each wider in brightness window and busier in patterns), song-primed battles and drop-triggered season changes. A listed BLT song primes a Latch; the next drop (Drop × Latch) advances a Counter into Scene select. While primed, two sides of the show tab flip between this season's and the next season's look on every beat (Looks `offset`), and a Hold gives 16 beats of drop mode after the change (wide windows, centre lights in their drop shade).

"export" downloads the show as JSON (the same document stored in `/project1/lsgleam_show`). "import" loads one, runs it through the same migrations as a reload, replaces the current show, destroys every lsgleam COMP in TD and rebuilds everything from the file in dependency order ("rebuild all" uses the same order). The .toe still carries the show, so export is for backups, sharing a rig, and moving between machines.

### Undo and redo

⌘/Ctrl+Z undoes the last model change and ⇧⌘Z (or Ctrl+Y) redoes it, up to 100 steps; the header has buttons too. Each step is applied to TD by diffing the two shows: removed blocks are destroyed, moved blocks are moved, changed or added blocks and the targets of changed wires are rebuilt in dependency order, and a changed scene order rebuilds the selector and Manual blocks. Live slider drags are not history steps.

### Wire focus

On the show and scene tabs, selecting nodes dims every wire that doesn't touch them. The eye on a scene or composite node hides its wires (remembered per browser) until you select it. Hovering a port on the Inputs or Outputs node lights up just the wires on that port, hidden or not.

### Multi-connect

⌘/Ctrl- or shift-click ports (the label or the dot) to pick them; ⌘/shift-click a section title on the Inputs or Outputs node to pick every port in it. Then drag one wire from a picked port: if both ends are picked sets, they pair up in on-screen order top to bottom (group members 1–8 → fixtures 1–8); if only one end is a picked set, the other port fans out to all of them. Wires the rules refuse (a fixture already driven by that scene, type mismatches) are skipped. The same works for cables on the layout. Esc or switching tabs clears the picks.

### Copy and paste

⌘/Ctrl+C copies the selected nodes with the wires between them; ⌘/Ctrl+V pastes them onto the current tab with new ids, offset, named "… copy". Copying a scene node copies its whole graph and its output wires to fixtures as a new scene, and Manual outputs are remapped to the new scene.

### Editing

Drag a palette item onto the canvas (or double-click it) to add a block; nodes snap to a 20px grid. On the layout, drag from an Art-Net out universe or a fixture's DMX out to a fixture's DMX in to cable it. Select a node to edit it on the right. Backspace deletes nodes or wires.
