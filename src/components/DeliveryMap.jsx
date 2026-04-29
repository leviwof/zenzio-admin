import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ===== Fix Leaftet default icon issue in Webpack/React =====
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ===== Custom Icons =====
const createIcon = (color) =>
  new L.DivIcon({
    html: `<div style="background-color:${color}; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const PARTNER_ICON = createIcon('#3b82f6');    // blue
const RESTAURANT_ICON = createIcon('#f97316'); // orange
const CUSTOMER_ICON = createIcon('#22c55e');  // green

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

  return [lat, lng];
};

// ===== Auto-fit bounds to all markers =====
const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points && points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);

  return null;
};

const DeliveryMap = ({ partner, restaurant, customer, totalDistance }) => {
  const mapRef = useRef(null);

  const partnerCoord = parseCoordinatePair(partner);
  const restaurantCoord = parseCoordinatePair(restaurant);
  const customerCoord = parseCoordinatePair(customer);

  // ===== Build route polyline points =====
  const routePoints = [];
  if (partnerCoord) routePoints.push(partnerCoord);
  if (restaurantCoord) routePoints.push(restaurantCoord);
  if (customerCoord) routePoints.push(customerCoord);

  // ===== Check if we have at least 2 points to render a map =====
  const hasValidData = routePoints.length >= 2;

  if (!hasValidData) {
    return (
      <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center" style={{ height: '400px' }}>
        <p className="text-yellow-700 font-semibold">Location data unavailable</p>
        <p className="mt-2 text-sm text-yellow-600">
          {totalDistance !== null && totalDistance !== undefined
            ? `Total Route Distance: ${Number(totalDistance).toFixed(2)} km`
            : 'Distance data not available'}
        </p>
      </div>
    );
  }

  // ===== Center map on first point =====
  const center = routePoints[0];

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: '400px' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Partner Marker */}
        {partnerCoord && (
          <Marker position={partnerCoord} icon={PARTNER_ICON}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-blue-600">{partner?.label || 'Delivery Partner'}</p>
                <p className="text-gray-500">{partnerCoord[0].toFixed(4)}, {partnerCoord[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Restaurant Marker */}
        {restaurantCoord && (
          <Marker position={restaurantCoord} icon={RESTAURANT_ICON}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-orange-600">{restaurant?.label || 'Restaurant'}</p>
                <p className="text-gray-500">{restaurantCoord[0].toFixed(4)}, {restaurantCoord[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Customer Marker */}
        {customerCoord && (
          <Marker position={customerCoord} icon={CUSTOMER_ICON}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-green-600">{customer?.label || 'Customer'}</p>
                <p className="text-gray-500">{customerCoord[0].toFixed(4)}, {customerCoord[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        <Polyline
          positions={routePoints}
          pathOptions={{
            color: '#4f46e5',
            weight: 4,
            opacity: 0.8,
          }}
        />

        {/* Auto-fit bounds */}
        <FitBounds points={routePoints} />
      </MapContainer>

      {/* Distance overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
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
