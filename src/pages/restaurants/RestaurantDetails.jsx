import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Building2, Download, IndianRupee,
  ShoppingBag, Calendar, Tag, Copy, Check, ChevronDown, ChevronUp,
  Clock, MapPin, Sun, Coffee, UtensilsCrossed, Moon,
  Upload, FileText, X, AlertTriangle, ExternalLink,
  Activity, Power, Save,
  Zap, AlertCircle, CheckCircle, XCircle, Info, EyeOff
} from 'lucide-react'
import {
  getRestaurantById, toggleRestaurantActive, toggleRestaurantOff,
  getRestaurantAdminStats, updateRestaurantProfileAdmin,
  updateRestaurantAddressAdmin, uploadRestaurantLogoAdmin,
  uploadRestaurantDocumentFileAdmin,
  deleteRestaurantDocumentAdmin, deleteRestaurantDocumentFileAdmin,
  updateRestaurantOperationalHours
} from '../../services/api'
import { getRestaurantImageUrl, getRestaurantLogoUrl } from '../../utils/imageUtils'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth'
import Card, { CardContent, CardHeader } from '../../components/ui/Card'
import Toggle from '../../components/ui/Toggle'
import TimePicker from '../../components/ui/TimePicker'
import Button from '../../components/ui/Button'
import { SkeletonCard } from '../../components/ui/Skeleton'

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'amber', time: { start: '07:00', end: '11:00' } },
  { id: 'lunch', label: 'Lunch', icon: Sun, color: 'orange', time: { start: '12:00', end: '15:00' } },
  { id: 'snacks', label: 'Snacks', icon: UtensilsCrossed, color: 'indigo', time: { start: '16:00', end: '18:00' } },
  { id: 'dinner', label: 'Dinner', icon: Moon, color: 'violet', time: { start: '19:00', end: '23:00' } },
]

const mealColors = {
  amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500', glow: 'shadow-amber-200/50' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-500', glow: 'shadow-orange-200/50' },
  indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-500', glow: 'shadow-indigo-200/50' },
  violet: { border: 'border-violet-200', bg: 'bg-violet-50', text: 'text-violet-600', icon: 'text-violet-500', glow: 'shadow-violet-200/50' },
}

const getStatusDisplay = (restaurant) => {
  if (!restaurant) return { label: 'Unknown', className: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' }
  if (restaurant.isOpen === false) return { label: 'Closed', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' }
  return { label: 'Open', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' }
}

const getLiveStatus = (mealTime) => {
  if (!mealTime || !mealTime.start || !mealTime.end) return null
  const now = new Date()
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (current >= mealTime.start && current < mealTime.end) return 'active'
  if (current < mealTime.start) return 'upcoming'
  return 'closed'
}

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = Number(value)
    const duration = 800
    const startTime = Date.now()
    prevValue.current = end

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  return (
    <span ref={ref}>
      {prefix}{Number(display).toFixed(decimals)}{suffix}
    </span>
  )
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }
  return (
    <button onClick={handleCopy} className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" title="Copy to clipboard">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-gray-400" />}
    </button>
  )
}

const getNextOpenTime = (meals) => {
  const now = new Date()
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const activeMeals = meals.filter(m => m.enabled)
  const upcoming = activeMeals.find(m => m.start > current)
  if (upcoming) return `Opens at ${upcoming.start}`
  return 'Closed today'
}

const normalizeMealKey = (key) => {
  const normalized = String(key || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized === 'morning' || normalized === 'breakfast') return 'breakfast'
  if (normalized === 'lunch') return 'lunch'
  if (['snacks', 'evening_snacks', 'starters', 'soups'].includes(normalized)) return 'snacks'
  if (normalized === 'dinner') return 'dinner'
  return null
}

const emptyMealPayload = () =>
  MEALS.reduce((acc, meal) => {
    acc[meal.id] = { enabled: false, start: meal.time.start, end: meal.time.end }
    return acc
  }, {})

const mealTimesToPayload = (meals) =>
  meals.reduce((acc, meal) => {
    acc[meal.id] = {
      enabled: Boolean(meal.enabled),
      start: meal.start || meal.time.start,
      end: meal.end || meal.time.end,
    }
    return acc
  }, {})

const getServesPayload = (meals) =>
  meals.reduce((acc, meal) => {
    acc[meal.id] = Boolean(meal.enabled)
    return acc
  }, {})

