import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GoogleMap,
    MarkerF,
    OverlayView,
    PolylineF,
    useJsApiLoader,
} from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bike,
    ChevronDown,
    Clock,
    LocateFixed,
    MapPin,
    Navigation,
    Package,
    RefreshCw,
    Route,
    Search,
    Store,
    User,
    Wifi,
} from 'lucide-react';
import { getLiveExecutives, getLivePartnerLocations } from '../../services/api';
import { shouldRunSharedPoll } from '../../utils/requestCoordinator';

const DEFAULT_CENTER = { lat: 11.9416, lng: 79.8083 };
const ACTIVE_DELIVERY_STATUSES = new Set([
    'accepted',
    'picked_up',
    'out_for_delivery',
    'on_the_way_to_restaurant',
    'on_the_way_to_customer',
]);
const STALE_GPS_MINUTES = 15;
const GOOGLE_MAPS_API_KEY =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    import.meta.env.GOOGLE_MAPS_API_KEY ||
    import.meta.env.GOOGLE_API_KEY;
const GOOGLE_LIBRARIES = ['places', 'geometry'];

const mapStyle = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
];

const normalizeCoordinate = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toPoint = (lat, lng) => {
    const normalizedLat = normalizeCoordinate(lat);
    const normalizedLng = normalizeCoordinate(lng);
    if (normalizedLat === null || normalizedLng === null) return null;
    if (normalizedLat === 0 && normalizedLng === 0) return null;
    return { lat: normalizedLat, lng: normalizedLng };
};

const getExecutivePoint = (executive) =>
    toPoint(executive?.latitude ?? executive?.lat, executive?.longitude ?? executive?.lng);

const getRoutePoints = (executive) => {
    const order = executive?.orderDetails;
    return {
        executive: getExecutivePoint(executive),
        restaurant: order?.locations?.restaurant || toPoint(order?.restaurantLat, order?.restaurantLng),
        customer:
            order?.locations?.customer ||
            toPoint(
                order?.customerLat ?? order?.deliveredLocationLat ?? order?.deliveryLat,
                order?.customerLng ?? order?.deliveredLocationLng ?? order?.deliveryLng,
            ),
    };
};

const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const formatAgo = (value) => {
    if (!value) return 'no GPS';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (diffSeconds < 10) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const minutesSince = (value) => {
    if (!value) return Number.POSITIVE_INFINITY;
    return (Date.now() - new Date(value).getTime()) / 60000;
};

const formatStatus = (value) => String(value || 'Unknown').replace(/_/g, ' ');

const formatKm = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `${parsed.toFixed(1)} km` : '-';
};

const formatEta = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `${Math.max(1, Math.round(parsed))} min` : '-';
};

const isActiveDelivery = (executive) =>
    Boolean(executive?.orderDetails && ACTIVE_DELIVERY_STATUSES.has(executive.orderDetails.deliveryStatus));

const isFreshGps = (executive) =>
    Boolean(executive?.gpsActive && getExecutivePoint(executive) && minutesSince(executive.lastUpdated) <= STALE_GPS_MINUTES);

const isOperationalExecutive = (executive) =>
    Boolean(executive?.isActive && isFreshGps(executive) && isActiveDelivery(executive));

const getStatusTone = (executive) => {
    const status = String(executive?.status || '').toLowerCase();
    if (!isFreshGps(executive)) return 'red';
    if (status.includes('pickup') || status.includes('accepted')) return 'orange';
    if (status.includes('deliver') || status.includes('customer')) return 'blue';
    return 'green';
};

const getGpsPresence = (executive) => {
    const point = getExecutivePoint(executive);
    const online = isFreshGps(executive);
    const location = point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'Location unavailable';

    return {
        online,
        location,
        label: online ? 'Online - GPS on' : 'Offline - GPS off',
        title: `${executive?.name || 'Delivery Executive'}: ${online ? 'Online with GPS on' : 'Offline or GPS off'} | ${location} | Last update: ${formatAgo(executive?.lastUpdated)}`,
    };
};

const toneClasses = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

