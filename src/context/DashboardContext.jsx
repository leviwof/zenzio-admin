import { createContext, useContext, useState, useCallback } from 'react'

const DashboardContext = createContext(null)

const DATE_RANGES = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  thismonth: 'This Month',
  lastmonth: 'Last Month',
}

const QUICK_ANALYTICS = ['day', 'week', 'month', 'year']

export const DashboardProvider = ({ children }) => {
  const [dateRange, setDateRange] = useState('last7days')
  const [quickAnalytics, setQuickAnalytics] = useState('week')
  const [customDateRange, setCustomDateRange] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    restaurant: null,
    city: null,
    cuisine: null,
    orderType: null,
    paymentStatus: null,
    deliveryStatus: null,
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const updateDateRange = useCallback((range) => {
    setDateRange(range)
    if (range !== 'custom') setCustomDateRange(null)
  }, [])

  const updateQuickAnalytics = useCallback((period) => {
    setQuickAnalytics(period)
  }, [])

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      restaurant: null,
      city: null,
      cuisine: null,
      orderType: null,
      paymentStatus: null,
      deliveryStatus: null,
    })
  }, [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    await new Promise(r => setTimeout(r, 300))
    setIsRefreshing(false)
  }, [])

  const getDateParams = useCallback(() => {
    if (dateRange === 'custom' && customDateRange) {
      return { startDate: customDateRange.start, endDate: customDateRange.end }
    }
    return { period: dateRange }
  }, [dateRange, customDateRange])

  return (
    <DashboardContext.Provider
      value={{
        dateRange,
        quickAnalytics,
        customDateRange,
        isRefreshing,
        filters,
        refreshKey,
        DATE_RANGES,
        QUICK_ANALYTICS,
        setDateRange: updateDateRange,
        setQuickAnalytics: updateQuickAnalytics,
        setCustomDateRange,
        setFilters: updateFilter,
        resetFilters,
        refresh,
        getDateParams,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export const useDashboard = () => {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    return {
      dateRange: 'last7days',
      quickAnalytics: 'week',
      customDateRange: null,
      isRefreshing: false,
      filters: {},
      refreshKey: 0,
      DATE_RANGES: {},
      QUICK_ANALYTICS: [],
      setDateRange: () => {},
      setQuickAnalytics: () => {},
      setCustomDateRange: () => {},
      setFilters: () => {},
      resetFilters: () => {},
      refresh: () => {},
      getDateParams: () => ({}),
    }
  }
  return ctx
}

export default DashboardContext
