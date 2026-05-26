import React, { useEffect, useMemo, useRef } from 'react';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_GOOGLE_API_KEY ||
  import.meta.env.GOOGLE_MAPS_API_KEY ||
  import.meta.env.GOOGLE_API_KEY;
const GOOGLE_LIBRARIES = ['places'];

const mapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
];

const markerColors = {
  partner: '#2563eb',
  restaurant: '#f97316',
  customer: '#16a34a',
};

const parseCoordinatePair = (point) => {
  if (point?.lat == null || point?.lng == null) return null;

  let lat = Number(point.lat);
  let lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const looksGloballySwapped = Math.abs(lat) > 90 && Math.abs(lng) <= 90;
  const looksIndiaSwapped = lat >= 68 && lat <= 98 && lng >= 6 && lng <= 38;

  if (looksGloballySwapped || looksIndiaSwapped) {
    const originalLat = lat;
    lat = lng;
    lng = originalLat;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || lat === 0 || lng === 0) {
    return null;
  }

  return { lat, lng };
};

const createMarkerIcon = (color) => {
  if (!window.google?.maps) return undefined;

  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
    scale: 9,
  };
};

const DeliveryMap = ({ partner, restaurant, customer, totalDistance, height = '400px', className = '' }) => {
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });

  const partnerCoord = parseCoordinatePair(partner);
  const restaurantCoord = parseCoordinatePair(restaurant);
  const customerCoord = parseCoordinatePair(customer);

  const routePoints = useMemo(() => {
    const points = [];
    if (partnerCoord) points.push(partnerCoord);
    if (restaurantCoord) points.push(restaurantCoord);
    if (customerCoord) points.push(customerCoord);
    return points;
  }, [partnerCoord, restaurantCoord, customerCoord]);

  const hasValidData = routePoints.length >= 2;
  const center = routePoints[0] || { lat: 11.9416, lng: 79.8083 };

  useEffect(() => {
    if (!isLoaded || !mapRef.current || routePoints.length < 2) return;

    const bounds = new window.google.maps.LatLngBounds();
    routePoints.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, 56);
  }, [isLoaded, routePoints]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`w-full rounded-lg border border-amber-200 bg-amber-50 p-6 text-center ${className}`} style={{ height }}>
        <p className="text-amber-800 font-semibold">Google Maps key missing</p>
        <p className="mt-2 text-sm text-amber-700">Add VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_API_KEY in the admin environment.</p>
      </div>
    );
  }

  if (loadError || !isLoaded) {
    return (
      <div className={`w-full rounded-lg border border-slate-200 bg-slate-50 p-6 text-center ${className}`} style={{ height }}>
        <p className="text-slate-700 font-semibold">{loadError ? 'Unable to load Google Maps' : 'Loading route map...'}</p>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className={`w-full rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center ${className}`} style={{ height }}>
        <p className="text-yellow-700 font-semibold">Location data unavailable</p>
        <p className="mt-2 text-sm text-yellow-600">
          {totalDistance !== null && totalDistance !== undefined
            ? `Total Route Distance: ${Number(totalDistance).toFixed(2)} km`
            : 'Distance data not available'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={center}
        zoom={13}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          styles: mapStyle,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
      >
        {partnerCoord && (
          <MarkerF
            position={partnerCoord}
            icon={createMarkerIcon(markerColors.partner)}
            label={{ text: 'DE', color: '#ffffff', fontSize: '10px', fontWeight: '700' }}
            title={partner?.label || 'Delivery Executive'}
          />
        )}

        {restaurantCoord && (
          <MarkerF
            position={restaurantCoord}
            icon={createMarkerIcon(markerColors.restaurant)}
            label={{ text: 'R', color: '#ffffff', fontSize: '11px', fontWeight: '700' }}
            title={restaurant?.label || 'Restaurant'}
          />
        )}

        {customerCoord && (
          <MarkerF
            position={customerCoord}
            icon={createMarkerIcon(markerColors.customer)}
            label={{ text: 'C', color: '#ffffff', fontSize: '11px', fontWeight: '700' }}
            title={customer?.label || 'Customer'}
          />
        )}

        <PolylineF
          path={routePoints}
          options={{
            strokeColor: '#4f46e5',
            strokeOpacity: 0.86,
            strokeWeight: 5,
          }}
        />
      </GoogleMap>

      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
        <div className="mx-auto w-fit rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm border border-indigo-100">
          <p className="text-sm font-bold text-indigo-700">
            Total Route Distance: {totalDistance != null
              ? `${Number(totalDistance).toFixed(2)} km`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
