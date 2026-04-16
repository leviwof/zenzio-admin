import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Bike, User, RefreshCw, MapPin, Search, ChevronRight, LocateFixed } from 'lucide-react';
import { getLivePartnerLocations } from '../../services/api';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker component for delivery partners
const PartnerMarker = ({ partner, isFocused }) => {
    const customIcon = new L.DivIcon({
        html: `
      <div class="relative">
        <div class="p-2 ${isFocused ? 'bg-red-600' : 'bg-blue-600'} rounded-full border-2 border-white shadow-lg animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>
        ${isFocused ? `
          <div class="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-[12px] font-bold shadow-xl border-2 border-white whitespace-nowrap z-50">
            Target: ${partner.name}
          </div>
        ` : `
          <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap border border-gray-100">
            ${partner.name}
          </div>
        `}
      </div>
    `,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

    return (
        <Marker position={[partner.lat, partner.lng]} icon={customIcon} zIndexOffset={isFocused ? 1000 : 0}>
            <Popup className="partner-popup">
                <div className="p-1">
                    <h3 className="font-bold text-gray-800">{partner.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">ID: {partner.uid}</p>
                    <div className="flex items-center mt-2 text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-600 font-medium">{partner.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Last seen: {partner.lastUpdated ? new Date(partner.lastUpdated).toLocaleTimeString() : 'N/A'}</p>
                </div>
            </Popup>
        </Marker>
    );
};

// Component to handle map center changes
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, {
                duration: 1.5
            });
        }
    }, [center, zoom, map]);
    return null;
};

const LiveTracking = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default to Bangalore
    const [zoom, setZoom] = useState(13);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedPartnerId, setFocusedPartnerId] = useState(null);
    const isInitialLoad = React.useRef(true);

    const fetchLocations = async (isManual = false) => {
        if (isManual) setLoading(true);
        try {
            const response = await getLivePartnerLocations();
            const docs = response.data?.data || [];

            setPartners(docs);

            const onlineDocs = docs.filter(p => p.status === 'Online');

            // Initial auto-center if it's the very first successful load with partners
            if (onlineDocs.length > 0 && isInitialLoad.current) {
                const lat = onlineDocs.reduce((acc, p) => acc + Number(p.lat), 0) / onlineDocs.length;
                const lng = onlineDocs.reduce((acc, p) => acc + Number(p.lng), 0) / onlineDocs.length;
                setMapCenter([lat, lng]);
                isInitialLoad.current = false;
            }

            setLastRefreshed(new Date());
        } catch (error) {
            console.error('Failed to fetch live locations:', error);
        } finally {
            if (isManual) setLoading(false);
            // After first load, we stop showing the full screen loader
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000); // Pulse every 10s
        return () => clearInterval(interval);
    }, []);

    const onlinePartners = useMemo(() => partners.filter(p => p.status === 'Online'), [partners]);

    const filteredPartners = useMemo(() => {
        return onlinePartners.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.uid.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [onlinePartners, searchQuery]);

    const handleFocusPartner = (partner) => {
        setFocusedPartnerId(partner.uid);
        setMapCenter([partner.lat, partner.lng]);
        setZoom(16);
    };

    return (
        <div className="p-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Navigation className="text-red-500" />
                        Live Partner Tracking
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Find and follow your delivery partners in real-time
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="font-bold text-gray-700">{onlinePartners.length} Live</span>
                        <span className="text-gray-400">/ {partners.length} On Duty</span>
                    </div>
                    <button
                        onClick={() => fetchLocations(true)}
                        className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <span className="text-gray-400 italic">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Search & List Panel */}
                <div className="w-80 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <User size={16} className="text-gray-400" />
                                Online Partners ({filteredPartners.length})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {filteredPartners.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Search size={20} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium">No active partners found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                filteredPartners.map(partner => (
                                    <button
                                        key={partner.uid}
                                        onClick={() => handleFocusPartner(partner)}
                                        className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left ${focusedPartnerId === partner.uid
                                            ? 'bg-red-50 border-red-200 ring-1 ring-red-100'
                                            : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${focusedPartnerId === partner.uid ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                            <Bike size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">{partner.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">ID: {partner.uid}</p>
                                        </div>
                                        <ChevronRight size={16} className={focusedPartnerId === partner.uid ? 'text-red-400' : 'text-gray-300'} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Map View */}
                <div className="flex-1 rounded-3xl overflow-hidden border border-gray-200 shadow-2xl relative bg-white">
                    {loading && partners.length === 0 && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <RefreshCw className="animate-spin text-red-500 mb-2" size={32} />
                                <p className="text-gray-600 font-medium tracking-wide">Initializing Live Map...</p>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={mapCenter}
                        zoom={zoom}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {onlinePartners.map((partner) => (
                            <PartnerMarker
                                key={partner.uid}
                                partner={partner}
                                isFocused={focusedPartnerId === partner.uid}
                            />
                        ))}
                        <ChangeView center={mapCenter} zoom={zoom} />
                    </MapContainer>

                    {/* Controls Overlay */}
                    <div className="absolute top-6 right-6 flex flex-col gap-3 z-[1000]">
                        <button
                            onClick={() => {
                                if (onlinePartners.length > 0) {
                                    const lat = onlinePartners.reduce((acc, p) => acc + Number(p.lat), 0) / onlinePartners.length;
                                    const lng = onlinePartners.reduce((acc, p) => acc + Number(p.lng), 0) / onlinePartners.length;
                                    setMapCenter([lat, lng]);
                                    setZoom(13);
                                    setFocusedPartnerId(null);
                                }
                            }}
                            className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 hover:bg-gray-50 transition-colors text-gray-700"
                            title="Recenter Map"
                        >
                            <LocateFixed size={20} />
                        </button>
                    </div>

                    {/* Legend/Info Panel Overlay */}
                    <div className="absolute bottom-10 left-10 bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-gray-100 z-[1000] w-72 hover:bg-white transition-all transform hover:-translate-y-1">
                        <h3 className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-[0.2em]">Map Systems</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Bike size={18} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-gray-800">Live Partners</span>
                                        <span className="text-[10px] text-gray-500">Active GPS Signal</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-blue-600">{onlinePartners.length}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                        <MapPin size={18} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold text-gray-800">Offline Peers</span>
                                        <span className="text-[10px] text-gray-500">No Signal / On Duty</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-orange-600">{partners.length - onlinePartners.length}</span>
                            </div>
                        </div>
                        <div className="mt-5 pt-5 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase tracking-wider bg-green-50 p-2 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                Live Sync Active
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    {focusedPartnerId && (
                        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md z-[1000] flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-top-4">
                            <div className="p-2 bg-red-500 rounded-lg animate-pulse">
                                <Bike size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Following</p>
                                <p className="text-sm font-bold">{onlinePartners.find(p => p.uid === focusedPartnerId)?.name}</p>
                            </div>
                            <button
                                onClick={() => setFocusedPartnerId(null)}
                                className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} className="rotate-90 transform" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveTracking;
