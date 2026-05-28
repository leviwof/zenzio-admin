import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, Store, CreditCard, Users, Activity,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ArrowRight, Bell, DollarSign, UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'restaurants', label: 'Restaurants', icon: Store },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'system', label: 'System', icon: Activity },
]

const getEventMeta = (type) => {
  switch (type) {
    case 'new_order': return { icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-l-emerald-500', label: 'New Order' }
    case 'order_delivered': return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-l-emerald-500', label: 'Delivered' }
    case 'order_cancelled': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', border: 'border-l-red-400', label: 'Cancelled' }
    case 'refund': return { icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-100', border: 'border-l-purple-400', label: 'Refund' }
    case 'payment_failed': return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-l-amber-400', label: 'Payment Failed' }
    case 'restaurant_online': return { icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-l-emerald-500', label: 'Restaurant Online' }
    case 'restaurant_pending': return { icon: Store, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-l-amber-400', label: 'Pending Approval' }
    case 'new_customer': return { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-l-blue-400', label: 'New Customer' }
    default: return { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-l-slate-300', label: 'Update' }
  }
}

const priorityIndicator = (priority) => {
  if (!priority) return null
  const color = priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
  return <span className={'w-1.5 h-1.5 rounded-full ' + color} />
}

const getTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const EventItem = ({ event, onClick }) => {
  const meta = getEventMeta(event.type)
  const Icon = meta.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick && onClick(event)}
      className={'flex items-start gap-3 px-4 py-3 border-l-[3px] ' + meta.border + ' hover:bg-slate-50 transition-colors cursor-pointer group'}
    >
      <div className={'w-8 h-8 rounded-xl ' + meta.bg + ' flex items-center justify-center shrink-0'}>
        <Icon size={15} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">{event.title}</p>
          {priorityIndicator(event.priority)}
        </div>
        {event.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-medium text-slate-400">{getTimeAgo(event.timestamp)}</span>
          {event.amount && (
            <span className="text-[10px] font-semibold text-slate-600">{'\u20B9'}{event.amount.toLocaleString()}</span>
          )}
          {event.orderId && (
            <span className="text-[10px] font-mono font-bold text-indigo-500">{'#'}{event.orderId}</span>
          )}
        </div>
      </div>
      <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 mt-2 shrink-0 transition-colors" />
    </motion.div>
  )
}

const ActivityFeed = ({ activities = [], onRefresh, loading = false }) => {
  const [activeTab, setActiveTab] = useState('orders')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (autoRefresh && onRefresh) {
      intervalRef.current = setInterval(onRefresh, 30000)
      return () => clearInterval(intervalRef.current)
    }
  }, [autoRefresh, onRefresh])

  const filtered = activities.filter(a => {
    if (activeTab === 'orders') return ['new_order', 'order_delivered', 'order_cancelled'].includes(a.type)
    if (activeTab === 'restaurants') return ['restaurant_online', 'restaurant_pending'].includes(a.type)
    if (activeTab === 'payments') return ['refund', 'payment_failed'].includes(a.type)
    if (activeTab === 'customers') return ['new_customer'].includes(a.type)
    return true
  })

  const navigate = useNavigate()
  const handleClick = (event) => {
    if (event.orderId) navigate('/orders/' + event.orderId)
    else if (event.restaurantId) navigate('/restaurants/' + event.restaurantId)
    else if (event.customerId) navigate('/customers/' + event.customerId)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800">Live Activity</h3>
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute rounded-full bg-emerald-400 opacity-60" />
            <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="w-3 h-3 rounded border-slate-300 text-indigo-500"
            />
            Auto
          </label>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-100 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ' + (activeTab === tab.key ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <RefreshCw size={24} className="text-indigo-300 animate-spin mb-3" />
            <p className="text-sm text-slate-400 font-medium">Loading activity...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Activity size={24} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-400 font-medium">No activity in this category</p>
            <p className="text-xs text-slate-300 mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.slice(0, 20).map((event, i) => (
              <EventItem key={event.id || i} event={event} onClick={handleClick} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default ActivityFeed
