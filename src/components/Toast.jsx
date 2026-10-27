import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className="toast"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          >
            {toast.text}
            {toast.action && (
              <button type="button" onClick={() => { toast.onAction(); onClose() }}>
                {toast.action}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