const getOperatingHoursPayload = (meals) => {
  const enabledMeals = meals.filter(meal => meal.enabled && meal.start && meal.end)
  if (!enabledMeals.length) return { opening: null, closing: null }
  return {
    opening: enabledMeals.reduce((min, meal) => meal.start < min ? meal.start : min, enabledMeals[0].start),
    closing: enabledMeals.reduce((max, meal) => meal.end > max ? meal.end : max, enabledMeals[0].end),
  }
}

const buildMealTimesFromRestaurant = (restaurant) => {
  const payload = emptyMealPayload()
  const rawHours = restaurant?.operationalHours || {}
  const rawServes = restaurant?.serves || {}

  Object.entries(rawServes).forEach(([key, value]) => {
    const mealKey = normalizeMealKey(key)
    if (mealKey && value !== null && value !== undefined) {
      payload[mealKey].enabled = Boolean(value)
    }
  })

  Object.entries(rawHours).forEach(([key, value]) => {
    const mealKey = normalizeMealKey(key)
    if (!mealKey || !value) return
    payload[mealKey] = {
      enabled: Boolean(value.enabled),
      start: value.start || payload[mealKey].start,
      end: value.end || payload[mealKey].end,
    }
  })

  return MEALS.map(meal => ({ ...meal, ...payload[meal.id] }))
}

