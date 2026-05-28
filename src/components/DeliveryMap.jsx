import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, OverlayView, PolylineF, useJsApiLoader } from '@react-google-maps/api';

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

const markerConfig = {
  partner: { color: '#2563eb', initials: 'DE', label: 'Delivery Executive' },
  restaurant: { color: '#f97316', initials: 'R', label: 'Restaurant' },
  customer: { color: '#16a34a', initials: 'C', label: 'Customer' },
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
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

const photoMarkerConfigEqual = (prev, next) =>
  prev.point?.lat === next.point?.lat &&
  prev.point?.lng === next.point?.lng &&
  prev.imageUrl === next.imageUrl &&
  prev.name === next.name &&
  prev.config === next.config;

const PhotoMarker = React.memo(({ point, config, imageUrl, name }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  if (!point) return null;

  const hasImage = imageUrl && !imgFailed;

  return (
    <OverlayView position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div
          className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-white text-[11px] font-black text-white shadow-xl"
          style={{ background: config.color, boxShadow: `0 0 0 4px ${config.color}24, 0 12px 24px rgba(15,23,42,0.2)` }}
          title={name || config.label}
        >
          {hasImage ? (
            <img
              src={imageUrl}
              alt={config.label}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            getInitials(name) || config.initials
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: config.color }} />
        </div>
        <div className="absolute left-1/2 top-[48px] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-700 shadow">
          {config.label}
        </div>
      </div>
    </OverlayView>
  );
}, photoMarkerConfigEqual);

const DeliveryMap = ({ partner, restaurant, customer, totalDistance, height = '400px', className = '' }) => {
  const mapRef = useRef(null);
  const fitBoundsKeyRef = useRef('');
  const [routePath, setRoutePath] = useState([]);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });

  const partnerCoord = useMemo(() => parseCoordinatePair(partner), [partner?.lat, partner?.lng]);
  const restaurantCoord = useMemo(() => parseCoordinatePair(restaurant), [restaurant?.lat, restaurant?.lng]);
  const customerCoord = useMemo(() => parseCoordinatePair(customer), [customer?.lat, customer?.lng]);

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

    const key = routePoints.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
    if (fitBoundsKeyRef.current === key) return;
    fitBoundsKeyRef.current = key;

    const bounds = new window.google.maps.LatLngBounds();
    routePoints.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, 56);
  }, [isLoaded, routePoints]);

  useEffect(() => {
    if (!isLoaded || !window.google || !partnerCoord || !restaurantCoord || !customerCoord) {
      setRoutePath([]);
      return;
    }

    const fallbackDirectionsService = () => {
      try {
        const service = new window.google.maps.DirectionsService();
        service.route(
          {
            origin: partnerCoord,
            destination: customerCoord,
            waypoints: [{ location: restaurantCoord, stopover: true }],
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
            latLng: { latitude: partnerCoord.lat, longitude: partnerCoord.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: customerCoord.lat, longitude: customerCoord.lng },
          },
        },
        intermediates: [
          {
            location: {
              latLng: { latitude: restaurantCoord.lat, longitude: restaurantCoord.lng },
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
  }, [isLoaded, partnerCoord, restaurantCoord, customerCoord]);

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
        {routePath.length > 1 && (
          <PolylineF
            path={routePath}
            options={{
              strokeColor: '#4f46e5',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }}
          />
        )}

        {routePath.length <= 1 && routePoints.length > 1 && (
          <PolylineF
            path={routePoints}
            options={{
              strokeColor: '#4f46e5',
              strokeOpacity: 0.86,
              strokeWeight: 5,
            }}
          />
        )}

        {partnerCoord && (
          <PhotoMarker
            point={partnerCoord}
            config={markerConfig.partner}
            imageUrl={partner?.imageUrl}
            name={partner?.label}
          />
        )}

        {restaurantCoord && (
          <PhotoMarker
            point={restaurantCoord}
            config={markerConfig.restaurant}
            imageUrl={restaurant?.imageUrl}
            name={restaurant?.label}
          />
        )}

        {customerCoord && (
          <PhotoMarker
            point={customerCoord}
            config={markerConfig.customer}
            imageUrl={customer?.imageUrl}
            name={customer?.label}
          />
        )}
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
