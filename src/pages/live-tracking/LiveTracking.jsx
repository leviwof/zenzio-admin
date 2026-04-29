import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Bike,
    Clock,
    LocateFixed,
    MapPin,
    Navigation,
    Package,
    RefreshCw,
    Search,
    Store,
    User,
    X,
} from 'lucide-react';
import { getLivePartnerLocations } from '../../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_CENTER = [12.9716, 77.5946];

const normalizeCoordinate = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const ChangeView = ({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.2 });
        }
    }, [center, zoom, map]);

    return null;
};

const PartnerMarker = ({ partner, isFocused, onFocus }) => {
    const customIcon = new L.DivIcon({
        html: `
            <div class="relative">
                <div class="h-11 w-11 rounded-full border-4 border-white shadow-xl flex items-center justify-center ${isFocused ? 'bg-red-500' : 'bg-slate-900'}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="5.5" cy="17.5" r="2.5"></circle>
                        <circle cx="18.5" cy="17.5" r="2.5"></circle>
                        <path d="M15 6h2l3 5"></path>
                        <path d="M5 17.5 8 8h7"></path>
                    </svg>
                </div>
                <div class="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm whitespace-nowrap">
                    ${partner.name}
                </div>
            </div>
        `,
        className: 'custom-div-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
    });

    return (
        <Marker
            position={[partner.lat, partner.lng]}
            icon={customIcon}
            zIndexOffset={isFocused ? 1000 : 0}
            eventHandlers={{ click: () => onFocus?.(partner) }}
        >
            <Popup>
                <div className="min-w-[180px] p-1">
                    <p className="font-bold text-slate-900">{partner.name}</p>
                    <p className="mt-1 text-xs text-slate-500">ID: {partner.uid}</p>
                    <p className="mt-2 text-xs text-slate-600">
                        Status: <span className="font-semibold text-slate-900">{partner.status}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Last seen: {partner.lastUpdated ? new Date(partner.lastUpdated).toLocaleTimeString() : 'N/A'}
                    </p>
                </div>
            </Popup>
        </Marker>
    );
};

