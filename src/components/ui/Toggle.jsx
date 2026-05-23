import { motion } from 'framer-motion'

const Toggle = ({ enabled, onChange, disabled = false, size = 'md' }) => {
  const sizes = {
    sm: { width: 'w-8', height: 'h-4', dot: 'w-3 h-3', translate: 'translate-x-4' },
    md: { width: 'w-10', height: 'h-5', dot: 'w-4 h-4', translate: 'translate-x-5' },
  }
  const s = sizes[size] || sizes.md

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`${s.width} ${s.height} relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`${s.dot} bg-white rounded-full shadow-sm transform ${enabled ? s.translate : 'translate-x-0.5'}`}
      />
    </button>
  )
}

export default Toggle
