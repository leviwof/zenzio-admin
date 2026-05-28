import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart,
} from 'recharts'
import {
  Maximize2, Minimize2,
} from 'lucide-react'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold text-slate-800">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const ChartCard = ({ title, subtitle, children, className = '' }) => {
  const [expanded, setExpanded] = useState(false)
  const baseClass = 'bg-white rounded-2xl border border-slate-200/70 shadow-sm'
  const spanClass = expanded ? 'col-span-full' : ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={[baseClass, spanClass, className].filter(Boolean).join(' ')}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <div className="p-5">
        <div className={expanded ? 'h-[400px]' : 'h-[260px]'}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

export const RevenueChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { day: 'Mon', revenue: 12500, orders: 145, target: 11000 },
    { day: 'Tue', revenue: 18200, orders: 168, target: 11000 },
    { day: 'Wed', revenue: 15800, orders: 152, target: 11000 },
    { day: 'Thu', revenue: 22400, orders: 189, target: 11000 },
    { day: 'Fri', revenue: 19800, orders: 175, target: 11000 },
    { day: 'Sat', revenue: 26500, orders: 210, target: 11000 },
    { day: 'Sun', revenue: 21200, orders: 178, target: 11000 },
  ]
  return (
    <ChartCard title="Revenue Analytics" subtitle="Daily revenue trend with target comparison">
      <ComposedChart data={chartData}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="target" stroke="#e2e8f0" strokeDasharray="4 4" fill="none" name="Target" />
        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
        <Bar dataKey="orders" fill="#6366f1" opacity={0.08} name="Orders" />
      </ComposedChart>
    </ChartCard>
  )
}

export const OrdersChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { hour: '6AM', completed: 12, cancelled: 2 },
    { hour: '8AM', completed: 28, cancelled: 3 },
    { hour: '10AM', completed: 45, cancelled: 5 },
    { hour: '12PM', completed: 82, cancelled: 8 },
    { hour: '2PM', completed: 65, cancelled: 6 },
    { hour: '4PM', completed: 48, cancelled: 4 },
    { hour: '6PM', completed: 95, cancelled: 10 },
    { hour: '8PM', completed: 120, cancelled: 12 },
    { hour: '10PM', completed: 88, cancelled: 7 },
    { hour: '12AM', completed: 35, cancelled: 3 },
  ]
  return (
    <ChartCard title="Orders Analytics" subtitle="Completed vs Cancelled - Hourly activity">
      <BarChart data={chartData} barGap={4} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
        <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
        <Bar dataKey="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
      </BarChart>
    </ChartCard>
  )
}

export const CustomerGrowthChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { month: 'Jan', new: 420, retention: 82 },
    { month: 'Feb', new: 580, retention: 85 },
    { month: 'Mar', new: 750, retention: 79 },
    { month: 'Apr', new: 620, retention: 88 },
    { month: 'May', new: 890, retention: 84 },
    { month: 'Jun', new: 1020, retention: 91 },
  ]
  return (
    <ChartCard title="Customer Growth" subtitle="New users and retention trend">
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
        <Bar yAxisId="left" dataKey="new" fill="#6366f1" radius={[4, 4, 0, 0]} name="New Users" />
        <Line yAxisId="right" type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Retention %" />
      </ComposedChart>
    </ChartCard>
  )
}

export const RestaurantChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { name: 'Tandoori Palace', revenue: 125000, orders: 890 },
    { name: 'Pizza Hub', revenue: 98000, orders: 720 },
    { name: 'Sushi World', revenue: 85000, orders: 550 },
    { name: 'Burger Barn', revenue: 72000, orders: 630 },
    { name: 'Curry House', revenue: 65000, orders: 480 },
  ]
  return (
    <ChartCard title="Restaurant Analytics" subtitle="Top performing restaurants by revenue">
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} name="Revenue" />
      </BarChart>
    </ChartCard>
  )
}

export const CuisineChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { name: 'Indian', value: 35 },
    { name: 'Chinese', value: 22 },
    { name: 'Italian', value: 18 },
    { name: 'Continental', value: 15 },
    { name: 'Mexican', value: 10 },
  ]
  return (
    <ChartCard title="Cuisine Analytics" subtitle="Top cuisines by order volume">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ChartCard>
  )
}

export const DeliveryChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { day: 'Mon', avgTime: 28, active: 45, delayed: 3 },
    { day: 'Tue', avgTime: 32, active: 48, delayed: 5 },
    { day: 'Wed', avgTime: 26, active: 52, delayed: 2 },
    { day: 'Thu', avgTime: 30, active: 50, delayed: 4 },
    { day: 'Fri', avgTime: 35, active: 55, delayed: 7 },
    { day: 'Sat', avgTime: 38, active: 60, delayed: 9 },
    { day: 'Sun', avgTime: 29, active: 47, delayed: 4 },
  ]
  return (
    <ChartCard title="Delivery Analytics" subtitle="Average delivery time and active executives">
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
        <Bar yAxisId="right" dataKey="active" fill="#6366f1" opacity={0.1} radius={[4, 4, 0, 0]} name="Active Executives" />
        <Line yAxisId="left" type="monotone" dataKey="avgTime" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Avg Time (min)" />
        <Line yAxisId="left" type="monotone" dataKey="delayed" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Delayed" />
      </ComposedChart>
    </ChartCard>
  )
}