const DeliveryLocationMarker = ({ order, isFocused }) => {
    const lat = normalizeCoordinate(
        order.deliveredLocationLat || 
        order.deliveryLat || 
        order.deliveryLocation?.lat ||
        order.addressLat
    );
    const lng = normalizeCoordinate(
        order.deliveredLocationLng || 
        order.deliveryLng || 
        order.deliveryLocation?.lng ||
        order.addressLng
    );

    if (lat === null || lng === null || (lat === 0 && lng === 0)) {
        return null;
    }

    const deliveryIcon = new L.DivIcon({
        html: `
            <div class="relative">
                <div class="h-10 w-10 rounded-full border-4 border-white shadow-xl bg-violet-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                </div>
            </div>
        `,
        className: 'delivery-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

    return (
        <Marker position={[lat, lng]} icon={deliveryIcon} zIndexOffset={isFocused ? 999 : -1}>
            <Popup>
                <div className="min-w-[200px] p-1">
                    <p className="font-bold text-violet-900">Delivery Location</p>
                    <p className="mt-1 text-xs text-slate-500">Order: {order.orderId}</p>
                    <p className="mt-2 text-xs text-slate-600">
                        Address: <span className="font-semibold text-slate-900">{order.deliveredLocationAddress || 'N/A'}</span>
                    </p>
                    {order.deliveredAt && (
                        <p className="mt-1 text-xs text-slate-500">
                            Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </Popup>
        </Marker>
    );
};

const RestaurantMarker = ({ order, isFocused }) => {
    const lat = normalizeCoordinate(order.restaurantLat);
    const lng = normalizeCoordinate(order.restaurantLng);

    if (lat === null || lng === null || (lat === 0 && lng === 0)) {
        return null;
    }

    const restaurantIcon = new L.DivIcon({
        html: `
            <div class="relative">
                <div class="h-10 w-10 rounded-full border-4 border-white shadow-xl bg-orange-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                        <path d="M7 2v20"></path>
                        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
                    </svg>
                </div>
            </div>
        `,
        className: 'restaurant-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

    return (
        <Marker position={[lat, lng]} icon={restaurantIcon} zIndexOffset={isFocused ? 998 : -1}>
            <Popup>
                <div className="min-w-[200px] p-1">
                    <p className="font-bold text-orange-900">Restaurant</p>
                    <p className="mt-1 text-xs text-slate-500">Order: {order.orderId}</p>
                    <p className="mt-2 text-xs text-slate-600">
                        Name: <span className="font-semibold text-slate-900">{order.restaurantName || 'N/A'}</span>
                    </p>
                </div>
            </Popup>
        </Marker>
    );
};

const formatDateTime = (value) => {
    if (!value) return 'Not available';

    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
    });
};

const formatStatus = (value) => {
    if (!value) return 'Unknown';
    return value.replace(/_/g, ' ');
};

const getOrderBadgeLabel = (order) => {
    if (!order) return 'No Active Order';
    if (order.deliveryStatus === 'delivered') return 'Order Delivered';
    return 'Active Order';
};

const formatCoordinatePair = (lat, lng) => {
    const normalizedLat = normalizeCoordinate(lat);
    const normalizedLng = normalizeCoordinate(lng);

    if (normalizedLat === null || normalizedLng === null) return null;
    return `${normalizedLat.toFixed(6)}, ${normalizedLng.toFixed(6)}`;
};

const getDeliveredLocationText = (order) => {
    if (!order) return 'Location not available';
    if (order.deliveredLocationAddress) return order.deliveredLocationAddress;

    const coordinates = formatCoordinatePair(order.deliveredLocationLat, order.deliveredLocationLng);
    return coordinates || 'Location not available';
};

const SummaryCard = ({ icon, label, value, hint, tone }) => {
    const toneClasses = {
        red: 'border-red-100 bg-red-50 text-red-600',
        blue: 'border-blue-100 bg-blue-50 text-blue-600',
        amber: 'border-amber-100 bg-amber-50 text-amber-600',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    };

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}>
                    {React.createElement(icon, { size: 20 })}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                    <p className="mt-1 text-sm text-slate-500">{hint}</p>
                </div>
            </div>
        </div>
    );
};

const LiveTracking = () => {
    const navigate = useNavigate();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [zoom, setZoom] = useState(13);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedPartnerId, setFocusedPartnerId] = useState(null);
    const [hiddenPartnerIds, setHiddenPartnerIds] = useState(new Set());
    const isInitialLoad = useRef(true);

    const fetchLocations = async (isManual = false) => {
        if (isManual) setLoading(true);

        try {
            const response = await getLivePartnerLocations();

            const docs = (response.data?.data || []).map((partner) => ({
                ...partner,
                lat: normalizeCoordinate(partner.lat) ?? 0,
                lng: normalizeCoordinate(partner.lng) ?? 0,
            }));
            setPartners(docs);

            const onlineDocs = docs.filter((partner) => partner.status === 'Online');
            if (onlineDocs.length > 0 && isInitialLoad.current) {
                const lat = onlineDocs.reduce((sum, partner) => sum + Number(partner.lat), 0) / onlineDocs.length;
                const lng = onlineDocs.reduce((sum, partner) => sum + Number(partner.lng), 0) / onlineDocs.length;
                setMapCenter([lat, lng]);
                isInitialLoad.current = false;
            }

            setLastRefreshed(new Date());
        } catch (error) {
            console.error('Failed to fetch live locations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000);
        return () => clearInterval(interval);
    }, []);

    const onlinePartners = useMemo(
        () => partners.filter((partner) => partner.status === 'Online'),
        [partners]
    );
    const offlinePartnersCount = useMemo(
        () => Math.max(partners.length - onlinePartners.length, 0),
        [partners.length, onlinePartners.length]
    );
    const partnersWithActiveOrders = useMemo(
        () => partners.filter((partner) => partner.orderDetails).length,
        [partners]
    );
    const visiblePartners = useMemo(
        () => partners.filter((partner) => partner.isActive || partner.status === 'Online' || partner.orderDetails),
        [partners]
    );
    const filteredPartners = useMemo(() => {
        return visiblePartners.filter((partner) => {
            const query = searchQuery.toLowerCase();
            return !hiddenPartnerIds.has(partner.uid) && (
                (partner.name || '').toLowerCase().includes(query) ||
                (partner.uid || '').toLowerCase().includes(query)
            );
        });
    }, [visiblePartners, searchQuery, hiddenPartnerIds]);
    const hiddenPartners = useMemo(
        () => {
            const query = searchQuery.toLowerCase();
            return partners.filter((partner) => hiddenPartnerIds.has(partner.uid) && (
                (partner.name || '').toLowerCase().includes(query) ||
                (partner.uid || '').toLowerCase().includes(query)
            ));
        },
        [partners, hiddenPartnerIds, searchQuery]
    );
    const focusedPartner = useMemo(
        () => partners.find((partner) => partner.uid === focusedPartnerId) || null,
        [partners, focusedPartnerId]
    );
    const partnersWithMapLocation = useMemo(() => {
        return partners.filter((partner) => {
            const lat = normalizeCoordinate(partner.lat);
            const lng = normalizeCoordinate(partner.lng);
            return lat !== null && lng !== null && !(lat === 0 && lng === 0);
        });
    }, [partners]);

    useEffect(() => {
        if (focusedPartnerId && !partners.some((partner) => partner.uid === focusedPartnerId)) {
            setFocusedPartnerId(null);
        }
    }, [partners, focusedPartnerId]);

    useEffect(() => {
        if (focusedPartnerId || partners.length === 0) return;

        const defaultPartner =
            partners.find((partner) => partner.orderDetails) ||
            partners.find((partner) => partner.status === 'Online') ||
            partners.find((partner) => partner.isActive);

        if (defaultPartner) {
            setFocusedPartnerId(defaultPartner.uid);
        }
    }, [partners, focusedPartnerId]);

    const handleFocusPartner = (partner) => {
        setFocusedPartnerId(partner.uid);

        const lat = Number(partner.lat);
        const lng = Number(partner.lng);

        if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
            setMapCenter([lat, lng]);
            setZoom(16);
        }
    };

    const handleResetMap = () => {
        if (onlinePartners.length > 0) {
            const lat = onlinePartners.reduce((sum, partner) => sum + Number(partner.lat), 0) / onlinePartners.length;
            const lng = onlinePartners.reduce((sum, partner) => sum + Number(partner.lng), 0) / onlinePartners.length;
            setMapCenter([lat, lng]);
            setZoom(13);
            return;
        }

        setMapCenter(DEFAULT_CENTER);
        setZoom(13);
    };

    const handleHidePartner = (partnerId) => {
        setHiddenPartnerIds((prev) => new Set([...prev, partnerId]));
        if (focusedPartnerId === partnerId) {
            setFocusedPartnerId(null);
        }
    };

    const handleShowHiddenPartner = (partnerId) => {
        setHiddenPartnerIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(partnerId);
            return newSet;
        });
    };

    const handleClearHiddenPartners = () => {
        setHiddenPartnerIds(new Set());
    };

    return (
        <div className="min-h-[calc(100vh-100px)] bg-slate-50 p-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
                            <Navigation className="text-red-500" />
                            Live Partner Tracking
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Track the current partner location on the map and open order details from the partner list.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                            <span className="font-semibold text-slate-900">{onlinePartners.length} live</span>
                            <span className="text-slate-400"> / {partners.length} total partners</span>
                        </div>
                        <button
                            onClick={() => fetchLocations(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <span className="text-sm text-slate-400">
                            Last updated: {lastRefreshed.toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Tracking Summary
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Quick view of who is live, offline, and currently carrying an order.
                            </p>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Live Sync Active
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            icon={Bike}
                            label="Live Partners"
                            value={onlinePartners.length}
                            hint="Partners sending GPS right now"
                            tone="blue"
                        />
                        <SummaryCard
                            icon={MapPin}
                            label="Offline"
                            value={offlinePartnersCount}
                            hint="No signal or currently offline"
                            tone="amber"
                        />
                        <SummaryCard
                            icon={Package}
                            label="Active Orders"
                            value={partnersWithActiveOrders}
                            hint="Partners currently linked to an order"
                            tone="emerald"
                        />
                        <SummaryCard
                            icon={User}
                            label="Trackable"
                            value={filteredPartners.length}
                            hint="Partners matching the current filter"
                            tone="red"
                        />
                    </div>
                </section>

                <section className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="flex h-[720px] min-h-0 flex-col rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Trackable Partners</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Choose a partner to focus the map. Details will open in the same card.
                                    </p>
                                </div>
                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                    {filteredPartners.length} shown
                                </div>
                            </div>

                            <div className="relative mt-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by partner name or ID"
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            {filteredPartners.length === 0 ? (
                                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                    <Search className="mb-3 text-slate-300" size={28} />
                                    <p className="text-sm font-semibold text-slate-700">No partners match this search</p>
                                    <p className="mt-1 text-sm text-slate-500">Try a different name or partner ID.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredPartners.map((partner) => {
                                        const isFocused = focusedPartnerId === partner.uid;
                                        const order = partner.orderDetails;

                                        return (
                                            <div
                                                key={partner.uid}
                                                className={`overflow-hidden rounded-3xl border transition ${
                                                    isFocused
                                                        ? 'border-red-200 bg-red-50/60 shadow-sm'
                                                        : 'border-slate-200 bg-white'
                                                }`}
                                            >
                                                <button
                                                    onClick={() => handleFocusPartner(partner)}
                                                    className="w-full p-4 text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                                                isFocused ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700'
                                                            }`}
                                                        >
                                                            <Bike size={20} />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-base font-bold text-slate-900">
                                                                        {partner.name}
                                                                    </p>
                                                                    <p className="mt-1 truncate text-xs text-slate-500">
                                                                        Partner ID: {partner.uid}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                                                                        {partner.status}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleHidePartner(partner.uid);
                                                                        }}
                                                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-100 hover:text-red-500"
                                                                        title="Hide from list"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {partner.isActive && (
                                                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                                                        On Duty
                                                                    </span>
                                                                )}
                                                                {order && (
                                                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                                        order.deliveryStatus === 'delivered'
                                                                            ? 'bg-violet-100 text-violet-700'
                                                                            : 'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                        {getOrderBadgeLabel(order)}
                                                                    </span>
                                                                )}
                                                                {!order && (
                                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                                                        No Active Order
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>

                                                {isFocused && (
                                                    <div className="border-t border-red-100 bg-white/80 p-4">
                                                        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                                                            <div>
                                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                    Current status
                                                                </p>
                                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                    {partner.status}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                    Last update
                                                                </p>
                                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                    {partner.lastUpdated
                                                                        ? new Date(partner.lastUpdated).toLocaleTimeString()
                                                                        : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {order ? (
                                                            <div className="mt-4 space-y-4">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                            Order Details
                                                                        </p>
                                                                        <p className="mt-1 text-base font-bold text-slate-900">
                                                                            {order.orderId}
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            navigate(`/orders/${order.orderId}`);
                                                                        }}
                                                                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                                                    >
                                                                        View Full Order
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                                                                        <Store size={16} className="mt-0.5 text-orange-500" />
                                                                        <div>
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                                Restaurant
                                                                            </p>
                                                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                                {order.restaurantName || 'Unknown restaurant'}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                                                                        <Package size={16} className="mt-0.5 text-emerald-500" />
                                                                        <div>
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                                Items
                                                                            </p>
                                                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                                {order.foodNames || 'Item details unavailable'}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                        {/* Ordered At and Accepted At removed as requested */}
                                                                    </div>

                                                                {(order.totalDistance ?? order.distance_km) !== null && (order.totalDistance ?? order.distance_km) !== undefined ? (
                                                                    <div className="rounded-2xl bg-blue-50 p-3">
                                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                                                                            Total Distance Traveled
                                                                        </p>
                                                                        <p className="mt-1 text-lg font-bold text-blue-600">
                                                                            {Number(order.totalDistance ?? order.distance_km).toFixed(2)} km
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-blue-500">
                                                                            Partner - Restaurant - Customer
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="rounded-2xl bg-gray-50 p-3">
                                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                                            Total Distance
                                                                        </p>
                                                                        <p className="mt-1 text-lg font-bold text-gray-400">-</p>
                                                                    </div>
                                                                )}

                                                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                        <div className="rounded-2xl bg-slate-50 p-3">
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                                Status
                                                                            </p>
                                                                            <p className={`mt-1 text-sm font-semibold capitalize ${
                                                                                order.deliveryStatus === 'delivered'
                                                                                    ? 'text-violet-700'
                                                                                    : 'text-slate-900'
                                                                            }`}>
                                                                                {formatStatus(order.deliveryStatus)}
                                                                            </p>
                                                                        </div>
                                                                        <div className="rounded-2xl bg-slate-50 p-3">
                                                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                                                {order.deliveryStatus === 'delivered' ? 'Delivered At' : 'Picked Up At'}
                                                                            </p>
                                                                            {order.deliveryStatus === 'delivered' ? (
                                                                                <>
                                                                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                                        {getDeliveredLocationText(order)}
                                                                                    </p>
                                                                                    <p className="mt-2 text-xs text-slate-500">
                                                                                        {formatDateTime(order.deliveredAt)}
                                                                                    </p>
                                                                                </>
                                                                            ) : (
                                                                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                                                                    {formatDateTime(order.pickedUpAt)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                                                This partner does not have an active order right now.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {hiddenPartners.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Hidden ({hiddenPartners.length})
                                    </p>
                                    <button
                                        onClick={handleClearHiddenPartners}
                                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                                    >
                                        Show all
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {hiddenPartners.map((partner) => (
                                        <div
                                            key={partner.uid}
                                            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-700">
                                                    {partner.name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {partner.uid}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleShowHiddenPartner(partner.uid)}
                                                className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
                                            >
                                                <Search size={12} />
                                                Show
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative h-[720px] min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        {loading && partners.length === 0 && (
                            <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white/85 backdrop-blur-sm">
                                <div className="text-center">
                                    <RefreshCw className="mx-auto animate-spin text-red-500" size={30} />
                                    <p className="mt-3 text-sm font-semibold text-slate-700">Loading live map...</p>
                                </div>
                            </div>
                        )}

                        <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {partnersWithMapLocation.map((partner) => (
                                <PartnerMarker
                                    key={partner.uid}
                                    partner={partner}
                                    isFocused={focusedPartnerId === partner.uid}
                                    onFocus={handleFocusPartner}
                                />
                            ))}
                            {focusedPartner?.orderDetails && (
                                <>
                                    <DeliveryLocationMarker
                                        order={focusedPartner.orderDetails}
                                        isFocused={true}
                                    />
                                    <RestaurantMarker
                                        order={focusedPartner.orderDetails}
                                        isFocused={true}
                                    />
                                </>
                            )}
                            <ChangeView center={mapCenter} zoom={zoom} />
                        </MapContainer>

                        <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="pointer-events-auto max-w-md rounded-3xl border border-white/80 bg-white/95 p-4 shadow-lg backdrop-blur">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    Current Partner Location
                                </p>
                                <p className="mt-2 text-xl font-bold text-slate-900">
                                    {focusedPartner?.name || 'Select a partner'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {focusedPartner ? (
                                        <>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                {focusedPartner.status}
                                            </span>
                                            {focusedPartner.locationSource && focusedPartner.locationSource !== 'none' && (
                                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                    Location: {focusedPartner.locationSource}
                                                </span>
                                            )}
                                            {focusedPartner.isActive && (
                                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                                    On Duty
                                                </span>
                                            )}
                                            {focusedPartner.orderDetails && (
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    focusedPartner.orderDetails.deliveryStatus === 'delivered'
                                                        ? 'bg-violet-100 text-violet-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {focusedPartner.orderDetails.deliveryStatus === 'delivered'
                                                        ? 'Order Delivered'
                                                        : 'Order Attached'}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-slate-500">
                                            Choose a partner from the left panel to center the map.
                                        </p>
                                    )}
                                </div>
                                {focusedPartner &&
                                    (() => {
                                        const lat = normalizeCoordinate(focusedPartner.lat);
                                        const lng = normalizeCoordinate(focusedPartner.lng);
                                        return (lat === null || lng === null || (lat === 0 && lng === 0));
                                    })() && (
                                    <p className="mt-3 text-sm text-amber-600">
                                        Current location is not available for this partner yet.
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleResetMap}
                                className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-50"
                                title="Recenter map"
                            >
                                <LocateFixed size={18} />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LiveTracking;
