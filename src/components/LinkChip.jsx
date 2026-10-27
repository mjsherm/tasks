import React from 'react'
import { ICONS, openLink } from '../links.js'

export function ServiceIcon({ service, size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={ICONS[service]} />
    </svg>
  )
}

// A small grey logo (and optional label) that opens the link.
export default function LinkChip({ href, service, label, showLabel }) {
  return (
    <a
      className={'chip' + (showLabel ? ' has-label' : '')}
      href={href}
      title={href}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openLink(href)
      }}
    >
      {service && <ServiceIcon service={service} />}
      {(showLabel || !service) && <span>{label}</span>}
    </a>
  )
}
