import React from 'react'
import { motion } from 'motion/react'

export default function Checkbox({ checked, onToggle, size = 20 }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={'check' + (checked ? ' is-checked' : '')}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 20 20" width={size} height={size}>
        <circle className="check-ring" cx="10" cy="10" r="8.5" />
        <motion.path
          className="check-mark"
          d="M6.2 10.4l2.6 2.6 5-5.4"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: checked ? 0.05 : 0 }}
        />
      </svg>
    </motion.button>
  )
}