const RestaurantDetails = () => {
  const { uid } = useParams()
  const navigate = useNavigate()
  const restaurantAdmin = isRestaurantAdmin()
  const ownRestaurantUid = getCurrentRestaurantUid()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restaurant, setRestaurant] = useState(null)
  const [stats, setStats] = useState({ sales: 0, orders: 0, bookings: 0, active_offers: 0 })
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const [mealTimes, setMealTimes] = useState(
    MEALS.map(m => ({ ...m, enabled: false, start: m.time.start, end: m.time.end }))
  )
  const [hasUnsavedMeals, setHasUnsavedMeals] = useState(false)
  const [savingMeals, setSavingMeals] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [mealErrors, setMealErrors] = useState({})
  const [showDocs, setShowDocs] = useState(false)
  const [showModerationConfirm, setShowModerationConfirm] = useState(false)
  const [moderationLoading, setModerationLoading] = useState(false)
  const savedMealPayloadRef = useRef('')

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)

  const [editingSection, setEditingSection] = useState(null)
  const [profileFormData, setProfileFormData] = useState({})
  const [addressFormData, setAddressFormData] = useState({})

  const displayEmail = restaurant?.profile?.contact_email || restaurant?.contact?.encryptedEmail || restaurant?.contact?.email || restaurant?.contact?.encryptedUsername || 'Not provided'
  const displayPhone = restaurant?.profile?.contact_number || restaurant?.contact?.encryptedPhone || restaurant?.contact?.phone || '-'

  useEffect(() => {
    if (!uid || uid === 'undefined') { setError('Invalid restaurant ID'); setLoading(false); return }
    if (restaurantAdmin && ownRestaurantUid && uid !== ownRestaurantUid) { setError('You can only view your own restaurant.'); setLoading(false); return }
    fetchRestaurantDetails()
  }, [uid])

  useEffect(() => {
    if (uid && startDate && endDate) fetchStats()
  }, [uid, startDate, endDate])

  useEffect(() => {
    const errors = validateMeals(mealTimes)
    const currentPayload = JSON.stringify(mealTimesToPayload(mealTimes))
    setHasUnsavedMeals(Boolean(savedMealPayloadRef.current && currentPayload !== savedMealPayloadRef.current))
    setMealErrors(errors)
  }, [mealTimes])

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getRestaurantById(uid)
      let restaurantData = response.data?.data?.restaurant || response.data?.restaurant || response.data?.data
      if (!restaurantData) throw new Error('Restaurant data not found')
      setRestaurant(restaurantData)
      const normalizedMeals = buildMealTimesFromRestaurant(restaurantData)
      setMealTimes(normalizedMeals)
      savedMealPayloadRef.current = JSON.stringify(mealTimesToPayload(normalizedMeals))
      setLastSaved(restaurantData.lastUpdatedAt || restaurantData.updatedAt || null)
      setHasUnsavedMeals(false)
      fetchStats()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const statsRes = await getRestaurantAdminStats(uid, { startDate, endDate })
      if (statsRes.data?.data) setStats(statsRes.data.data)
    } catch (err) { console.error('Stats error:', err) }
  }

  const handleToggleActive = async () => {
    if (!restaurant.uid) return
    try {
      setModerationLoading(true)
      await toggleRestaurantActive(restaurant.uid)
      toast.success(restaurant.isActive ? 'Restaurant blocked' : 'Restaurant unblocked')
      setShowModerationConfirm(false)
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setModerationLoading(false) }
  }

  const handleToggleOpen = async () => {
    if (!restaurant.uid) return
    try {
      await toggleRestaurantOff(restaurant.uid)
      toast.success(restaurant.isOpen === false ? 'Restaurant opened' : 'Restaurant closed')
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status') }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return }
    try {
      setIsUpdatingProfile(true)
      await uploadRestaurantLogoAdmin(uid, file)
      toast.success('Logo updated')
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to upload') }
    finally { setIsUpdatingProfile(false); if (e.target) e.target.value = '' }
  }

  const submitProfileUpdate = async (e) => {
    e.preventDefault()
    if (!profileFormData.restaurant_name || !profileFormData.contact_number) { toast.error('Please fill required fields'); return }
    try {
      setIsUpdatingProfile(true)
      await updateRestaurantProfileAdmin(uid, profileFormData)
      toast.success('Profile updated')
      setEditingSection(null)
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setIsUpdatingProfile(false) }
  }

  const submitAddressUpdate = async (e) => {
    e.preventDefault()
    if (!addressFormData.address || !addressFormData.city || !addressFormData.pincode) { toast.error('Please fill required fields'); return }
    try {
      setIsUpdatingAddress(true)
      await updateRestaurantAddressAdmin(uid, { ...addressFormData, lat: Number(addressFormData.lat), lng: Number(addressFormData.lng) })
      toast.success('Address updated')
      setEditingSection(null)
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update') }
    finally { setIsUpdatingAddress(false) }
  }

  const handleExportStats = () => {
    const csvContent = [
      ["Restaurant Name", restaurant?.profile?.restaurant_name || "Unknown"],
      ["Report Period", `${startDate} to ${endDate}`],
      ["Metric", "Value"],
      ["Total Sales", stats.sales],
      ["Total Orders", stats.orders],
      ["Total Bookings", stats.bookings],
      ["Active Offers", stats.active_offers],
      ["Generated At", new Date().toLocaleString()]
    ].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, `restaurant-stats-${uid}-${startDate}-${endDate}.csv`)
  }

  const handleMealToggle = (id) => {
    setMealTimes(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  }

  const handleMealTimeChange = (id, field, value) => {
    setMealTimes(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const validateMeals = (meals = mealTimes) => {
    const errors = {}
    meals.forEach(meal => {
      if (meal.enabled && meal.start && meal.end) {
        if (meal.end <= meal.start) {
          errors[meal.id] = 'End must be after start'
        }
      }
      meals.forEach(other => {
        if (other.id !== meal.id && other.enabled && meal.enabled && meal.start && meal.end && other.start && other.end) {
          if (meal.start < other.end && meal.end > other.start) {
            if (!errors[meal.id]) errors[meal.id] = ''
            errors[other.id] = 'Overlaps with ' + meal.label
          }
        }
      })
    })
    return errors
  }

  const handleSaveMeals = async () => {
    const errors = validateMeals(mealTimes)
    setMealErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix meal timing errors')
      return
    }

    try {
      setSavingMeals(true)
      const payload = {
        operationalHours: mealTimesToPayload(mealTimes),
        operatingHours: getOperatingHoursPayload(mealTimes),
        serves: getServesPayload(mealTimes),
      }
      const response = await updateRestaurantOperationalHours(uid, payload)
      const data = response.data?.data || response.data || {}
      const savedAt = new Date().toISOString()
      savedMealPayloadRef.current = JSON.stringify(payload.operationalHours)
      setLastSaved(data.lastUpdatedAt || savedAt)
      setRestaurant(prev => prev ? {
        ...prev,
        operationalHours: data.operationalHours || response.data?.operationalHours || payload.operationalHours,
        operatingHours: data.operatingHours || response.data?.operatingHours || payload.operatingHours,
        serves: data.serves || response.data?.serves || payload.serves,
        isOpen: data.isOpen ?? response.data?.isOpen ?? prev.isOpen,
        currentMeal: data.currentMeal ?? response.data?.currentMeal ?? prev.currentMeal,
        lastUpdatedAt: data.lastUpdatedAt || savedAt,
      } : prev)
      setHasUnsavedMeals(false)
      toast.success('Meal timings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save meal timings')
    } finally {
      setSavingMeals(false)
    }
  }

  const handleDocFileUpload = async (event, docType) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    try {
      await uploadRestaurantDocumentFileAdmin(uid, docType, files)
      toast.success(`${docType.toUpperCase()} uploaded`)
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed') }
  }

  const handleDeleteDoc = async (docType, label) => {
    if (!window.confirm(`Remove all ${label} documents?`)) return
    try {
      await deleteRestaurantDocumentAdmin(uid, docType)
      toast.success(`${label} removed`)
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove') }
  }

  const handleDeleteDocFile = async (docType, filename) => {
    if (!window.confirm('Remove this file?')) return
    try {
      await deleteRestaurantDocumentFileAdmin(uid, docType, filename)
      toast.success('File removed')
      fetchRestaurantDetails()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove file') }
  }

  const statusInfo = restaurant ? getStatusDisplay(restaurant) : { label: 'Unknown', className: '', dot: '' }
  const activeMeals = mealTimes.filter(m => m.enabled).length
  const nextOpen = getNextOpenTime(mealTimes)

  const doc = restaurant?.documents?.[0]

  const renderDocumentPreview = (file, index, label) => {
    const url = getRestaurantImageUrl(file)
    const ext = file.split('.').pop().toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" key={index} className="relative group block">
          <img src={url} alt={`${label} ${index + 1}`} className="w-full h-28 object-cover rounded-xl border border-gray-200 group-hover:opacity-90 transition-opacity" />
        </a>
      )
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" key={index} className="w-full h-28 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors group">
        <FileText size={24} className="text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] text-gray-500 font-medium">{ext.toUpperCase()}</span>
      </a>
    )
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div><SkeletonCard /></div>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Restaurant Details</h2>
            <p className="text-sm text-gray-500 mb-6">{error || 'Restaurant not found'}</p>
            <Button variant="primary" onClick={() => navigate('/restaurants')}>
              <ArrowLeft size={16} /> Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { profile, address } = restaurant

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/restaurants')} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{profile?.restaurant_name || 'Restaurant'}</h1>
            <p className="text-xs text-gray-500">ID: {restaurant.uid?.slice(0, 12)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs border-0 focus:outline-none w-24" />
            <span className="text-xs text-gray-400">-</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs border-0 focus:outline-none w-24" />
          </div>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportStats}>Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card hover>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="relative group flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
                    {profile?.photo?.length > 0 ? (
                      <img src={getRestaurantLogoUrl(profile.photo[profile.photo.length - 1])} alt="Logo" className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23e5e7eb" width="64" height="64"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Building2 size={28} className="text-gray-300" /></div>
                    )}
                  </div>
                  {!restaurantAdmin && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-2xl cursor-pointer transition-all opacity-0 group-hover:opacity-100">
                      <Upload size={18} className="text-white" />
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUpdatingProfile} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 truncate">{profile?.restaurant_name || 'Restaurant'}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${statusInfo.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} animate-status-pulse`} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Power size={12} className="text-indigo-400" />
                      <span className="font-medium text-gray-700">{restaurant.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} className="text-indigo-400" />
                      <span className="font-medium text-gray-700">{activeMeals} Meals</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {restaurant.isOpen !== false ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Zap size={12} className="fill-emerald-500 text-emerald-500" /> Open Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 font-medium">
                          <EyeOff size={12} /> {nextOpen}
                        </span>
                      )}
                      {restaurantAdmin && <Toggle enabled={restaurant.isOpen !== false} onChange={handleToggleOpen} size="sm" />}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Sales', value: stats.sales, icon: IndianRupee, prefix: '₹', decimals: 2, color: 'emerald' },
              { label: 'Orders', value: stats.orders, icon: ShoppingBag, color: 'indigo' },
              { label: 'Bookings', value: stats.bookings, icon: Calendar, color: 'violet' },
              { label: 'Active Offers', value: stats.active_offers, icon: Tag, color: 'orange' },
            ].map((kpi, i) => {
              const colors = {
                emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
                indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
                violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
                orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
              }
              const c = colors[kpi.color]
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                    <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center`}>
                      <kpi.icon size={16} className={c.text} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    <AnimatedCounter value={kpi.value} prefix={kpi.prefix || ''} decimals={kpi.decimals || 0} />
                  </p>

                </motion.div>
              )
            })}
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building2 size={16} className="text-indigo-500" />
                Basic Information
              </h3>
              {!restaurantAdmin && (
                <Button variant="ghost" size="sm" icon={editingSection === 'profile' ? X : undefined}
                  onClick={() => {
                    if (editingSection === 'profile') { setEditingSection(null); return }
                    setProfileFormData({
                      restaurant_name: profile?.restaurant_name || '',
                      contact_person: profile?.contact_person || '',
                      contact_number: profile?.contact_number || '',
                      contact_email: profile?.contact_email || displayEmail,
                    })
                    setEditingSection('profile')
                  }}
                >
                  {editingSection === 'profile' ? 'Cancel' : 'Edit'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingSection === 'profile' ? (
                <form onSubmit={submitProfileUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Restaurant Name *</label>
                      <input type="text" name="restaurant_name" value={profileFormData.restaurant_name} onChange={(e) => setProfileFormData(p => ({ ...p, restaurant_name: e.target.value }))}
                        disabled={isUpdatingProfile} required
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Contact Person</label>
                      <input type="text" name="contact_person" value={profileFormData.contact_person} onChange={(e) => setProfileFormData(p => ({ ...p, contact_person: e.target.value }))}
                        disabled={isUpdatingProfile}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Contact Number *</label>
                      <input type="tel" name="contact_number" value={profileFormData.contact_number} onChange={(e) => setProfileFormData(p => ({ ...p, contact_number: e.target.value }))}
                        disabled={isUpdatingProfile} required
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Email</label>
                      <input type="email" name="contact_email" value={profileFormData.contact_email} onChange={(e) => setProfileFormData(p => ({ ...p, contact_email: e.target.value }))}
                        disabled={isUpdatingProfile}
                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                    <Button variant="primary" size="sm" type="submit" loading={isUpdatingProfile}>Save Changes</Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Restaurant Name</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.restaurant_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Email</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-900 truncate">{displayEmail}</p>
                      <CopyButton text={displayEmail} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Phone</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-900">{displayPhone}</p>
                      <CopyButton text={displayPhone} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Contact Person</p>
                    <p className="text-sm text-gray-900">{profile?.contact_person || '-'}</p>
                  </div>
                  <div className="sm:col-span-2 border-t border-gray-50 pt-3 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Address</p>
                      {!restaurantAdmin && (
                        <Button variant="ghost" size="sm" icon={editingSection === 'address' ? X : undefined}
                          onClick={() => {
                            if (editingSection === 'address') { setEditingSection(null); return }
                            setAddressFormData({
                              address: address?.address || '',
                              city: address?.city || '',
                              state: address?.state || '',
                              pincode: address?.pincode || '',
                              lat: address?.lat || '',
                              lng: address?.lng || '',
                            })
                            setEditingSection('address')
                          }}
                        >
                          {editingSection === 'address' ? 'Cancel' : 'Edit Address'}
                        </Button>
                      )}
                    </div>
                    {editingSection === 'address' ? (
                      <form onSubmit={submitAddressUpdate} className="space-y-3">
                        <input type="text" name="address" value={addressFormData.address} onChange={(e) => setAddressFormData(p => ({ ...p, address: e.target.value }))}
                          disabled={isUpdatingAddress} required placeholder="Street address"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" name="city" value={addressFormData.city} onChange={(e) => setAddressFormData(p => ({ ...p, city: e.target.value }))}
                            disabled={isUpdatingAddress} required placeholder="City"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                          <input type="text" name="state" value={addressFormData.state} onChange={(e) => setAddressFormData(p => ({ ...p, state: e.target.value }))}
                            disabled={isUpdatingAddress} placeholder="State"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <input type="text" name="pincode" value={addressFormData.pincode} onChange={(e) => setAddressFormData(p => ({ ...p, pincode: e.target.value }))}
                            disabled={isUpdatingAddress} required placeholder="Pincode"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                          <input type="number" name="lat" value={addressFormData.lat} onChange={(e) => setAddressFormData(p => ({ ...p, lat: e.target.value }))}
                            disabled={isUpdatingAddress} placeholder="Lat" step="0.0001"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                          <input type="number" name="lng" value={addressFormData.lng} onChange={(e) => setAddressFormData(p => ({ ...p, lng: e.target.value }))}
                            disabled={isUpdatingAddress} placeholder="Lng" step="0.0001"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" type="submit" loading={isUpdatingAddress}>Save</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          {address?.address || '-'}, {address?.city || '-'}, {address?.state || '-'} - {address?.pincode || '-'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" />
                Operational Hours
              </h3>
              <div className="flex items-center gap-2">
                {hasUnsavedMeals && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Unsaved changes</span>
                )}
                {lastSaved && !hasUnsavedMeals && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <CheckCircle size={10} className="text-emerald-500" /> Saved {formatRelativeTime(lastSaved)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mealTimes.map((meal, i) => {
                  const colors = mealColors[meal.color]
                  const live = meal.enabled ? getLiveStatus(meal) : null
                  return (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`relative rounded-2xl border-2 p-4 transition-all duration-200 ${
                        meal.enabled
                          ? `bg-white ${colors.border} shadow-sm hover:shadow-md hover:${colors.glow}`
                          : 'bg-gray-50/50 border-gray-100 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl ${meal.enabled ? colors.bg : 'bg-gray-100'} flex items-center justify-center`}>
                            <meal.icon size={18} className={meal.enabled ? colors.icon : 'text-gray-400'} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${meal.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{meal.label}</p>
                            {live === 'active' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
                                Serving now
                              </span>
                            )}
                            {live === 'upcoming' && (
                              <span className="text-[10px] text-indigo-500 font-medium">{meal.start}</span>
                            )}
                          </div>
                        </div>
                        <Toggle enabled={meal.enabled} onChange={() => handleMealToggle(meal.id)} size="sm" />
                      </div>
                      <div className={`grid grid-cols-2 gap-2 transition-opacity duration-200 ${meal.enabled ? '' : 'opacity-50'}`}>
                        <TimePicker
                          label="Start"
                          value={meal.start}
                          onChange={(v) => handleMealTimeChange(meal.id, 'start', v)}
                          disabled={!meal.enabled}
                          error={mealErrors[meal.id] && !mealErrors[meal.id].includes('Overlaps') ? mealErrors[meal.id] : ''}
                        />
                        <TimePicker
                          label="End"
                          value={meal.end}
                          onChange={(v) => handleMealTimeChange(meal.id, 'end', v)}
                          disabled={!meal.enabled}
                          error={mealErrors[meal.id] && !mealErrors[meal.id].includes('Overlaps') ? mealErrors[meal.id] : ''}
                        />
                      </div>
                      {mealErrors[meal.id]?.includes('Overlaps') && (
                        <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {mealErrors[meal.id]}
                        </p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
              <div className="sticky bottom-0 z-10 -mx-4 px-4 pb-2 pt-4 mt-4 bg-white/95 backdrop-blur border-t border-gray-50 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info size={12} className="text-indigo-400" />
                  {hasUnsavedMeals ? 'You have unsaved meal time changes' : 'All meal times are saved'}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  onClick={handleSaveMeals}
                  loading={savingMeals}
                  disabled={!hasUnsavedMeals || Object.keys(mealErrors).length > 0}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {doc && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" />
                  Documents
                </h3>
                <button onClick={() => setShowDocs(!showDocs)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  {showDocs ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
              </CardHeader>
              <AnimatePresence>
                {showDocs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="space-y-4">
                      {[
                        { key: 'fssai', label: 'FSSAI License', number: doc.fssai_number, files: doc.file_fssai },
                        { key: 'gst', label: 'GST Certificate', number: doc.gst_number, files: doc.file_gst },
                        { key: 'trade', label: 'Trade License', number: doc.trade_license_number, files: doc.file_trade_license },
                      ].filter(d => d.number).map((docType) => (
                        <div key={docType.key} className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{docType.label}</p>
                              <p className="text-[11px] text-gray-500 font-mono">{docType.number}</p>
                            </div>
                            {!restaurantAdmin && (
                              <div className="flex items-center gap-1.5">
                                <label className="px-2 py-1 text-[10px] text-indigo-600 hover:text-indigo-800 cursor-pointer border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                                  <Upload size={12} className="inline mr-1" />Upload
                                  <input type="file" multiple className="hidden" onChange={(e) => handleDocFileUpload(e, docType.key)} />
                                </label>
                                <button onClick={() => handleDeleteDoc(docType.key, docType.label)} className="px-2 py-1 text-[10px] text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          {docType.files && docType.files.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {docType.files.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  {renderDocumentPreview(file, idx, docType.label)}
                                  {!restaurantAdmin && (
                                    <button onClick={() => handleDeleteDocFile(docType.key, file)}
                                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Status</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Operation</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} animate-live-pulse`} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Account</span>
                    <span className={`text-xs font-semibold ${restaurant.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {restaurant.isActive ? 'Active' : 'Blocked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Live Orders</span>
                    <span className="text-xs font-semibold text-indigo-600">{stats.orders} today</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h4>
                <div className="space-y-1.5">
                  <motion.button whileHover={{ x: 2 }} onClick={() => navigate(`/menu/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || '')}`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                    <ShoppingBag size={15} /> Add Menu Item
                  </motion.button>
                  {!restaurantAdmin && (
                    <>
                      <motion.button whileHover={{ x: 2 }} onClick={() => navigate(`/dining/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || '')}`)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                        <Calendar size={15} /> Add Dining Space
                      </motion.button>
                      <motion.button whileHover={{ x: 2 }} onClick={() => navigate(`/events/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || '')}`)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                        <ExternalLink size={15} /> Add Event
                      </motion.button>
                    </>
                  )}
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => navigate(`/menu?restaurant=${restaurant.uid}`, {
                      state: { selectedRestaurant: restaurant.uid, selectedRestaurantName: profile?.restaurant_name || '' }
                    })}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                    <FileText size={15} /> Manage Menu
                  </motion.button>
                  {restaurantAdmin && (
                    <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                      <motion.button whileHover={{ x: 2 }} onClick={handleToggleOpen}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          restaurant.isOpen === false
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                        }`}>
                        {restaurant.isOpen === false ? <><Power size={15} /> Open Restaurant</> : <><Power size={15} /> Close Restaurant</>}
                      </motion.button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {!restaurantAdmin && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      restaurant.isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform Moderation</h4>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {restaurant.isActive ? 'Block restaurant account' : 'Unblock restaurant account'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {restaurant.isActive
                          ? 'Blocking prevents this restaurant from operating on Zenzio until an admin unblocks it. Use this only for policy, verification, or safety issues.'
                          : 'Unblocking restores platform access for this restaurant. Confirm that verification and policy checks are complete before continuing.'}
                      </p>
                      <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                        restaurant.isActive
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      }`}>
                        Current account status: <span className="font-bold">{restaurant.isActive ? 'Active' : 'Blocked'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowModerationConfirm(true)}
                        className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          restaurant.isActive
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {restaurant.isActive ? 'Block Restaurant' : 'Unblock Restaurant'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hours Summary</h4>
                <div className="space-y-2">
                  {mealTimes.map(meal => (
                    <div key={meal.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <meal.icon size={12} className={meal.enabled ? 'text-indigo-500' : 'text-gray-300'} />
                        <span className={`text-xs ${meal.enabled ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {meal.label}
                        </span>
                        {meal.enabled && getLiveStatus(meal) === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
                        )}
                      </div>
                      <span className={`text-[11px] ${meal.enabled ? 'text-gray-500' : 'text-gray-300'}`}>
                        {meal.enabled ? `${meal.start} - ${meal.end}` : 'Off'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  <Activity size={12} className="inline mr-1" />
                  Recent Activity
                </h4>
                <div className="space-y-2.5">
                  {[
                    { action: 'Menu updated', time: '2 hours ago', type: 'edit' },
                    { action: 'Restaurant opened', time: '5 hours ago', type: 'status' },
                    { action: 'Profile updated', time: '1 day ago', type: 'edit' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                        activity.type === 'status' ? 'bg-emerald-500' : 'bg-indigo-400'
                      }`} />
                      <div>
                        <p className="text-xs text-gray-700">{activity.action}</p>
                        <p className="text-[10px] text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModerationConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                restaurant.isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-950">
                {restaurant.isActive ? 'Block this restaurant?' : 'Unblock this restaurant?'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {restaurant.isActive
                  ? 'This will immediately remove the restaurant from active platform operations and can stop restaurant admin activity until it is unblocked.'
                  : 'This will restore platform access for the restaurant. Make sure all verification and moderation checks are complete.'}
              </p>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                Warning: this is a platform moderation action. It is different from opening or closing restaurant operations for the day.
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModerationConfirm(false)}
                  disabled={moderationLoading}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={moderationLoading}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-70 ${
                    restaurant.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {moderationLoading
                    ? 'Updating...'
                    : restaurant.isActive ? 'Yes, Block Restaurant' : 'Yes, Unblock Restaurant'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RestaurantDetails