const markerColors = {
    green: '#10b981',
    orange: '#f97316',
    blue: '#2563eb',
    red: '#ef4444',
    gray: '#64748b',
};

const Avatar = ({ name, imageUrl, icon: Icon, size = 'md' }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const sizeClasses = {
        sm: 'h-8 w-8 text-[10px]',
        md: 'h-10 w-10 text-xs',
        lg: 'h-11 w-11 text-sm',
    };

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    return (
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 font-black text-white ${sizeClasses[size]}`}>
            {imageUrl && !imageFailed ? (
                <img
                    src={imageUrl}
                    alt={name || 'Profile'}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : Icon ? (
                <Icon size={size === 'sm' ? 14 : 16} />
            ) : (
                getInitials(name)
            )}
        </div>
    );
};

const MetricPill = ({ icon: Icon, label, value, tone = 'green' }) => (
    <div className="flex min-w-[126px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
            <Icon size={15} />
        </div>
        <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-base font-black leading-tight text-slate-900">{value}</p>
        </div>
    </div>
);

const PhotoMapMarker = ({ point, color, name, imageUrl, icon: Icon, active, label, title }) => {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    if (!point) return null;

    return (
        <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative -translate-x-1/2 -translate-y-1/2">
                {active && <span className="absolute inset-0 h-12 w-12 animate-ping rounded-full opacity-20" style={{ backgroundColor: color }} />}
                <div
                    className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-slate-900 text-[11px] font-black text-white shadow-xl"
                    style={{ boxShadow: `0 0 0 4px ${color}24, 0 12px 24px rgba(15,23,42,0.2)` }}
                    title={title || name || label}
                >
                    {imageUrl && !imageFailed ? (
                        <img
                            src={imageUrl}
                            alt={name || label || 'Map marker'}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    ) : Icon ? (
                        <Icon size={18} />
                    ) : (
                        getInitials(name || label)
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ backgroundColor: color }} />
                </div>
                {label && (
                    <div className="absolute left-1/2 top-[48px] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-700 shadow">
                        {label}
                    </div>
                )}
            </div>
        </OverlayView>
    );
};

const ExecutiveCard = ({ executive, selected, expanded, onSelect, onOpenOrder, onOpenExecutive }) => {
    const order = executive.orderDetails;
    const route = order?.route;
    const tone = getStatusTone(executive);
    const presence = getGpsPresence(executive);

    return (
        <motion.button
            layout
            onClick={() => onSelect(executive)}
            title={presence.title}
            className={`w-full rounded-xl border px-3 py-2.5 text-left shadow-sm transition hover:border-red-200 hover:shadow-md ${
                presence.online ? 'bg-emerald-50/60' : 'bg-red-50/60'
            } ${
                selected ? 'border-red-300 ring-2 ring-red-100' : presence.online ? 'border-emerald-100' : 'border-red-100'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar name={executive.name} imageUrl={executive.imageUrl} size="lg" />
                    <span className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white ${presence.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{executive.name}</p>
                            <p className="truncate text-[11px] font-semibold text-slate-500">{order?.orderId || executive.uid}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${toneClasses[tone]}`}>
                                {formatEta(route?.totalEtaMinutes ?? order?.etaMinutes)}
                            </span>
                            <ChevronDown size={14} className={`text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${presence.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{presence.label}</span>
                        <span className="text-slate-300">|</span>
                        <span>{formatStatus(order?.deliveryStatus)}</span>
                        <span className="text-slate-300">|</span>
                        <span>{formatAgo(executive.lastUpdated)}</span>
                    </div>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenExecutive(executive);
                        }}
                        className="mt-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 transition hover:bg-red-50 hover:text-red-600"
                    >
                        Activity history
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex -space-x-2">
                                    <Avatar name={executive.name} imageUrl={executive.imageUrl} size="sm" />
                                    <Avatar name={order?.restaurantName} imageUrl={order?.restaurantImageUrl} icon={Store} size="sm" />
                                    <Avatar name={order?.customerName} imageUrl={order?.customerImageUrl} icon={User} size="sm" />
                                </div>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onOpenOrder(order.orderId);
                                    }}
                                    className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white hover:bg-slate-800"
                                >
                                    View order
                                </button>
                            </div>

                            <div className="mt-3 space-y-2">
                                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                                    <p className="truncate text-xs font-black text-slate-900">{order?.restaurantName || 'Restaurant'}</p>
                                    <p className="truncate text-[11px] font-semibold text-slate-500">to {order?.customerName || 'Customer'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="font-bold text-slate-400">Journey</p>
                                        <p className="font-black text-slate-900">{formatKm(route?.totalDistanceKm)}</p>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 p-2">
                                        <p className="font-bold text-emerald-500">GPS</p>
                                        <p className="font-black text-emerald-900">{formatAgo(executive.lastUpdated)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                    <Bike size={13} className="text-emerald-600" />
                                    <span>Executive</span>
                                    <Route size={13} className="text-slate-300" />
                                    <Store size={13} className="text-orange-500" />
                                    <span>Restaurant</span>
                                    <Route size={13} className="text-slate-300" />
                                    <MapPin size={13} className="text-blue-600" />
                                    <span>Customer</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
};

const ActivityCard = ({ executive, onOpenExecutive }) => {
    const gpsMissing = !isFreshGps(executive);
    const order = executive.orderDetails;
    const presence = getGpsPresence(executive);
    const message = gpsMissing
        ? 'GPS missing or stale'
        : order
            ? `Tracking ${order.orderId}`
            : 'Online without active delivery';

    return (
        <button
            type="button"
            onClick={() => onOpenExecutive(executive)}
            title={presence.title}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left shadow-sm transition hover:border-red-200 ${
                gpsMissing
                    ? 'border-red-100 bg-red-50/70 hover:bg-red-50'
                    : 'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50'
            }`}
        >
            <Avatar name={executive.name} imageUrl={executive.imageUrl} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900">{executive.name}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">
                    {message} - {formatAgo(executive.lastUpdated)}
                </p>
            </div>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${gpsMissing ? 'bg-red-400' : 'bg-emerald-500'}`} />
        </button>
    );
};

const LiveTracking = () => {
    const navigate = useNavigate();
    const [executives, setExecutives] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [mapZoom, setMapZoom] = useState(13);
    const [trailByExecutive, setTrailByExecutive] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activePanel, setActivePanel] = useState('routes');
    const mapRef = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries: GOOGLE_LIBRARIES,
    });

    const normalizeExecutive = useCallback((executive) => ({
        ...executive,
        uid: executive.uid || executive.executiveId,
        executiveId: executive.executiveId || executive.uid,
        name: executive.name || 'Delivery Executive',
        lat: normalizeCoordinate(executive.latitude ?? executive.lat) ?? 0,
        lng: normalizeCoordinate(executive.longitude ?? executive.lng) ?? 0,
        gpsActive: Boolean(executive.gpsActive ?? getExecutivePoint(executive)),
        status: executive.status || (executive.isActive ? 'Online' : 'Offline'),
    }), []);

    const fetchLocations = useCallback(async (manual = false) => {
        if (manual) setLoading(true);

        try {
            let response;
            try {
                response = await getLiveExecutives();
            } catch (error) {
                if (error.response?.status !== 404) throw error;
                response = await getLivePartnerLocations();
            }

            const nextExecutives = (response.data?.data || []).map(normalizeExecutive);
            setExecutives(nextExecutives);
            setLastRefreshed(new Date());

            setTrailByExecutive((previous) => {
                const next = { ...previous };
                nextExecutives.forEach((executive) => {
                    if (!isOperationalExecutive(executive)) return;
                    const point = getExecutivePoint(executive);
                    if (!point) return;

                    const currentTrail = next[executive.uid] || [];
                    const last = currentTrail[currentTrail.length - 1];
                    const isSamePoint =
                        last &&
                        Math.abs(last.lat - point.lat) < 0.00001 &&
                        Math.abs(last.lng - point.lng) < 0.00001;

                    next[executive.uid] = isSamePoint ? currentTrail : [...currentTrail, point].slice(-12);
                });
                return next;
            });
        } catch (error) {
            console.error('Failed to fetch live executive tracking:', error);
        } finally {
            setLoading(false);
        }
    }, [normalizeExecutive]);

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(() => {
            if (shouldRunSharedPoll('live-tracking', 14000)) {
                fetchLocations();
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchLocations]);

    const operationalExecutives = useMemo(
        () => executives.filter(isOperationalExecutive),
        [executives],
    );

    const activityExecutives = useMemo(
        () => executives.filter((executive) => !isOperationalExecutive(executive)),
        [executives],
    );

    const mapExecutives = useMemo(
        () => executives.filter((executive) => Boolean(getExecutivePoint(executive))),
        [executives],
    );

    const filteredActivityExecutives = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return activityExecutives;
        return activityExecutives.filter((executive) =>
            `${executive.name} ${executive.uid} ${executive.orderDetails?.orderId || ''} ${executive.status || ''}`.toLowerCase().includes(query),
        );
    }, [activityExecutives, searchQuery]);

    const filteredExecutives = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return operationalExecutives;
        return operationalExecutives.filter((executive) =>
            `${executive.name} ${executive.uid} ${executive.orderDetails?.orderId || ''}`.toLowerCase().includes(query),
        );
    }, [operationalExecutives, searchQuery]);

    const selectedExecutive = useMemo(
        () => operationalExecutives.find((executive) => executive.uid === selectedId) || operationalExecutives[0] || null,
        [operationalExecutives, selectedId],
    );

    useEffect(() => {
        if (!selectedExecutive) {
            setSelectedId(null);
            setExpandedId(null);
            return;
        }

        if (selectedId !== selectedExecutive.uid) {
            setSelectedId(selectedExecutive.uid);
        }

        const point = getExecutivePoint(selectedExecutive);
        if (point && !mapRef.current) {
            setMapCenter(point);
            setMapZoom(15);
        }
    }, [selectedExecutive, selectedId]);

    const routePoints = useMemo(() => getRoutePoints(selectedExecutive), [selectedExecutive]);
    const fallbackRoutePath = useMemo(
        () => [routePoints.executive, routePoints.restaurant, routePoints.customer].filter(Boolean),
        [routePoints],
    );
    const selectedTrail = useMemo(
        () => (selectedExecutive ? trailByExecutive[selectedExecutive.uid] || [] : []),
        [selectedExecutive, trailByExecutive],
    );

    useEffect(() => {
        if (!isLoaded || !window.google || !routePoints.executive || !routePoints.restaurant || !routePoints.customer) {
            setRoutePath([]);
            return;
        }

        const fallbackDirectionsService = () => {
            try {
                const service = new window.google.maps.DirectionsService();
                service.route(
                    {
                        origin: routePoints.executive,
                        destination: routePoints.customer,
                        waypoints: [{ location: routePoints.restaurant, stopover: true }],
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    },
                    (result, status) => {
                        if (status === 'OK' && result?.routes?.[0]?.overview_path) {
                            setRoutePath(result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })));
                        } else {
                            setRoutePath([]);
                        }
                    },
                );
            } catch {
                setRoutePath([]);
            }
        };

        if (window.google.maps.routes?.Route?.computeRoutes) {
            window.google.maps.routes.Route.computeRoutes({
                origin: {
                    location: {
                        latLng: { latitude: routePoints.executive.lat, longitude: routePoints.executive.lng },
                    },
                },
                destination: {
                    location: {
                        latLng: { latitude: routePoints.customer.lat, longitude: routePoints.customer.lng },
                    },
                },
                intermediates: [
                    {
                        location: {
                            latLng: { latitude: routePoints.restaurant.lat, longitude: routePoints.restaurant.lng },
                        },
                    },
                ],
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE',
                    departureTime: new Date().toISOString(),
                    units: 'METRIC',
                    fields: ['routes.polyline.encodedPolyline'],
            })
                .then(({ routes }) => {
                    if (routes?.length > 0 && routes[0].polyline?.encodedPolyline) {
                        const decodedPath = window.google.maps.geometry.encoding.decodePath(
                            routes[0].polyline.encodedPolyline,
                        );
                        setRoutePath(decodedPath.map((p) => ({ lat: p.lat(), lng: p.lng() })));
                    }
                })
                .catch(() => {
                    fallbackDirectionsService();
                });
        } else {
            fallbackDirectionsService();
        }
    }, [isLoaded, routePoints]);

    const focusExecutive = useCallback((executive) => {
        const shouldCollapse = expandedId === executive.uid;
        setSelectedId(executive.uid);
        setExpandedId(shouldCollapse ? null : executive.uid);
        setDrawerOpen(false);

        const point = getExecutivePoint(executive);
        if (point) {
            setMapCenter(point);
            setMapZoom(16);
            mapRef.current?.panTo(point);
        }
    }, [expandedId]);

    const openExecutiveHistory = useCallback((executive) => {
        const id = executive?.uid || executive?.executiveId;
        if (!id) return;
        navigate(`/delivery-partners/${id}`);
    }, [navigate]);

    const recenterSelected = () => {
        const point = getExecutivePoint(selectedExecutive);
        if (!point) return;
        setMapCenter(point);
        setMapZoom(16);
        mapRef.current?.panTo(point);
    };

    const avgEta = useMemo(() => {
        const values = operationalExecutives
            .map((executive) => executive.orderDetails?.route?.totalEtaMinutes)
            .filter((value) => Number.isFinite(Number(value)))
            .map(Number);
        if (values.length === 0) return '-';
        return `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)} min`;
    }, [operationalExecutives]);

    const mapOptions = useMemo(() => ({
        styles: mapStyle,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        zoomControlOptions:
            typeof window !== 'undefined' && window.google
                ? { position: window.google.maps.ControlPosition.RIGHT_CENTER }
                : undefined,
    }), [isLoaded]);

    const route = selectedExecutive?.orderDetails?.route;
    const selectedTone = getStatusTone(selectedExecutive);

    return (
        <div className="min-h-[calc(100vh-86px)] bg-slate-100 p-2 lg:p-3">
            <style>{`
                .operations-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .operations-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
            `}</style>

            <div className="mx-auto flex max-w-[1800px] flex-col gap-2">
                <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-[310px] items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <Navigation size={21} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black leading-tight text-slate-950">Live Executive Tracking</h1>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Today active deliveries only</p>
                        </div>
                    </div>

                    <div className="operations-scroll flex flex-1 justify-center gap-3 overflow-x-auto pb-1 xl:pb-0">
                        <MetricPill icon={Bike} label="Online" value={operationalExecutives.length} tone="green" />
                        <MetricPill icon={Package} label="Active Deliveries" value={operationalExecutives.length} tone="blue" />
                        <MetricPill icon={MapPin} label="GPS Active" value={operationalExecutives.filter(isFreshGps).length} tone="green" />
                        <MetricPill icon={Wifi} label="Live Sync" value={loading ? 'Syncing' : 'Active'} tone={loading ? 'orange' : 'green'} />
                    </div>

                    <div className="min-w-[130px] text-left xl:text-right">
                        <p className="text-xs font-semibold text-slate-400">Last updated</p>
                        <p className="text-xl font-black text-slate-950">
                            {lastRefreshed ? lastRefreshed.toLocaleTimeString('en-IN') : '-'}
                        </p>
                    </div>
                </header>

                <div className="grid gap-2 xl:h-[calc(100vh-164px)] xl:min-h-[620px] xl:grid-cols-[350px_minmax(0,1fr)]">
                    <aside className={`fixed inset-x-2 bottom-2 z-30 max-h-[58vh] rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform xl:static xl:z-auto xl:max-h-none xl:translate-y-0 xl:shadow-sm ${
                        drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'
                    }`}>
                        <button
                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 xl:hidden"
                            onClick={() => setDrawerOpen((open) => !open)}
                        >
                            <span className="text-sm font-black text-slate-900">Active deliveries</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{filteredExecutives.length}</span>
                        </button>

                        <div className="flex h-full flex-col">
                            <div className="grid grid-cols-2 border-b border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setActivePanel('routes')}
                                    className={`px-4 py-4 text-sm font-black transition ${
                                        activePanel === 'routes'
                                            ? 'border-b-2 border-indigo-500 text-indigo-600'
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    Current Routes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivePanel('activity')}
                                    className={`px-4 py-4 text-sm font-black transition ${
                                        activePanel === 'activity'
                                            ? 'border-b-2 border-indigo-500 text-indigo-600'
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    Activity Feed
                                </button>
                            </div>

                            <div className="relative mx-4 mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder={activePanel === 'routes' ? 'Search route, executive, order' : 'Search activity'}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <div className="flex items-center justify-between px-4 pb-2 pt-5">
                                <div>
                                    <p className="text-lg font-black text-slate-950">
                                        {activePanel === 'routes' ? 'Current Routes' : 'Live Activity Feed'}
                                    </p>
                                    <p className="text-sm font-semibold text-slate-400">
                                        {activePanel === 'routes'
                                            ? 'Online GPS + active order'
                                            : 'Offline, GPS stale, and non-active signals'}
                                    </p>
                                </div>
                                {activePanel === 'routes' ? (
                                    <button
                                        onClick={() => fetchLocations(true)}
                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm hover:bg-slate-800"
                                        title="Refresh tracking"
                                    >
                                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                ) : (
                                    <p className="text-xs font-semibold text-slate-400">
                                        Sync {lastRefreshed ? lastRefreshed.toLocaleTimeString('en-IN') : '-'}
                                    </p>
                                )}
                            </div>

                            <div className="operations-scroll flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                                {activePanel === 'routes' ? (
                                    <>
                                        {loading && executives.length === 0 ? (
                                            Array.from({ length: 5 }).map((_, index) => (
                                                <div key={index} className="h-[92px] animate-pulse rounded-2xl bg-slate-100" />
                                            ))
                                        ) : filteredExecutives.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                                                <p className="text-sm font-black text-slate-700">No active deliveries right now</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">Check Activity Feed for offline or stale GPS executives.</p>
                                            </div>
                                        ) : (
                                            filteredExecutives.map((executive) => (
                                                <ExecutiveCard
                                                    key={executive.uid}
                                                    executive={executive}
                                                    selected={selectedExecutive?.uid === executive.uid}
                                                    expanded={expandedId === executive.uid}
                                                    onSelect={focusExecutive}
                                                    onOpenOrder={(orderId) => navigate(`/orders/${orderId}`)}
                                                    onOpenExecutive={openExecutiveHistory}
                                                />
                                            ))
                                        )}

                                        {filteredActivityExecutives.length > 0 && (
                                            <div className="pt-3">
                                                <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                                    Offline ({filteredActivityExecutives.length})
                                                </p>
                                                <div className="space-y-2">
                                                    {filteredActivityExecutives.slice(0, 6).map((executive) => (
                                                        <ActivityCard
                                                            key={executive.uid}
                                                            executive={executive}
                                                            onOpenExecutive={openExecutiveHistory}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {filteredActivityExecutives.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                                                <p className="text-sm font-black text-slate-700">No activity signals found</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">Try another search or refresh tracking.</p>
                                            </div>
                                        ) : (
                                            filteredActivityExecutives.map((executive) => (
                                                <ActivityCard
                                                    key={executive.uid}
                                                    executive={executive}
                                                    onOpenExecutive={openExecutiveHistory}
                                                />
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="flex min-w-0 flex-col">
                        <section className="relative h-full min-h-[620px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {!GOOGLE_MAPS_API_KEY && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 p-6 text-center backdrop-blur-sm">
                                    <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                        <p className="text-base font-black text-amber-900">Google Maps key missing</p>
                                        <p className="mt-2 text-sm font-semibold text-amber-700">
                                            Add VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_API_KEY in the admin environment.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(loadError || !isLoaded) && GOOGLE_MAPS_API_KEY && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                                    <div className="text-center">
                                        <RefreshCw className="mx-auto animate-spin text-red-500" size={28} />
                                        <p className="mt-3 text-sm font-black text-slate-700">
                                            {loadError ? 'Unable to load Google Maps' : 'Loading live map'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isLoaded && GOOGLE_MAPS_API_KEY && (
                                <GoogleMap
                                    mapContainerClassName="h-full w-full"
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    options={mapOptions}
                                    onLoad={(map) => {
                                        mapRef.current = map;
                                    }}
                                >
                                    {routePath.length > 1 && (
                                        <PolylineF
                                            path={routePath}
                                            options={{
                                                strokeColor: '#2563eb',
                                                strokeOpacity: 0.9,
                                                strokeWeight: 5,
                                            }}
                                        />
                                    )}

                                    {routePath.length <= 1 && fallbackRoutePath.length > 1 && (
                                        <PolylineF
                                            path={fallbackRoutePath}
                                            options={{
                                                strokeColor: '#2563eb',
                                                strokeOpacity: 0.75,
                                                strokeWeight: 4,
                                                icons: [{
                                                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                                                    offset: '0',
                                                    repeat: '18px',
                                                }],
                                            }}
                                        />
                                    )}

                                    {selectedTrail.length > 1 && (
                                        <PolylineF
                                            path={selectedTrail}
                                            options={{
                                                strokeColor: '#10b981',
                                                strokeOpacity: 0.55,
                                                strokeWeight: 3,
                                            }}
                                        />
                                    )}

                                    {mapExecutives.map((executive) => {
                                        const point = getExecutivePoint(executive);
                                        if (!point) return null;
                                        const presence = getGpsPresence(executive);
                                        const color = presence.online ? markerColors.green : markerColors.red;
                                        return (
                                            <PhotoMapMarker
                                                key={executive.uid}
                                                point={point}
                                                color={color}
                                                name={executive.name}
                                                imageUrl={executive.imageUrl}
                                                label={presence.online ? 'Online' : 'Offline'}
                                                title={presence.title}
                                                active={selectedExecutive?.uid === executive.uid}
                                            />
                                        );
                                    })}

                                    {routePoints.restaurant && (
                                        <PhotoMapMarker
                                            point={routePoints.restaurant}
                                            color="#f97316"
                                            name={selectedExecutive?.orderDetails?.restaurantName}
                                            imageUrl={selectedExecutive?.orderDetails?.restaurantImageUrl}
                                            icon={Store}
                                            label="Restaurant"
                                        />
                                    )}
                                    {routePoints.customer && (
                                        <PhotoMapMarker
                                            point={routePoints.customer}
                                            color="#2563eb"
                                            name={selectedExecutive?.orderDetails?.customerName}
                                            imageUrl={selectedExecutive?.orderDetails?.customerImageUrl}
                                            icon={User}
                                            label="Customer"
                                        />
                                    )}
                                </GoogleMap>
                            )}

                            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
                                <div className="pointer-events-auto max-w-[520px] rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                                        <span className={`rounded-full border px-2 py-0.5 ${toneClasses[selectedTone]}`}>
                                            {selectedExecutive ? formatStatus(selectedExecutive.status) : 'No active route'}
                                        </span>
                                        <span className="text-slate-500">
                                            Executive - Restaurant - Customer
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-900">{formatEta(route?.totalEtaMinutes)}</span>
                                        <span className="text-slate-500">{formatKm(route?.totalDistanceKm)}</span>
                                    </div>
                                </div>

                                <div className="pointer-events-auto flex gap-2">
                                    <button
                                        onClick={recenterSelected}
                                        disabled={!getExecutivePoint(selectedExecutive)}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50 disabled:opacity-50"
                                        title="Locate selected executive"
                                    >
                                        <LocateFixed size={17} />
                                    </button>
                                    <button
                                        onClick={() => fetchLocations(true)}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50"
                                        title="Refresh GPS"
                                    >
                                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default LiveTracking;
