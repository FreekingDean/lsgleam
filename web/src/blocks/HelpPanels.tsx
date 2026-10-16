export const LatchPanel = () => <div className="help">1 from a rising edge on set until reset goes high. Song match sets it, the drop resets it: that's "primed".</div>
export const NotPanel = () => <div className="help">1 − the signal, clamped 0–1. For precedence: season `on` = Not(battle) × Not(drop) (two Nots into an And), drop `on` = drop × Not(battle), battle `on` = battle.</div>
export const AndPanel = () => <div className="help">Multiplies the two signals, so it's 1 only while both are on. Drop × primed is "an accepted drop".</div>
