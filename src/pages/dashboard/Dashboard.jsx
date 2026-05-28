import { useState, useEffect, useCallback } from 'react'
import { DashboardProvider, useDashboard } from '../../context/DashboardContext'
import DashboardHeader from './DashboardHeader'
import KPICards from './KPICards'
import { RevenueChart, OrdersChart, CustomerGrowthChart, RestaurantChart, CuisineChart, DeliveryChart } from './DashboardCharts'
import ActivityFeed from './ActivityFeed'
import OperationalInsights from './OperationalInsights'
import {
  getCustomerStats, getAllDeliveryPartners, getOrderMonitoringStats,
  getAdminAnalytics, getAllOrders, getRestaurantAdminStats,
  getOrderStats, getRestaurantStats,
} from '../../services/api'
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth'
import {
  Store, Tag, Bell, FileText, Radio, Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const QuickActions = ({ isResAdmin }) => {
  const navigate = useNavigate()
  const actions = [
    { label: 'Add Restaurant', icon: Store, onClick: () => navigate('/menu/add'), color: 'text-indigo-600', bg: 'bg-indigo-100', show: !isResAdmin },
    { label: 'Add Offer', icon: Tag, onClick: () => navigate('/offers/create'), color: 'text-amber-600', bg: 'bg-amber-100', show: !isResAdmin },
    { label: 'Broadcast', icon: Bell, onClick: () => navigate('/activity-log'), color: 'text-purple-600', bg: 'bg-purple-100', show: !isResAdmin },
    { label: 'Live Orders', icon: Radio, onClick: () => navigate('/orders'), color: 'text-emerald-600', bg: 'bg-emerald-100', show: true },
    { label: 'Review Approvals', icon: FileText, onClick: () => navigate('/restaurants'), color: 'text-blue-600', bg: 'bg-blue-100', show: !isResAdmin },
    { label: 'Generate Report', icon: Plus, onClick: () => navigate('/analytics'), color: 'text-rose-600', bg: 'bg-rose-100', show: !isResAdmin },
  ].filter(a => a.show)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
      </div>
      <div className="p-4 space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
          >
            <div className={'w-9 h-9 rounded-xl ' + action.bg + ' flex items-center justify-center'}>
              <action.icon size={16} className={action.color} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const EarningsAnalytics = ({ data }) => {
  const navigate = useNavigate()
  const {
    todayEarnings = 0, yesterdayEarnings = 0,
    weeklyEarnings = 0, monthlyEarnings = 0, yearlyEarnings = 0,
    avgOrderValue = 0, projectedRevenue = 0,
  } = data || {}

  const earnings = [
    { label: "Today's Earnings", value: todayEarnings, change: todayEarnings - yesterdayEarnings, period: 'vs yesterday', color: '#6366f1' },
    { label: 'Yesterday', value: yesterdayEarnings, change: null, period: '', color: '#94a3b8' },
    { label: 'This Week', value: weeklyEarnings, change: 12.8, period: 'vs last week', color: '#10b981' },
    { label: 'This Month', value: monthlyEarnings, change: 8.5, period: 'vs last month', color: '#f59e0b' },
    { label: 'This Year', value: yearlyEarnings, change: 32.1, period: 'vs last year', color: '#8b5cf6' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Earnings Analytics</h3>
        <button onClick={() => navigate('/analytics')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">View Full Report</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
        {earnings.map((item, i) => (
          <div key={i} className="px-4 py-4 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-lg font-bold text-slate-900">{'\u20B9'}{Number(item.value).toLocaleString()}</p>
            {item.change !== null && (
              <p className={'text-[10px] font-semibold mt-0.5 ' + (item.change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {item.change >= 0 ? '\u2191' : '\u2193'} {Math.abs(item.change)}% {item.period}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Avg Order Value</p>
            <p className="text-sm font-bold text-slate-800">{'\u20B9'}{Number(avgOrderValue).toFixed(2)}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Projected Revenue</p>
            <p className="text-sm font-bold text-indigo-600">{'\u20B9'}{Number(projectedRevenue).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const transformOrdersToActivities = (orders) => {
  return orders.slice(0, 30).map(order => {
    const status = order.restaurantStatus || order.status || 'processing'
    let type = 'new_order'
    let title = 'Order #' + (order.orderId || '')
    let description = ''
    let priority = 'low'

    if (status === 'new' || status === 'pending') {
      type = 'new_order'
      description = 'New order received - ' + (order.restaurant_name || 'Unknown')
      priority = 'high'
    } else if (status === 'delivered') {
      type = 'order_delivered'
      description = 'Order successfully delivered'
    } else if (status === 'cancelled' || status === 'rejected') {
      type = 'order_cancelled'
      description = 'Order was ' + status
      priority = 'high'
    }

    return {
      id: order.orderId || order.id,
      type,
      title,
      description,
      timestamp: order.createdAt || order.time || new Date().toISOString(),
      amount: order.price || order.totalAmount || 0,
      orderId: order.orderId || order.id,
      priority,
    }
  })
}

const DashboardContent = () => {
  const resAdmin = isRestaurantAdmin()
  const ownRestaurantUid = getCurrentRestaurantUid()
  const { refreshKey, getDateParams } = useDashboard()

  const [kpiData, setKpiData] = useState({})
  const [activities, setActivities] = useState([])
  const [chartData, setChartData] = useState({})
  const [earningsData, setEarningsData] = useState({})
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  const orderBelongsToOwnRestaurant = useCallback((order) => {
    if (!resAdmin || !ownRestaurantUid) return true
    return (
      order.restaurant_uid === ownRestaurantUid ||
      order.restaurantUid === ownRestaurantUid ||
      order.restaurant_id === ownRestaurantUid ||
      order.restaurantId === ownRestaurantUid ||
      order.restaurant?.uid === ownRestaurantUid ||
      order.restaurant?.id === ownRestaurantUid
    )
  }, [resAdmin, ownRestaurantUid])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setLoadingActivities(true)

    const params = getDateParams()

    try {
      if (resAdmin && ownRestaurantUid) {
        const today = new Date().toISOString().split('T')[0]
        const [restRes, ordersRes] = await Promise.allSettled([
          getRestaurantAdminStats(ownRestaurantUid, { startDate: today, endDate: today }),
          getAllOrders({ limit: 30, restaurant_uid: ownRestaurantUid }),
        ])

        if (restRes.status === 'fulfilled') {
          const d = restRes.value.data?.data || {}
          setKpiData({
            totalEarnings: d.sales || 0,
            todayEarnings: d.sales || 0,
            weeklyRevenue: d.sales || 0,
            monthlyRevenue: d.sales || 0,
            totalOrders: d.orders || 0,
            activeOrders: d.orders || 0,
            cancelledOrders: 0,
            refundAmount: 0,
            totalCustomers: 0,
            newCustomers: 0,
            activeRestaurants: 1,
            pendingRestaurants: 0,
            onlineRestaurants: 1,
            deliveryExecutivesOnline: 0,
            avgDeliveryTime: 0,
            orderAcceptanceRate: 0,
            cancellationRate: 0,
            failedPayments: 0,
            refundRequests: 0,
            systemAlerts: 0,
          })
          setEarningsData({
            todayEarnings: d.sales || 0,
            yesterdayEarnings: 0,
            weeklyEarnings: d.sales || 0,
            monthlyEarnings: d.sales || 0,
            yearlyEarnings: d.sales || 0,
            avgOrderValue: d.avgOrderValue || 0,
            projectedRevenue: d.sales || 0,
          })
        }

        if (ordersRes.status === 'fulfilled') {
          const orders = (ordersRes.value.data || []).filter(orderBelongsToOwnRestaurant)
          setActivities(transformOrdersToActivities(orders))
        }
      } else {
        const [
          customersRes, partnersRes, ordersRes,
          revenueRes, orderStatsRes, restaurantStatsRes,
          recentOrdersRes,
        ] = await Promise.allSettled([
          getCustomerStats(),
          getAllDeliveryPartners(),
          getOrderMonitoringStats(),
          getAdminAnalytics(params.period || 'last7days'),
          getOrderStats(),
          getRestaurantStats(),
          getAllOrders({ limit: 50 }),
        ])

        const totalCustomers = customersRes.status === 'fulfilled' ? (customersRes.value.data?.data?.total || 0) : 0
        const activeOrders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data?.active || 0) : 0
        const partners = partnersRes.status === 'fulfilled' ? (partnersRes.value.data?.data || []) : []
        const revenue = revenueRes.status === 'fulfilled' ? revenueRes.value.data : {}
        const orderStats = orderStatsRes.status === 'fulfilled' ? orderStatsRes.value.data : {}
        const restaurantStats = restaurantStatsRes.status === 'fulfilled' ? restaurantStatsRes.value.data?.data || restaurantStatsRes.value.data || {} : {}

        setKpiData({
          totalEarnings: revenue.totalRevenue || 0,
          todayEarnings: revenue.todayRevenue || Math.round((revenue.totalRevenue || 0) / 7),
          weeklyRevenue: revenue.totalRevenue || 0,
          monthlyRevenue: revenue.monthlyRevenue || Math.round((revenue.totalRevenue || 0) * 4),
          totalOrders: orderStats.total || revenue.totalOrders || 0,
          activeOrders,
          cancelledOrders: orderStats.cancelled || 0,
          refundAmount: revenue.refundAmount || 0,
          totalCustomers,
          newCustomers: revenue.newCustomers || Math.round(totalCustomers * 0.15),
          activeRestaurants: restaurantStats.activeCount || restaurantStats.active || 0,
          pendingRestaurants: restaurantStats.pendingCount || 0,
          onlineRestaurants: restaurantStats.activeCount || restaurantStats.active || 0,
          deliveryExecutivesOnline: Array.isArray(partners) ? partners.filter(p => p.isActive || p.is_online).length : 0,
          avgDeliveryTime: 28,
          orderAcceptanceRate: 92,
          cancellationRate: orderStats.cancelled && orderStats.total ? Math.round((orderStats.cancelled / orderStats.total) * 100) : 5,
          failedPayments: revenue.failedPayments || 2,
          refundRequests: revenue.refundRequests || 3,
          systemAlerts: 1,
        })

        setEarningsData({
          todayEarnings: revenue.todayRevenue || Math.round((revenue.totalRevenue || 0) / 7),
          yesterdayEarnings: revenue.yesterdayRevenue || Math.round((revenue.totalRevenue || 0) / 8),
          weeklyEarnings: revenue.totalRevenue || 0,
          monthlyEarnings: revenue.monthlyRevenue || Math.round((revenue.totalRevenue || 0) * 4),
          yearlyEarnings: revenue.yearlyRevenue || Math.round((revenue.totalRevenue || 0) * 52),
          avgOrderValue: revenue.avgOrderValue || 420,
          projectedRevenue: Math.round((revenue.totalRevenue || 0) * 1.18),
        })

        if (recentOrdersRes.status === 'fulfilled') {
          const orders = (recentOrdersRes.value.data || []).filter(orderBelongsToOwnRestaurant)
          setActivities(transformOrdersToActivities(orders))
        }

        setChartData({
          revenue: revenue.dailySalesData || [],
          orders: revenue.hourlyData || [],
          customers: revenue.customerGrowthData || [],
          restaurants: revenue.topRestaurantsData || [],
          cuisine: revenue.cuisineData || [],
          delivery: revenue.deliveryData || [],
        })

        setInsights(revenue.insights || [])
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    } finally {
      setLoading(false)
      setLoadingActivities(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resAdmin, ownRestaurantUid, orderBelongsToOwnRestaurant, getDateParams, refreshKey])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true)
    try {
      const fetchParams = { limit: 30 }
      if (resAdmin && ownRestaurantUid) fetchParams.restaurant_uid = ownRestaurantUid
      const res = await getAllOrders(fetchParams)
      const orders = (res.data || []).filter(orderBelongsToOwnRestaurant)
      setActivities(transformOrdersToActivities(orders))
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }, [resAdmin, ownRestaurantUid, orderBelongsToOwnRestaurant])

  const userName = resAdmin ? 'Restaurant Admin' : 'Admin'

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div id="dashboard-content" className="p-4 sm:p-6 lg:p-8 space-y-6">
        <DashboardHeader userName={userName} />
        <KPICards data={kpiData} loading={loading} restaurantAdmin={resAdmin} />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <RevenueChart data={chartData.revenue} />
          <OrdersChart data={chartData.orders} />
          <CustomerGrowthChart data={chartData.customers} />
          <RestaurantChart data={chartData.restaurants} />
          <CuisineChart data={chartData.cuisine} />
          <DeliveryChart data={chartData.delivery} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <EarningsAnalytics data={earningsData} />
            <ActivityFeed
              activities={activities}
              onRefresh={fetchActivities}
              loading={loadingActivities}
            />
          </div>
          <div className="space-y-4">
            <OperationalInsights insights={insights} />
            <QuickActions isResAdmin={resAdmin} />
          </div>
        </div>
      </div>
    </div>
  )
}

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}

export default Dashboard
