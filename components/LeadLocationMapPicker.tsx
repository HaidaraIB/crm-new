import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import { DEFAULT_MAP_CENTER, parseLeadCoordinate } from '../utils/leadLocation';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker assets under Vite bundling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type LeadLocationMapPickerProps = {
  latitude: string | number | null | undefined;
  longitude: string | number | null | undefined;
  onChange: (lat: number | null, lng: number | null) => void;
  readOnly?: boolean;
  className?: string;
};

/** OSM.org tiles are often slow/rate-limited; Carto CDN is faster for interactive pickers. */
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => {
      map.invalidateSize({ animate: false });
    };
    fix();
    const t1 = window.setTimeout(fix, 100);
    const t2 = window.setTimeout(fix, 400);
    window.addEventListener('resize', fix);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', fix);
    };
  }, [map]);
  return null;
}

function MapFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], 16, { animate: true });
    }
  }, [target, map]);
  return null;
}

function MapRecenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  useEffect(() => {
    const last = prev.current;
    if (
      last &&
      last.lat === lat &&
      last.lng === lng &&
      last.zoom === zoom
    ) {
      return;
    }
    prev.current = { lat, lng, zoom };
    map.setView([lat, lng], zoom, { animate: false });
  }, [lat, lng, zoom, map]);
  return null;
}

function MapClickHandler({
  readOnly,
  onPick,
}: {
  readOnly?: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        onPick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const LeadLocationMapPicker: React.FC<LeadLocationMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  className = '',
}) => {
  const { t } = useAppContext();

  const lat = parseLeadCoordinate(latitude);
  const lng = parseLeadCoordinate(longitude);
  const hasMarker = lat != null && lng != null;

  const center = useMemo(
    () => (hasMarker ? { lat: lat!, lng: lng! } : DEFAULT_MAP_CENTER),
    [hasMarker, lat, lng]
  );

  const zoom = hasMarker ? 16 : 12;

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleClear = () => {
    setLocError(null);
    setFlyTarget(null);
    onChange(null, null);
  };

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError(t('employeeLocationRequired'));
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: la, longitude: lo } = position.coords;
        if (!readOnly) {
          onChange(la, lo);
        }
        setFlyTarget({ lat: la, lng: lo });
        setLocating(false);
      },
      () => {
        setLocError(t('employeeLocationRequired'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [onChange, readOnly, t]);

  return (
    <div className={className}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {readOnly
          ? t('leadLocation') || "Lead's location"
          : t('setLeadLocationOnMap') || 'Set location on map'}
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleUseMyLocation}
          disabled={locating}
          loading={locating}
        >
          {locating ? t('gettingLocation') : t('useMyLocation')}
        </Button>
        {!readOnly && hasMarker && (
          <Button type="button" variant="secondary" onClick={handleClear}>
            {t('clearLeadLocation') || 'Clear location'}
          </Button>
        )}
      </div>
      {locError && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{locError}</p>
      )}
      <div
        className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 z-0"
        style={{ height: readOnly ? 220 : 280 }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          scrollWheelZoom={!readOnly}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
          preferCanvas
        >
          <TileLayer
            attribution={MAP_TILE_ATTRIBUTION}
            url={MAP_TILE_URL}
            subdomains="abcd"
            maxZoom={20}
            updateWhenIdle
            keepBuffer={4}
          />
          <MapInvalidateSize />
          <MapRecenter lat={center.lat} lng={center.lng} zoom={zoom} />
          <MapFlyTo target={flyTarget} />
          <MapClickHandler readOnly={readOnly} onPick={onChange} />
          {hasMarker && (
            <Marker
              position={[lat!, lng!]}
              draggable={!readOnly}
              eventHandlers={
                readOnly
                  ? undefined
                  : {
                      dragend: (e) => {
                        const pos = e.target.getLatLng();
                        onChange(pos.lat, pos.lng);
                      },
                    }
              }
            />
          )}
        </MapContainer>
      </div>
      {hasMarker && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
          {lat!.toFixed(6)}, {lng!.toFixed(6)}
        </p>
      )}
    </div>
  );
};
