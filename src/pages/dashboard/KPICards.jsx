import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus,
  IndianRupee, ShoppingCart, Users, Store, Truck,
  Ban, AlertTriangle, RefreshCw,
  DollarSign, UserPlus, Building2,
  CheckCircle, XCircle, Loader, Timer,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useNavigate } from 'react-router-dom'

const sparklineData = [
  { v: 30 }, { v: 45 }, { v: 38 }, { v: 52 }, { v: 48 }, { v: 65 }, { v: 58 },
  { v: 72 }, { v: 68 }, { v: 80 }, { v: 75 }, { v: 88 },
]

const Counter = ({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const startValue = useRef(0)

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0
    const startTime = Date.now()
    const startVal = startValue.current
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (numValue - startVal) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
      else setDisplay(numValue)
    }
    startValue.current = display
    requestAnimationFrame(animate)
  }, [value, duration, display])

  const formatted = display.toFixed(decimals)
  return <span ref={ref}>{prefix}{Number(formatted).toLocaleString()}{suffix}</span>
}

const Sparkline = ({ data = sparklineData, color = '#6366f1', height = 40 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#grad-${color.replace('#', '')})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
)

const TrendBadge = ({ value, inverse = false }) => {
  if (value === null || value === undefined || value === '-') return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (inverse) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
        num > 0 ? 'bg-red-50 text-red-600' : num < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
      }`}>
        {num > 0 ? <TrendingUp size={10} /> : num < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
        {Math.abs(num).toFixed(1)}%
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
      num > 0 ? 'bg-emerald-50 text-emerald-600' : num < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'
    }`}>
      {num > 0 ? <TrendingUp size={10} /> : num < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
      {Math.abs(num).toFixed(1)}%
    </span>
  )
}

const KPICard = ({ label, value, trend, comparison, icon: Icon, color = '#6366f1', bgLight = 'bg-indigo-50', link, sparklineColor, inverseTrend = false, loading = false, pulse = false }) => {
  const navigate = useNavigate()
  const colorHex = sparklineColor || color

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={() => link && navigate(link)}
      className={`relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden ${link ? 'cursor-pointer' : ''}`}
    >
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-60" />
          <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${bgLight} flex items-center justify-center shrink-0`}>
            <Icon size={18} style={{ color }} />
          </div>
          <Sparkline color={colorHex} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                <Counter value={value} />
              </span>
              {trend !== undefined && trend !== null && <TrendBadge value={trend} inverse={inverseTrend} />}
            </div>
          )}
          {comparison && (
            <p className="text-xs text-slate-400 font-medium">{comparison}</p>
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}40, ${color})` }} />
    </motion.div>
  )
}

