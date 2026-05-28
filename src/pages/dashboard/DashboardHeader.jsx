import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Download, Calendar, ChevronDown,
  TrendingUp, Clock, FilterX,
} from 'lucide-react'
import { useDashboard } from '../../context/DashboardContext'
import { useOrderNotifications } from '../../context/OrderNotificationContext'

const HeaderClock = () => {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Clock size={14} className="text-slate-400" />
      <span className="font-medium tabular-nums">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </span>
      <span className="text-slate-300 hidden sm:inline">|</span>
      <span className="text-slate-400 text-xs hidden sm:block">
        {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  )
}

const DateRangeDropdown = () => {
  const { dateRange, setDateRange, DATE_RANGES, setCustomDateRange } = useDashboard()
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all"
      >
        <Calendar size={15} className="text-slate-400" />
        <span>{DATE_RANGES[dateRange] || 'Select Range'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 overflow-hidden"
          >
            {Object.entries(DATE_RANGES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setDateRange(key); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  dateRange === key
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => setCustomOpen(!customOpen)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  dateRange === 'custom' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Custom Range
              </button>
              {customOpen && (
                <div className="px-3 pb-3 space-y-2">
                  <input
                    type="date"
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="date"
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    onClick={() => { setDateRange('custom'); setOpen(false); setCustomOpen(false) }}
                    className="w-full py-1.5 bg-indigo-500 text-white text-xs rounded-lg font-medium hover:bg-indigo-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const QuickAnalyticsToggle = () => {
  const { quickAnalytics, setQuickAnalytics } = useDashboard()
  const options = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ]
  return (
    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => setQuickAnalytics(opt.key)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            quickAnalytics === opt.key
              ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const QuickFilterChips = () => {
  const { dateRange, setDateRange } = useDashboard()
  const chips = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7days', label: 'Last 7 Days' },
    { key: 'last30days', label: 'Last 30 Days' },
  ]
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => setDateRange(chip.key)}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
            dateRange === chip.key
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

const DashboardHeader = ({ userName = 'Admin' }) => {
  const { refresh, isRefreshing, resetFilters } = useDashboard()
  const { unreadOrderCount } = useOrderNotifications()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  const handleExport = () => {
    const element = document.getElementById('dashboard-content')
    if (!element) return
    import('file-saver').then(({ saveAs }) => {
      import('html2canvas').then((html2canvas) => {
        html2canvas.default(element).then((canvas) => {
          canvas.toBlob((blob) => {
            saveAs(blob, 'dashboard-report.png')
          })
        })
      })
    }).catch(() => {
      alert('Export requires file-saver and html2canvas')
    })
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
              Here's your business overview
              {unreadOrderCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {unreadOrderCount} new {unreadOrderCount === 1 ? 'order' : 'orders'}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* <HeaderClock /> */}
          <QuickAnalyticsToggle />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <DateRangeDropdown />
          <QuickFilterChips />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <FilterX size={13} />
            Clear
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-60 transition-all shadow-sm shadow-indigo-200"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader
