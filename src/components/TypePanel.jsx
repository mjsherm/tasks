import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { PRESETS, SIZE_MIN, SIZE_MAX, fontName, fontStack, installedFonts } from '../typography.js'

function Segmented({ value, options, onChange }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([key, label]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} className={value === key ? 'is-on' : ''} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}

// The Type panel that opens from the bottom bar. Every change applies (and
// saves) immediately, so the page behind it is the preview.
export default function TypePanel({ settings, set, onClose }) {
  const panel = useRef(null)
  const [query, setQuery] = useState('')
  const [families, setFamilies] = useState([])
  const current = fontName(settings.font)

  useEffect(() => {
    const away = (e) => { if (!panel.current?.contains(e.target) && !e.target.closest?.('.type-toggle')) onClose() }
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('pointerdown', away, true)
    window.addEventListener('keydown', esc, true)
    return () => {
      window.removeEventListener('pointerdown', away, true)
      window.removeEventListener('keydown', esc, true)
    }
  }, [onClose])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return families.filter((f) => f.toLowerCase().includes(q)).slice(0, 6)
  }, [query, families])

  const isPreset = PRESETS.some((p) => p.name === current)
  const pickFont = (name) => { set('font', name); setQuery('') }

  return (
    <motion.div
      ref={panel}
      className="slash-menu type-panel"
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 600, damping: 38 }}
    >
      <div className="type-group">
        <div className="type-label">Size <b>{settings.fontSize}px</b></div>
        <input
          type="range"
          className="type-range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={1}
          value={settings.fontSize}
          style={{ '--fill': `${((settings.fontSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100}%` }}
          onChange={(e) => set('fontSize', Number(e.target.value))}
        />
        <div className="type-ticks"><span>{SIZE_MIN}</span><span>{SIZE_MAX}</span></div>
      </div>

      <div className="type-group">
        <div className="type-label">Font</div>
        <div className="type-fonts">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" className={'type-font' + (current === p.name ? ' is-on' : '')} style={{ fontFamily: p.stack, fontSize: 16 * (p.scale || 1) }} onClick={() => pickFont(p.name)}>
              <span>{p.name}</span><span className="type-hint">{p.hint}</span>
            </button>
          ))}
          {!isPreset && (
            <button type="button" className="type-font is-on" style={{ fontFamily: fontStack(current) }}>
              <span>{current}</span><span className="type-hint">Installed</span>
            </button>
          )}
        </div>
        <input
          className="type-search"
          placeholder="Any font on your Mac…"
          value={query}
          onFocus={() => installedFonts().then(setFamilies)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) pickFont(matches[0] || query.trim())
          }}
        />
        {matches.length > 0 && (
          <div className="type-fonts results">
            {matches.map((f) => (
              <button key={f} type="button" className="type-font" style={{ fontFamily: `"${f}"` }} onClick={() => pickFont(f)}>
                <span>{f}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="type-group">
        <div className="type-label">Spacing</div>
        <Segmented value={settings.spacing} options={[['tight', 'Tight'], ['normal', 'Normal'], ['airy', 'Airy']]} onChange={(v) => set('spacing', v)} />
      </div>
      <div className="type-group last">
        <div className="type-label">Width</div>
        <Segmented value={settings.width} options={[['narrow', 'Narrow'], ['medium', 'Medium'], ['wide', 'Wide']]} onChange={(v) => set('width', v)} />
      </div>
    </motion.div>
  )
}
