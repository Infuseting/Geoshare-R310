"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from "react-leaflet";
import type { Map as LeafletMapType } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Use CDN-hosted marker images to avoid bundling/import issues in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Ensure markers use the default icon
L.Marker.prototype.options.icon = defaultIcon;

type Props = {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
};

export default function LeafletMap({ center = [51.505, -0.09], zoom = 13, minZoom = 1, maxZoom = 18  }: Props) {
  const mapRef = React.useRef<LeafletMapType | null>(null)
  const [userPos, setUserPos] = React.useState<[number, number] | null>(null)
  const [geoEnabled, setGeoEnabled] = React.useState<boolean>(false)
  const [mapZoom, setMapZoom] = React.useState<number>(zoom)
  const [mapInstance, setMapInstance] = React.useState<LeafletMapType | null>(null)
  const [infras, setInfras] = React.useState<Array<any>>([])
  const infraAbortRef = React.useRef<AbortController | null>(null)
  const infraDebounceRef = React.useRef<number | null>(null)

  // Default center: try to use geolocation on mount; otherwise fallback to Caen
  const defaultCaen: [number, number] = [49.182863, -0.370679]


  // Try to get position on load, but don't force prompt if the user previously denied.
  React.useEffect(() => {
    if (!("geolocation" in navigator)) return

    // Request current position once on mount
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(coords)
        setGeoEnabled(true)
        // center map if available
        if (mapRef.current) {
          try {
            mapRef.current.setView(coords, mapRef.current.getZoom())
          } catch (e) {
            // ignore
          }
        }
      },
      (err) => {
        // permission denied or unavailable -> keep default
        setGeoEnabled(false)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }, [])

  function handleCenterOnMe() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    if (geoEnabled && userPos) {
      if (mapRef.current) {
        try {
          mapRef.current.setView(userPos, 13)
        } catch (e) {
        }
      }
      return
    }

    // Otherwise request current location (may prompt)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(coords)
        setGeoEnabled(true)
        if (mapRef.current) {
          try {
            mapRef.current.setView(coords, 13)
          } catch (e) {
            // ignore
          }
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Prompt the user to enable geolocation in browser settings
          if (confirm("La géolocalisation est désactivée pour ce site. Voulez-vous l'activer ?")) {
            // User agreed to enable — try again (the browser may not re-prompt if denied permanently)
            try {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
                  setUserPos(coords)
                  setGeoEnabled(true)
                  if (mapRef.current) mapRef.current.setView(coords, 13)
                },
                () => {
                  alert("Impossible d'obtenir la position. Vérifiez les permissions du navigateur.")
                }
              )
            } catch (e) {
              alert("Impossible d'accéder à la géolocalisation.")
            }
          }
        } else {
          alert("Impossible d'obtenir la position: " + err.message)
        }
      },
      { enableHighAccuracy: true }
    )
  }

  // Determine initial center: user position if available, else Caen
  const initialCenter = userPos ?? defaultCaen

  // Listen to custom events so external UI (search) can command the map
  React.useEffect(() => {
    function onPanTo(e: Event) {
      try {
        // event could be CustomEvent with detail { lat, lng, zoom }
        const ce = e as CustomEvent
        const detail = ce.detail as { lat: number; lng: number; zoom?: number; addMarker?: boolean }
        if (!detail || !mapRef.current) return
        const target: [number, number] = [detail.lat, detail.lng]
        const z = detail.zoom ?? Math.max(13, mapRef.current.getZoom())
        try {
          mapRef.current.setView(target, z)
        } catch (err) {
          // ignore
        }

        // Optionally add a temporary marker
        if (detail.addMarker) {
          try {
            // remove previous temporary marker if any
            ;(mapRef.current as any)._lastSearchMarker && (mapRef.current as any)._lastSearchMarker.remove()
          } catch (e) {}
          try {
            const marker = L.marker(target as L.LatLngExpression).addTo(mapRef.current as any)
            ;(mapRef.current as any)._lastSearchMarker = marker
          } catch (e) {}
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("infraster:panTo", onPanTo as EventListener)
    return () => window.removeEventListener("infraster:panTo", onPanTo as EventListener)
  }, [mapRef])

  // Fetch infrastructures within current map bounds (max 100). Debounced on move/zoom.
  async function fetchInfrasForBounds(bounds?: L.LatLngBounds | null) {
    if (!bounds) return

    // cancel previous
    try { infraAbortRef.current?.abort() } catch (e) {}
    const controller = new AbortController()
    infraAbortRef.current = controller

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    const params = new URLSearchParams()
    params.set('north', String(ne.lat))
    params.set('east', String(ne.lng))
    params.set('south', String(sw.lat))
    params.set('west', String(sw.lng))
    params.set('limit', '100')

    try {
      const res = await fetch(`/api/infra?${params.toString()}`, { signal: controller.signal })
      if (!res.ok) {
        console.warn('failed to fetch infra', res.status)
        return
      }
      const data = await res.json()
      if (!Array.isArray(data)) return
      // keep only items with valid coords and cap to 100
      const filtered = data.filter((d: any) => Number.isFinite(parseFloat(d.lat)) && Number.isFinite(parseFloat(d.lon))).slice(0, 100)
      setInfras(filtered)
    } catch (e) {
      if ((e as any).name === 'AbortError') return
      console.warn('error fetching infra', e)
    }
  }

  // Wire up fetching when map is ready and on moveend
  React.useEffect(() => {
    if (!mapInstance) return

    const handler = () => {
      // debounce slightly to avoid too many requests while panning
      if (infraDebounceRef.current) window.clearTimeout(infraDebounceRef.current)
      infraDebounceRef.current = window.setTimeout(() => {
        try {
          fetchInfrasForBounds(mapInstance.getBounds())
        } catch (e) {}
      }, 200)
    }

    // initial fetch
    try { handler() } catch (e) {}

    // keep mapZoom state in sync with the actual map zoom
    const zoomSync = () => {
      console.log(mapInstance.getZoom())
      try {
        setMapZoom(mapInstance.getZoom())
      } catch (e) {}
    }

    mapInstance.on('moveend', handler)
    mapInstance.on('zoomend', handler)
    mapInstance.on('zoomend', zoomSync)

    return () => {
      mapInstance.off('moveend', handler)
      mapInstance.off('zoomend', handler)
      mapInstance.off('zoomend', zoomSync)
      if (infraDebounceRef.current) window.clearTimeout(infraDebounceRef.current)
      try { infraAbortRef.current?.abort() } catch (e) {}
    }
  }, [mapInstance])

  return (
    <div className="w-full h-screen relative">
      {/* Disable the default zoomControl and add a ZoomControl positioned bottom-right */}
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        zoomControl={false}
        ref={(m: LeafletMapType | null) => {
          mapRef.current = m
          setMapInstance(m)
          // Sync initial zoom state when map instance becomes available
          try {
            if (m) setMapZoom(m.getZoom())
          } catch (e) {}
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Custom zoom buttons positioned middle-right */}
        <div className="absolute right-4 bottom-4 z-[10000] flex flex-col space-y-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (mapRef.current) try { mapRef.current.zoomIn(); } catch (e) {} }}
            title="Zoomer"
            aria-label="Zoomer"
            disabled={mapZoom >= maxZoom}
            className={
              "rounded-md p-2 shadow-md border border-gray-200 " +
              (mapZoom >= maxZoom
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700")
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); if (mapRef.current) try { mapRef.current.zoomOut(); } catch (e) {} }}
            title="Dézoomer"
            aria-label="Dézoomer"
            disabled={mapZoom <= minZoom}
            className={
              "rounded-md p-2 shadow-md border border-gray-200 " +
              (mapZoom <= minZoom
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700")
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Blue dot showing current user position when available */}
        {geoEnabled && userPos ? (
          <CircleMarker center={userPos} pathOptions={{ color: "#2563eb", fillColor: "#2563eb" }} radius={8} />
        ) : null}
        {/* Infrastructures in current viewport (max 100) */}
        {infras && infras.length > 0 ? (
          <>
            {infras.map((it: any) => {
              const lat = parseFloat(it.lat)
              const lon = parseFloat(it.lon)
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
              return (
                <Marker key={it.id ?? `${lat}_${lon}`} position={[lat, lon]}>
                  <Popup>
                    <div className="text-sm font-medium">{it.name ?? 'Infrastructure'}</div>
                    {it.adresse ? <div className="text-xs text-gray-600">{it.adresse}</div> : null}
                  </Popup>
                </Marker>
              )
            })}
          </>
        ) : null}
      </MapContainer>

      {/* Center-on-me button positioned bottom-left near controls */}
      <div className="absolute bottom-4 right-16 z-[10000]">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); handleCenterOnMe(); }}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-md p-2 shadow-md border border-gray-200"
          title="Centrer sur ma position"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.536-6.364l-1.414 1.414M6.878 17.122l-1.414 1.414M17.122 17.122l1.414 1.414M6.878 6.878L5.464 5.464" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
