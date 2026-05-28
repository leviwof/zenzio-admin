import { motion } from 'framer-motion'
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle,
  Clock, Users, DollarSign, ShoppingCart,
} from 'lucide-react'

const insightIcons = {
  revenue: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  orders: { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
  customers: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  alert: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  trend_up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  trend_down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
  time: { icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
}

const defaultInsights = [
  {
    id: 1,
    category: 'revenue',
    message: 'Revenue increased 18% this week compared to last week',
    type: 'trend_up',
    severity: 'positive',
    actionable: true,
  },
  {
    id: 2,
    category: 'orders',
    message: 'Order cancellations increased 12% today - review restaurant fulfillment',
    type: 'trend_down',
    severity: 'warning',
    actionable: true,
  },
  {
    id: 3,
    category: 'time',
    message: 'Peak traffic between 7PM - 9PM. Ensure adequate delivery executive coverage',
    type: 'time',
    severity: 'info',
    actionable: false,
  },
  {
    id: 4,
    category: 'customers',
    message: 'New customer registrations up 45% - consider running a referral campaign',
    type: 'customers',
    severity: 'positive',
    actionable: true,
  },
  {
    id: 5,
    category: 'alert',
    message: 'Restaurant "Tandoori Palace" has unusually high delivery delays',
    type: 'alert',
    severity: 'warning',
    actionable: true,
  },
  {
    id: 6,
    category: 'revenue',
    message: 'Average order value increased to ₹420 - premium dishes performing well',
    type: 'revenue',
    severity: 'positive',
    actionable: false,
  },
]

const severityStyles = {
  positive: 'border-l-emerald-500 bg-emerald-50/50',
  warning: 'border-l-amber-500 bg-amber-50/50',
  info: 'border-l-blue-500 bg-blue-50/50',
  critical: 'border-l-red-500 bg-red-50/50',
}

const OperationalInsights = ({ insights = defaultInsights }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Lightbulb size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-slate-800">Operational Insights</h3>
        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full">
          AI Powered
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {insights.map((insight, i) => {
          const meta = insightIcons[insight.type] || { icon: Lightbulb, color: 'text-slate-500', bg: 'bg-slate-100' }
          const Icon = meta.icon
          const severity = severityStyles[insight.severity] || severityStyles.info
          return (
            <motion.div
              key={insight.id || i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-3 px-5 py-3.5 border-l-[3px] ${severity} hover:bg-slate-50 transition-colors group`}
            >
              <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                <Icon size={14} className={meta.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed text-slate-700">{insight.message}</p>
                {insight.actionable && (
                  <button className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Take action →
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default OperationalInsights
