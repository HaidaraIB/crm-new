import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import {
  clientLocationMapsUrl,
  DEFAULT_MAP_CENTER,
  parseLeadCoordinate,
} from '../utils/leadLocation';
import { MapPinIcon } from './icons';
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
  const mapHeightPx = readOnly ? 220 : 280;

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [mapMounted, setMapMounted] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMapMounted(true));
    return () => {
      window.cancelAnimationFrame(id);
      setMapMounted(false);
    };
  }, []);

  useLayoutEffect(() => {
    if (!mapMounted || !mapWrapRef.current) return;
    const clampMapHeight = () => {
      const wrap = mapWrapRef.current;
      if (!wrap) return;
      const px = `${mapHeightPx}px`;
      wrap.style.height = px;
      wrap.style.maxHeight = px;
      wrap.querySelectorAll('.leaflet-container, .leaflet-pane').forEach((node) => {
        const el = node as HTMLElement;
        el.style.height = px;
        el.style.maxHeight = px;
      });
    };
    clampMapHeight();
    const t1 = window.setTimeout(clampMapHeight, 120);
    const t2 = window.setTimeout(clampMapHeight, 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [mapMounted, mapHeightPx, center.lat, center.lng, zoom, hasMarker]);

  const handleClear = () => {
    setLocError(null);
    setFlyTarget(null);
    onChange(null, null);
  };

  if (readOnly) {
    if (!hasMarker) return null;

    const locationPair = `${lat},${lng}`;
    const mapsUrl = clientLocationMapsUrl(locationPair);
    const delta = 0.012;
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;

    return (
      <div className={className}>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          {t('leadLocation') || "Lead's location"}
        </p>
        <div className="mb-2 h-[220px] max-h-[220px] w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
          <iframe
            title={t('leadLocation') || 'Lead location'}
            src={embedUrl}
            className="block h-[220px] w-full max-h-[220px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            {t('openInMaps')}
          </a>
        ) : null}
        <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400" dir="ltr">
          {lat!.toFixed(6)}, {lng!.toFixed(6)}
        </p>
      </div>
    );
  }

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
        ref={mapWrapRef}
        className="lead-location-map relative z-0 w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
        style={{ height: mapHeightPx, maxHeight: mapHeightPx }}
      >
        {mapMounted ? (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            scrollWheelZoom={!readOnly}
            className="z-0 h-full w-full"
            style={{ height: mapHeightPx, width: '100%', maxHeight: mapHeightPx }}
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
        ) : (
          <div
            className="h-full w-full bg-gray-100 dark:bg-gray-800/60"
            style={{ height: mapHeightPx, maxHeight: mapHeightPx }}
            aria-hidden
          />
        )}
      </div>
      {hasMarker && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
          {lat!.toFixed(6)}, {lng!.toFixed(6)}
        </p>
      )}
    </div>
  );
};