const KPICards = ({ data, loading = false, restaurantAdmin = false }) => {
  const {
    totalEarnings = 0,
    todayEarnings = 0,
    weeklyRevenue = 0,
    monthlyRevenue = 0,
    totalOrders = 0,
    activeOrders = 0,
    cancelledOrders = 0,
    refundAmount = 0,
    totalCustomers = 0,
    newCustomers = 0,
    activeRestaurants = 0,
    pendingRestaurants = 0,
    onlineRestaurants = 0,
    deliveryExecutivesOnline = 0,
    avgDeliveryTime = 0,
    orderAcceptanceRate = 0,
    cancellationRate = 0,
    failedPayments = 0,
    refundRequests = 0,
    systemAlerts = 0,
  } = data || {}

  const revenueCards = [
    { label: 'Total Earnings', value: totalEarnings, trend: 18.2, comparison: 'vs last period', icon: IndianRupee, color: '#6366f1', bgLight: 'bg-indigo-50', link: '/analytics', sparklineColor: '#6366f1' },
    { label: "Today's Revenue", value: todayEarnings, trend: -2.4, comparison: 'vs yesterday', icon: DollarSign, color: '#10b981', bgLight: 'bg-emerald-50', link: '/analytics', sparklineColor: '#10b981', pulse: true },
    { label: 'Weekly Revenue', value: weeklyRevenue, trend: 12.8, comparison: 'vs last week', icon: TrendingUp, color: '#f59e0b', bgLight: 'bg-amber-50', link: '/analytics', sparklineColor: '#f59e0b' },
    { label: 'Monthly Revenue', value: monthlyRevenue, trend: 8.5, comparison: 'vs last month', icon: IndianRupee, color: '#8b5cf6', bgLight: 'bg-violet-50', link: '/analytics', sparklineColor: '#8b5cf6' },
    { label: 'Total Orders', value: totalOrders, trend: 15.3, comparison: 'vs last period', icon: ShoppingCart, color: '#3b82f6', bgLight: 'bg-blue-50', link: '/orders', sparklineColor: '#3b82f6' },
    { label: 'Active Orders', value: activeOrders, trend: 5.7, comparison: 'currently active', icon: Loader, color: '#f97316', bgLight: 'bg-orange-50', link: '/orders', sparklineColor: '#f97316', pulse: true },
    { label: 'Cancelled Orders', value: cancelledOrders, trend: -3.1, comparison: 'vs last period', icon: XCircle, color: '#ef4444', bgLight: 'bg-red-50', link: '/orders', sparklineColor: '#ef4444', inverseTrend: true },
    { label: 'Refund Amount', value: refundAmount, trend: -5.2, comparison: 'vs last period', icon: Ban, color: '#ec4899', bgLight: 'bg-pink-50', link: '/customers', sparklineColor: '#ec4899', inverseTrend: true },
  ]

  const userCards = [
    { label: 'Total Customers', value: totalCustomers, trend: 22.4, comparison: 'all time', icon: Users, color: '#6366f1', bgLight: 'bg-indigo-50', link: '/customers', sparklineColor: '#6366f1' },
    { label: 'New Customers', value: newCustomers, trend: 45.8, comparison: 'this period', icon: UserPlus, color: '#10b981', bgLight: 'bg-emerald-50', link: '/customers', sparklineColor: '#10b981', pulse: true },
    { label: 'Active Restaurants', value: activeRestaurants, trend: 8.1, comparison: 'currently active', icon: Store, color: '#3b82f6', bgLight: 'bg-blue-50', link: '/restaurants', sparklineColor: '#3b82f6' },
    { label: 'Pending Restaurants', value: pendingRestaurants, trend: -12.5, comparison: 'awaiting approval', icon: Building2, color: '#f59e0b', bgLight: 'bg-amber-50', link: '/restaurants', sparklineColor: '#f59e0b', inverseTrend: true },
    { label: 'Online Restaurants', value: onlineRestaurants, trend: 6.3, comparison: 'currently online', icon: CheckCircle, color: '#10b981', bgLight: 'bg-emerald-50', link: '/restaurants', sparklineColor: '#10b981', pulse: true },
    { label: 'Delivery Online', value: deliveryExecutivesOnline, trend: 4.7, comparison: 'on duty', icon: Truck, color: '#f97316', bgLight: 'bg-orange-50', link: '/delivery-partners', sparklineColor: '#f97316', pulse: true },
  ]

  const opsCards = [
    { label: 'Avg Delivery Time', value: avgDeliveryTime, trend: -8.3, comparison: 'vs last period', icon: Timer, color: '#6366f1', bgLight: 'bg-indigo-50', link: '/orders', sparklineColor: '#6366f1', suffix: ' min', inverseTrend: true },
    { label: 'Acceptance Rate', value: orderAcceptanceRate, trend: 3.2, comparison: 'vs last period', icon: CheckCircle, color: '#10b981', bgLight: 'bg-emerald-50', link: '/orders', sparklineColor: '#10b981', suffix: '%' },
    { label: 'Cancellation Rate', value: cancellationRate, trend: 2.1, comparison: 'vs last period', icon: Ban, color: '#ef4444', bgLight: 'bg-red-50', link: '/orders', sparklineColor: '#ef4444', suffix: '%', inverseTrend: true },
    { label: 'Failed Payments', value: failedPayments, trend: -15.7, comparison: 'vs last period', icon: AlertTriangle, color: '#f59e0b', bgLight: 'bg-amber-50', link: '/orders', sparklineColor: '#f59e0b', inverseTrend: true },
    { label: 'Refund Requests', value: refundRequests, trend: 11.4, comparison: 'vs last period', icon: RefreshCw, color: '#ec4899', bgLight: 'bg-pink-50', link: '/customers', sparklineColor: '#ec4899' },
    { label: 'System Alerts', value: systemAlerts, trend: -30.5, comparison: 'vs last period', icon: AlertTriangle, color: '#8b5cf6', bgLight: 'bg-violet-50', link: '/activity-log', sparklineColor: '#8b5cf6', inverseTrend: true },
  ]

  const section = (title, cards) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <KPICard key={i} {...card} loading={loading} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {!restaurantAdmin && section('Revenue & Orders', revenueCards)}
      {!restaurantAdmin && section('Users & Restaurants', userCards)}
      {section('Operational Health', opsCards)}
    </div>
  )
}

export default KPICards
