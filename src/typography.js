// Font, size, spacing and column width. Presets map to font stacks; any other
// name is an installed font, with Lato behind it as a fallback.
export const PRESETS = [
  { name: 'Lato', hint: 'Default', stack: "'Lato', -apple-system, sans-serif" },
  { name: 'Georgia', hint: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
  { name: 'SF Mono', hint: 'Mono', stack: "ui-monospace, 'SF Mono', Menlo, monospace", scale: 0.9 },
  { name: 'System', hint: 'San Francisco', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
]

// Names the old bottom-bar buttons saved.
const LEGACY = { Arial: 'Arial', Serif: 'Georgia' }

export const SIZE_MIN = 14
export const SIZE_MAX = 32
export const SPACING = { tight: { leading: 1.35, pad: 4 }, normal: { leading: 1.55, pad: 7 }, airy: { leading: 1.85, pad: 11 } }
export const WIDTH = { narrow: 540, medium: 650, wide: 820 }

export const fontName = (font) => LEGACY[font] || font || 'Lato'

export function fontStack(font) {
  const name = fontName(font)
  const preset = PRESETS.find((p) => p.name === name)
  return preset ? preset.stack : `"${name.replace(/"/g, '')}", 'Lato', -apple-system, sans-serif`
}

export function applyTypography(settings, root = document.documentElement) {
  const spacing = SPACING[settings.spacing] || SPACING.normal
  root.style.setProperty('--font', fontStack(settings.font))
  root.style.setProperty('--size', settings.fontSize + 'px')
  root.style.setProperty('--leading', spacing.leading)
  root.style.setProperty('--row-pad', spacing.pad + 'px')
  root.style.setProperty('--width', (WIDTH[settings.width] || WIDTH.medium) + 'px')
}

// Installed font families, via Chromium's Local Font Access API. Loaded once.
let installed = null
export async function installedFonts() {
  if (installed) return installed
  try {
    const fonts = await window.queryLocalFonts()
    installed = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b))
  } catch {
    installed = []
  }
  return installed
}
