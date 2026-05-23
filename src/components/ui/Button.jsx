import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md',
  ghost: 'text-gray-700 hover:bg-gray-100',
  outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, loading = false, disabled = false, className = '', onClick, type = 'button', ...props }) => {
  return (
    <motion.button
      type={type}
      whileHover={!disabled && !loading ? { scale: 1.01 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 active:scale-[0.98] ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </motion.button>
  )
}

export default Button
