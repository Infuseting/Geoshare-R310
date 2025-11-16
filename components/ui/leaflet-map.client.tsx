"use client";

import React from "react";
import { useLeftPanel } from "./left-panel-context";
import InfraViewer from "./infra-viewer";
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

// Colored markers: red for infrastructures, grey for search results.
const infraIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],

  shadowSize: [41, 41],
});

const searchIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

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
  const [selectedInfraId, setSelectedInfraId] = React.useState<string | null>(null)
  const [selectedInfra, setSelectedInfra] = React.useState<any | null>(null)
  const infraAbortRef = React.useRef<AbortController | null>(null)
  const infraDebounceRef = React.useRef<number | null>(null)
  const pendingInfraRef = React.useRef<string | null>(null)

  // NOTE: URL params handling and initial center/zoom are processed later, after
  // the map instance is available. Keep a simple initialCenter for first render
  // (user position if available, otherwise defaultCaen).

  // Left panel control
  const { openPanel } = useLeftPanel()

  // Animated selected marker: create a divIcon and inject CSS for bounce
  const selectedDivIcon = React.useMemo(() => {
    return L.divIcon({
      html: `<img class="infraster-selected-marker" src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" />`,
      className: "infraster-selected-divicon",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
  }, [])

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('infraster-selected-marker-style')) return
    const s = document.createElement('style')
    s.id = 'infraster-selected-marker-style'
    s.innerHTML = `
@keyframes infraster-bounce { 0% { transform: translateY(0); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0); } }
.infraster-selected-marker { animation: infraster-bounce 1s infinite; display: block; transform-origin: center bottom; }
.infraster-selected-divicon { background: transparent; }
`
    document.head.appendChild(s)
  }, [])

  // fetch and cache selected infra details whenever selectedInfraId changes
  React.useEffect(() => {
    let mounted = true
    try {
      if (!selectedInfraId) {
        setSelectedInfra(null)
        return
      }
      ;(async () => {
        try {
          const res = await fetch(`/api/infra/id?id=${encodeURIComponent(String(selectedInfraId))}`, { credentials: 'same-origin' })
          if (!mounted) return
          if (!res.ok) return
          const j = await res.json().catch(() => null)
          if (!mounted) return
          try { setSelectedInfra(j) } catch (e) {}
        } catch (e) {
          // ignore
        }
      })()
    } catch (e) {}
    return () => { mounted = false }
  }, [selectedInfraId])

  // Default center: try to use geolocation on mount; otherwise fallback to Caen
  const defaultCaen: [number, number] = [49.182863, -0.370679]
  // read URL params for initial view or infra
  function readUrlParams() {
    try {
      const u = new URL(window.location.href)
      const sp = u.searchParams
      const lat = sp.get('lat')
      const lng = sp.get('lng')
      const z = sp.get('zoom')
      const infra = sp.get('infra')
      return { lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, zoom: z ? parseInt(z, 10) : null, infra }
    } catch (e) {
      return { lat: null, lng: null, zoom: null, infra: null }
    }
  }

  function updateUrl(params: { lat?: number | null; lng?: number | null; zoom?: number | null; infra?: string | null }) {
    try {
      const u = new URL(window.location.href)
      const sp = u.searchParams
      if (typeof params.lat !== 'undefined') {
        if (params.lat == null) sp.delete('lat')
        else sp.set('lat', String(params.lat))
      }
      if (typeof params.lng !== 'undefined') {
        if (params.lng == null) sp.delete('lng')
        else sp.set('lng', String(params.lng))
      }
      if (typeof params.zoom !== 'undefined') {
        if (params.zoom == null) sp.delete('zoom')
        else sp.set('zoom', String(params.zoom))
      }
      if (typeof params.infra !== 'undefined') {
        if (params.infra == null) sp.delete('infra')
        else sp.set('infra', params.infra)
      }
      const newUrl = `${u.pathname}${u.search ? '?' + sp.toString() : ''}${u.hash}`
      window.history.replaceState({}, '', newUrl)
    } catch (e) {
      // ignore
    }
  }


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
            	    const marker = L.marker(target as L.LatLngExpression, { icon: searchIcon }).addTo(mapRef.current as any)
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
          try {
            // update URL with current center and zoom so view can be shared
            const center = mapInstance.getCenter()
            updateUrl({ lat: center.lat, lng: center.lng, zoom: mapInstance.getZoom() })
          } catch (e) {}
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


  // When map instance is available, apply any URL params (center/zoom/infra)
  React.useEffect(() => {
    if (!mapInstance) return
    try {
      const params = readUrlParams()
      if (params.lat != null && params.lng != null) {
        try {
          mapInstance.setView([params.lat, params.lng], params.zoom ?? mapInstance.getZoom())
        } catch (e) {}
      }

      // If an infra id is present in the URL, open the left-panel for it
      if (params.infra) {
        try {
          openPanel({
            name: `Infrastructure #${params.infra}`,
            title: `Infrastructure #${params.infra}`,
            html: <InfraViewer infra={{ id: params.infra }} />,
          })
          // mark as selected so the marker is animated
          try { setSelectedInfraId(String(params.infra)) } catch (e) {}
          // also fetch and cache details for the selected infra so it persists across viewport fetches
          try {
            ;(async () => {
              try {
                const res = await fetch(`/api/infra/id?id=${encodeURIComponent(String(params.infra))}`, { credentials: 'same-origin' })
                if (!res.ok) return
                const j = await res.json().catch(() => null)
                try { setSelectedInfra(j) } catch (e) {}
              } catch (e) {}
            })()
          } catch (e) {}
          // If URL doesn't include explicit coords, try to fetch infra details and recentre map
          if ((params.lat == null || params.lng == null) && params.infra) {
            pendingInfraRef.current = null
            const infraId = String(params.infra)
            ;(async () => {
              try {
                try { infraAbortRef.current?.abort() } catch (e) {}
                const ac = new AbortController()
                infraAbortRef.current = ac
                const res = await fetch(`/api/infra/id?id=${encodeURIComponent(infraId)}`, { signal: ac.signal, credentials: 'same-origin' })
                if (!res.ok) return
                const j = await res.json().catch(() => null)
                const latNum = Number(j?.lat)
                const lonNum = Number(j?.lon)
                if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
                  try { mapInstance.setView([latNum, lonNum], Math.max(13, mapInstance.getZoom())) } catch (e) {}
                  try { updateUrl({ lat: latNum, lng: lonNum, zoom: mapInstance.getZoom() }) } catch (e) {}
                  try { setSelectedInfraId(String(params.infra)) } catch (e) {}
                }
              } catch (e) {}
            })()
          }
        } catch (e) {}
      }
    } catch (e) {}
  }, [mapInstance])

  // Listen for openDetail events from left-panel so we can recentre when an infra is opened from a menu
  React.useEffect(() => {
    function onLeftPanelOpenDetail(e: Event) {
      try {
        const ce = e as CustomEvent
        const name = String(ce.detail?.name ?? '')
        const m = name.match(/#(\w+)$/)
        if (!m || !m[1]) return
        const id = m[1]
        try { setSelectedInfraId(String(id)) } catch (e) {}
        if (!mapInstance) {
          // store pending id and handle when mapInstance becomes available
          pendingInfraRef.current = id
          return
        }
        ;(async () => {
          try {
            try { infraAbortRef.current?.abort() } catch (e) {}
            const ac = new AbortController()
            infraAbortRef.current = ac
            const res = await fetch(`/api/infra/id?id=${encodeURIComponent(id)}`, { signal: ac.signal, credentials: 'same-origin' })
            if (!res.ok) return
            const j = await res.json().catch(() => null)
            const latNum = Number(j?.lat)
            const lonNum = Number(j?.lon)
            if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
              try { mapInstance.setView([latNum, lonNum], Math.max(13, mapInstance.getZoom())) } catch (e) {}
              try { updateUrl({ lat: latNum, lng: lonNum, zoom: mapInstance.getZoom() }) } catch (e) {}
            }
          } catch (e) {}
        })()
      } catch (e) {}
    }
    window.addEventListener('infraster:leftPanel:openDetail', onLeftPanelOpenDetail as EventListener)
    return () => window.removeEventListener('infraster:leftPanel:openDetail', onLeftPanelOpenDetail as EventListener)
  }, [mapInstance])

  // If there was a pending infra id while mapInstance wasn't ready, apply it now
  React.useEffect(() => {
    if (!mapInstance) return
    const id = pendingInfraRef.current
    if (!id) return
    pendingInfraRef.current = null
    ;(async () => {
      try {
        try { infraAbortRef.current?.abort() } catch (e) {}
        const ac = new AbortController()
        infraAbortRef.current = ac
        const res = await fetch(`/api/infra/id?id=${encodeURIComponent(id)}`, { signal: ac.signal, credentials: 'same-origin' })
        if (!res.ok) return
        const j = await res.json().catch(() => null)
        const latNum = Number(j?.lat)
        const lonNum = Number(j?.lon)
        if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
          try { mapInstance.setView([latNum, lonNum], Math.max(13, mapInstance.getZoom())) } catch (e) {}
          try { updateUrl({ lat: latNum, lng: lonNum, zoom: mapInstance.getZoom() }) } catch (e) {}
          try { setSelectedInfraId(String(id)) } catch (e) {}
        }
        // populate selectedInfra cache if possible
        try { setSelectedInfra(j) } catch (e) {}
      } catch (e) {}
    })()
  }, [mapInstance])

  // When the left-panel is closed elsewhere, clear the infra param from the URL
  React.useEffect(() => {
    function onLeftPanelClose() {
      try { updateUrl({ infra: null }) } catch (e) {}
      try { setSelectedInfraId(null) } catch (e) {}
      try { setSelectedInfra(null) } catch (e) {}
    }
    window.addEventListener('infraster:leftPanel:close', onLeftPanelClose)
    return () => window.removeEventListener('infraster:leftPanel:close', onLeftPanelClose)
  }, [])

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
  <div className="absolute right-4 bottom-4 z-10000 flex flex-col space-y-2">
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
                <Marker
                  key={it.id ?? `${lat}_${lon}`}
                  position={[lat, lon]}
                  icon={String(it.id) === String(selectedInfraId) ? selectedDivIcon : infraIcon}
                  eventHandlers={{
                    click: () => {
                      try {
                        // mark selected id so marker animates
                        try { setSelectedInfraId(String(it.id)) } catch (e) {}

                        // update URL so the selected infra is shareable/restorable
                        try {
                          const lat = parseFloat(it.lat)
                          const lon = parseFloat(it.lon)
                          updateUrl({ infra: String(it.id), lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lon) ? lon : null, zoom: mapRef.current ? mapRef.current.getZoom() : null })
                        } catch (e) {}

                        // open left panel with InfraViewer as html content
                        openPanel({
                          name: it.name ?? `Infrastructure #${it.id}`,
                          title: it.name ?? `Infrastructure #${it.id}`,
                          html: <InfraViewer infra={it} />,
                        })
                      } catch (e) {
                        console.warn("failed to open left panel for infra", e)
                      }
                    },
                  }}
                />
              )
            })}
          </>
        ) : null}
        {/* Render selected infra even if it's not in the current viewport results */}
        {selectedInfra && (!infras || !infras.find((i: any) => String(i.id) === String(selectedInfra.id))) ? (
          (() => {
            const lat = Number(selectedInfra.lat)
            const lon = Number(selectedInfra.lon)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
            return (
              <Marker
                key={`selected_${String(selectedInfra.id)}`}
                position={[lat, lon]}
                icon={selectedDivIcon}
                zIndexOffset={1000}
                eventHandlers={{
                  click: () => {
                    try { setSelectedInfraId(String(selectedInfra.id)) } catch (e) {}
                    try {
                      openPanel({
                        name: selectedInfra.name ?? `Infrastructure #${selectedInfra.id}`,
                        title: selectedInfra.name ?? `Infrastructure #${selectedInfra.id}`,
                        html: <InfraViewer infra={selectedInfra} />,
                      })
                    } catch (e) {}
                  },
                }}
              />
            )
          })()
        ) : null}
      </MapContainer>

      {/* Center-on-me button positioned bottom-left near controls */}
  <div className="absolute bottom-4 right-16 z-10000">
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
