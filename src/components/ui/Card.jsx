import { motion } from 'framer-motion'

const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${hover ? 'cursor-pointer hover:shadow-md hover:border-gray-200' : ''} transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
)

export const CardHeader = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-gray-50 ${className}`}>{children}</div>
)

export default Card
