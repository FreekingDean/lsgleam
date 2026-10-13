import type { BltBlock } from './show'

export function bltExpressions(b: BltBlock, prefix = '(str "/blt/" device-number "/")') {
  const songs = JSON.stringify(b.songs.map((s) => s.toLowerCase()))
  return {
    setup: `(swap! globals assoc :lsgleam (osc/osc-client "localhost" ${b.port}))`,
    shutdown: `(osc/osc-close (:lsgleam @globals))`,
    tracked: `(let [c (:lsgleam @globals) p ${prefix}]
  (osc/osc-send c (str p "playing") (if playing? 1 0))
  (osc/osc-send c (str p "onair") (if on-air? 1 0))
  (osc/osc-send c (str p "master") (if tempo-master? 1 0))
  (osc/osc-send c (str p "bpm") effective-tempo)
  (osc/osc-send c (str p "pitch") pitch-multiplier)
  (when (and track-time-reached track-length (pos? track-length))
    (osc/osc-send c (str p "progress") (/ track-time-reached (* 1000.0 track-length))))
  (let [i (.indexOf ${songs} (.toLowerCase (or track-title "")))]
    (when (>= i 0) (osc/osc-send c (str p "song") i))))`,
    beat: `(osc/osc-send (:lsgleam @globals) (str ${prefix} "beat") beat-within-bar)`,
  }
}

const edn = (s: string) => JSON.stringify(s)

export function bltConfig(b: BltBlock) {
  const e = bltExpressions(b)
  const trigger = (number: number, comment: string, x: ReturnType<typeof bltExpressions>) => `  {:players #beat_link_trigger.util.PlayerChoice{:number ${number}}
   :comment ${edn(comment)}
   :enabled "Always"
   :message "Custom"
   :note 127 :channel 1 :send true :bar true :start-stop false :stop true
   :expressions {:tracked ${edn(x.tracked)}
                 :beat ${edn(x.beat)}}}`
  const triggers = [
    ...(b.master ? [trigger(0, 'lsgleam master', bltExpressions(b, '"/blt/master/"'))] : []),
    ...Array.from({ length: b.decks }, (_, i) => trigger(i + 1, `lsgleam deck ${i + 1}`, e)),
  ]
  return `{:beat-link-trigger-version "8.0.0"
 :triggers [
${triggers.join('\n')}
 ]
 :expressions {:setup ${edn(e.setup)}
               :shutdown ${edn(e.shutdown)}}}
`
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}
