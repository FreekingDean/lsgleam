# Blocks

Every block in the palette, grouped by palette tab. Names are as the palette shows them. Each block's panel repeats the essentials in its help text.

Port types: **signal** (0–1: energy, fader, on/off), **index** (whole number: step, song, section), **number** (raw value: BPM), **audio**, **colour**, **look** (colour + dimmer), **multichannel** (several values on one wire).

## Layout tab

### Hardware

| Block | What it does | Key settings |
| --- | --- | --- |
| Box (room, stage, bar) | A room, stage or other space. | Width, depth, height, locked |
| Art-Net / sACN node | The interface TouchDesigner sends DMX through and listens on. | Protocol, IP, active, universes (out or in) |
| DMX controller (faders in) | A desk or fader box; one signal per fader on the Inputs rail. | Faders |
| Audio source | Anything sending audio into an audio input: a mixer, player, mic or laptop. | – |
| Audio input (interface) | The sound card; one audio port per channel or stereo pair. | Device, channels, stereo pairs |
| Beat Link Trigger (OSC) | Pioneer decks via Beat Link Trigger: playing, on air, beat, BPM, song. | OSC port, decks, master, signals, songs |
| AudioSlice (OSC) | Stem energy, hits and beats from AudioSlice. | OSC port, signals, smoothing, push to AudioSlice |
| OSC out | Sends a value × scale as OSC to another app, e.g. MadMapper. | Address, host, port, scale, glide |

### Pixels

| Block | What it does | Key settings |
| --- | --- | --- |
| LED tubes | One or more LED tubes in a shape, placed as one node. | Design, edit design (tubes, LEDs, length, protocol, bends) |
| Pixel controller (Art-Net) | The board that drives cabled tubes, mapped onto universes. | IP, protocol, outputs, LEDs per output, LEDs per universe, start universe |

### Fixtures

| Block | What it does | Key settings |
| --- | --- | --- |
| Fixture | A light in the room, patched on a DMX chain. One entry per fixture type. | Mode, address, its own values |

## Show tab

### Scenes

| Block | What it does | Key settings |
| --- | --- | --- |
| Scene | Turns its inputs into fixture outputs, weighted by `on`. | Fade in, fade out, priority, rooms |
| Scene select (buttons / index) | One output per scene, 1 for the chosen one. | go buttons, or an `index` input |

### Logic

| Block | What it does | Key settings |
| --- | --- | --- |
| Gate (zero below X%) | Zero below a threshold; above it pass through or rescale to 0–1. | Threshold, rescale |
| Equals (index == N) | 1 while the index equals a value, e.g. BLT `song` == 2. | Value |
| Priority (highest on → index) | The index of the highest input that is over half way up; later inputs win. | Input names |
| Latch (set / reset) | 1 from `set` until `reset`. | – |
| And (both signals) | Both signals multiplied: 1 only when both are on. | – |
| Not (1 − signal) | Flips on and off. | – |
| Counter (triggers → index) | Counts triggers into an index. | Max, every N triggers, at the end (stay, wrap, bounce, step forward and back) |

### Math

| Block | What it does | Key settings |
| --- | --- | --- |
| Constant (test value / pulse) | A fixed value for testing, optionally pulsing. | Type, value, pulse (Hz) |
| Level (RMS) | Audio loudness as a 0–1 signal. | Gain, attack, release |
| Steps (signal → index) | Cuts a 0–1 signal into N steps, e.g. a fader into a scene number. | Steps |
| Mix (crossfade a → b) | a × (1 − mix) + b × mix, for signals or colours. | Type |
| Combine (values → multichannel) | Bundles values of one type onto one wire. Wire into the open slot to add one. | Slot names |
| Split (multichannel → values) | Unbundles what a Combine bundled. | – |
| Pattern (fan-out) | Spreads one signal over N slots by a pattern (all, alternate, chase, outside in, fill…). | Slots, mode, advance (by step or on each trigger), every N, minimum |
| Range (signal × amount → window) | Squeezes a signal into a brightness window that widens with `amount`. | Tame min/max, wild min/max |
| Add (offset) | Adds an amount: index + 1 picks the next colour. | Amount |
| Colours (index → named colours) | A table of named colours, one column per index (e.g. per song or section). Double-click for the palette view. | Rows, steps |
| Values (index → named numbers) | The same for numbers, e.g. per-section minimums. | Rows, steps |
| Composite (your own block) | Double-click to build it from inputs, blocks and outputs inside. | – |

### Time

| Block | What it does | Key settings |
| --- | --- | --- |
| Fade (rise / fall time) | Ramps a signal: up over the rise time, down over the fall time. | Rise, fall, curve |
| Timer (0 → N over a time) | Counts from 0 to N over a set time: whole steps, the smooth value and progress. | Hours, minutes, seconds, count to, at the end |
| Drop (kick + beat → drop) | Fires when the kick returns after a quiet stretch. | Kick threshold, quiet beats, cooldown |
| Hold (trigger → N beats) | Holds 1 for N beats after a trigger. | Beats |
| Sequence (trigger → values) | Steps through a list of values on each trigger, e.g. sway left and right. | Values, unit, center |
| Looks (colour + window) | A list of looks (colour + brightness window), switched by index or trigger. | Looks, advance, every N |

## Scene tab

Scenes have the Logic, Math and Time tabs above, plus:

### Inputs

| Block | What it does |
| --- | --- |
| Signal, Index, Audio, Number, Colour, Multichannel | A value the scene takes from the show tab: one input port on the scene node, named after the block. |

### Outputs

| Block | What it does | Key settings |
| --- | --- | --- |
| *Type* out (Fixture out) | What this scene sends to every fixture patched to it. One per fixture type. | Channel sliders, stored positions |
| *Type* group out (Fixture group out) | N members with a pattern, per-member aims and positions, and a colour wipe. | Members, pattern, minimum, positions, wipe |
| Pixel out (LED tubes) | An effect for every LED tube patched to it. | Effect, colour, dimmer, position, width, speed, spread, runs along |
| Signal / Index / Number out | A value for an OSC out on the show tab's Outputs rail. | Type |

## Composite tab

Composites have the Logic, Math and Time tabs, plus **Inputs** (signal, index, number, colour, multichannel) and **Outputs** (the same types). Each becomes a port on the composite's node.
