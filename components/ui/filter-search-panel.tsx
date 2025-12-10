"use client"

import React from "react"
import { Search, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import MultiComboBox, { Option } from "./multi-combobox"
import { Range } from 'react-range'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useLeftPanel } from "./left-panel-context"
import InfraViewer from "./infra-viewer"

export default function FilterSearchPanel() {
    React.useEffect(() => {
        try { window.dispatchEvent(new CustomEvent('geoshare:filter:open')) } catch (e) {}
        return () => {
            try { window.dispatchEvent(new CustomEvent('geoshare:filter:close')) } catch (e) {}
        }
    }, [])

    // If the left panel is only hidden (not unmounted), ensure we still notify
    // other UI that the filter panel is closed when the left panel hides.
    React.useEffect(() => {
        function onLeftPanelClose() {
            try { window.dispatchEvent(new CustomEvent('geoshare:filter:close')) } catch (e) {}
        }
        function onLeftPanelOpen() {
            try { window.dispatchEvent(new CustomEvent('geoshare:filter:open')) } catch (e) {}
        }

        window.addEventListener('geoshare:leftPanel:close', onLeftPanelClose)
        window.addEventListener('geoshare:leftPanel:open', onLeftPanelOpen)
        return () => {
            window.removeEventListener('geoshare:leftPanel:close', onLeftPanelClose)
            window.removeEventListener('geoshare:leftPanel:open', onLeftPanelOpen)
        }
    }, [])

        const [piecesOptions, setPiecesOptions] = React.useState<Option[]>([])
        const [equipOptions, setEquipOptions] = React.useState<Option[]>([])
        const [accessOptions, setAccessOptions] = React.useState<Option[]>([])
        const [searchQ, setSearchQ] = React.useState<string>('')

        const [selectedPieces, setSelectedPieces] = React.useState<string[]>([])
        const [selectedEquips, setSelectedEquips] = React.useState<string[]>([])
        const [selectedAccess, setSelectedAccess] = React.useState<string[]>([])
        const [distanceKm, setDistanceKm] = React.useState<number>(0)
        const [jaugeMin, setJaugeMin] = React.useState<number>(0)
        const [jaugeMax, setJaugeMax] = React.useState<number>(0)
        const [availableJaugeMax, setAvailableJaugeMax] = React.useState<number>(0)
        const [jaugeRange, setJaugeRange] = React.useState<[number, number]>([0, 0])
        const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
        const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)
        const [isSearching, setIsSearching] = React.useState<boolean>(false)
        const isSearchingRef = React.useRef(false)
        const [userType, setUserType] = React.useState<string | null>(null)

        React.useEffect(() => {
            let mounted = true
            fetch('/api/auth/me', { credentials: 'same-origin' })
                .then((r) => r.json())
                .then((data) => { if (!mounted) return; setUserType(data?.type ?? null) })
                .catch(() => { if (!mounted) return; setUserType(null) })
            return () => { mounted = false }
        }, [])

        React.useEffect(() => {
                let mounted = true
                fetch('/api/filters')
                    .then((r) => r.json())
                    .then((data) => {
                        if (!mounted) return
                        setPiecesOptions(Array.isArray(data.pieces) ? data.pieces.map((s: string) => ({ value: s, label: s })) : [])
                        setEquipOptions(Array.isArray(data.equipements) ? data.equipements.map((s: string) => ({ value: s, label: s })) : [])
                        setAccessOptions(Array.isArray(data.accessibilites) ? data.accessibilites.map((s: string) => ({ value: s, label: s })) : [])
                        // set jauge bounds
                        const maxJ = Number.isFinite(Number(data.jaugeMax)) ? Number(data.jaugeMax) : 0
                        setAvailableJaugeMax(maxJ)
                        setJaugeMax(maxJ)
                        setJaugeMin(0)
                        setJaugeRange([0, maxJ])
                    })
                    .catch((e) => console.error('failed to load filters', e))
                return () => { mounted = false }
        }, [])

        // emit filter change events when selections, distance or dates change
        React.useEffect(() => {
            try {
                window.dispatchEvent(new CustomEvent('geoshare:filters:change', { detail: {
                    pieces: selectedPieces,
                    equipments: selectedEquips,
                        accessibilites: selectedAccess,
                    distanceKm,
                    jaugeMin,
                    jaugeMax,
                    dateFrom: dateFrom ? dateFrom.toISOString() : null,
                    dateTo: dateTo ? dateTo.toISOString() : null,
                } }))
            } catch (e) {}
        }, [selectedPieces, selectedEquips, selectedAccess, distanceKm, jaugeMin, jaugeMax, dateFrom, dateTo])

        const { openPanel } = useLeftPanel()

        // perform the search using current filters
        async function performFilterSearch(opts?: any) {
            if (isSearchingRef.current) return
            
            isSearchingRef.current = true
            setIsSearching(true)

            try {
                const payload = opts ?? {
                    q: searchQ,
                    pieces: selectedPieces,
                    equipments: selectedEquips,
                    accessibilites: selectedAccess,
                    distanceKm,
                    jaugeMin,
                    jaugeMax,
                    dateFrom: dateFrom ? dateFrom.toISOString() : null,
                    dateTo: dateTo ? dateTo.toISOString() : null,
                    limit: 100
                }

                // if center not provided, try to get user location
                let centerLat: number | null = payload.centerLat ?? null
                let centerLon: number | null = payload.centerLon ?? null
                if ((centerLat == null || centerLon == null)) {
                    try {
                        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                            const id = navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
                        })
                        centerLat = pos.coords.latitude
                        centerLon = pos.coords.longitude
                    } catch (e) {
                        // ignore geolocation failure; proceed without center
                        centerLat = null
                        centerLon = null
                    }
                }

                const body: any = {
                    q: payload.q || '',
                    pieces: Array.isArray(payload.pieces) ? payload.pieces : [],
                    equipments: Array.isArray(payload.equipments) ? payload.equipments : [],
                    accessibilites: Array.isArray(payload.accessibilites) ? payload.accessibilites : [],
                    distanceKm: Number(payload.distanceKm) || 0,
                    jaugeMin: Number.isFinite(Number(payload.jaugeMin)) ? Number(payload.jaugeMin) : null,
                    jaugeMax: Number.isFinite(Number(payload.jaugeMax)) ? Number(payload.jaugeMax) : null,
                    centerLat: centerLat,
                    centerLon: centerLon,
                    dateFrom: payload.dateFrom || null,
                    dateTo: payload.dateTo || null,
                    limit: payload.limit || 100
                }

                // send to API

                const res = await fetch('/api/search', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
                if (!res.ok) throw new Error('search failed')
                const items = await res.json()

                // show results in left panel
                openPanel({
                    name: 'Résultats de recherche',
                    title: `Résultats (${(items || []).length})`,
                    html: (
                        <div className="space-y-2">
                            {(items || []).length === 0 ? <div className="p-4">Aucun résultat</div> : null}
                            {(items || []).map((it: any) => (
                                <button key={String(it.id)} className="w-full text-left p-2 hover:bg-gray-50 rounded" onClick={() => {
                                    try { window.dispatchEvent(new CustomEvent('geoshare:panTo', { detail: { lat: Number(it.lat), lng: Number(it.lon), zoom: 16, addMarker: true } })) } catch (e) {}
                                    try { openPanel({ name: `Infrastructure #${it.id}`, title: it.name ?? `Infrastructure #${it.id}`, html: <InfraViewer infra={{ id: it.id, name: it.name, adresse: it.adresse, lat: it.lat, lon: it.lon }} /> }) } catch (e) {}
                                }}>
                                    <div className="font-medium">{it.name}</div>
                                    {it.adresse ? <div className="text-xs text-gray-500">{it.adresse}</div> : null}
                                </button>
                            ))}
                        </div>
                    )
                })

                // save to recent searches (store filters so it can be re-executed later)
                try {
                    const key = 'recentSearches'
                    const raw = localStorage.getItem(key)
                    const arr = raw ? JSON.parse(raw) : []
                    const entry: any = {
                        title: (body.q && String(body.q).trim()) || (centerLat != null ? 'Autour de moi' : 'Recherche'),
                        subtitle: `${(body.pieces || []).length} pièces, ${(body.equipments || []).length} équipements, ${(body.accessibilites || []).length} access.`,
                        icon: '🔎',
                        type: 'search',
                        filters: body,
                        lat: centerLat ?? undefined,
                        lon: centerLon ?? undefined
                    }
                    // dedupe by JSON of filters
                    const next = [entry, ...arr.filter((i: any) => JSON.stringify(i.filters || {}) !== JSON.stringify(entry.filters || {}))].slice(0, 50)
                    localStorage.setItem(key, JSON.stringify(next))
                } catch (e) {}

            } catch (e) {
                console.error('filter search error', e)
            } finally {
                setIsSearching(false)
                isSearchingRef.current = false
            }
        }

        // listen for re-execution requests
        React.useEffect(() => {
            function onExec(ev: Event) {
                try {
                    const e = ev as CustomEvent
                    const item = e.detail
                    if (!item) return
                    // set local state from saved filters and run search
                    const f = item.filters || {}
                    setSearchQ(f.q || '')
                    setSelectedPieces(Array.isArray(f.pieces) ? f.pieces : [])
                    setSelectedEquips(Array.isArray(f.equipments) ? f.equipments : [])
                    setSelectedAccess(Array.isArray(f.accessibilites) ? f.accessibilites : [])
                    setDistanceKm(Number(f.distanceKm) || 0)
                    setJaugeMin(Number.isFinite(Number(f.jaugeMin)) ? Number(f.jaugeMin) : 0)
                    setJaugeMax(Number.isFinite(Number(f.jaugeMax)) ? Number(f.jaugeMax) : availableJaugeMax)
                    setDateFrom(f.dateFrom ? new Date(f.dateFrom) : undefined)
                    setDateTo(f.dateTo ? new Date(f.dateTo) : undefined)
                    // run search with provided center if any
                    performFilterSearch(f)
                } catch (err) {}
            }
            window.addEventListener('geoshare:executeFilterSearch', onExec as EventListener)
            return () => window.removeEventListener('geoshare:executeFilterSearch', onExec as EventListener)
        }, [selectedPieces, selectedEquips, selectedAccess, distanceKm, dateFrom, dateTo, searchQ])

    return (
        <div className="p-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-row w-full border rounded p-2 items-center bg-white">
                                <input
                                    aria-label="Recherche"
                                    className="flex-1 outline-none text-sm text-gray-700 bg-transparent disabled:opacity-50"
                                    placeholder="Rechercher dans GeoShare"
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                    disabled={isSearching}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            performFilterSearch()
                                        }
                                    }}
                                />
                                {isSearching ? <Loader2 className="w-5 h-5 text-gray-500 ml-2 animate-spin"/> : <Search className="w-5 h-5 text-gray-500 ml-2"/>}
                            </div>
                            <div className="flex flex-col gap-2">

                                <label className="text-xs text-gray-600">Distance de recherche (km)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={200}
                                        step={0.5}
                                        value={distanceKm}
                                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                                        disabled={isSearching}
                                        className="flex-1 disabled:opacity-50"
                                    />
                                    <input
                                        type="number"
                                        aria-label="Distance en kilomètres"
                                        value={distanceKm}
                                        onChange={(e) => {
                                            const v = Number(e.target.value)
                                            if (Number.isNaN(v)) return
                                            const clamped = Math.max(0.5, Math.min(50, v))
                                            setDistanceKm(Number(clamped.toFixed(1)))
                                        }}
                                        disabled={isSearching}
                                        step={0.1}
                                        className="w-20 p-1 border rounded text-sm disabled:bg-gray-100"
                                    />
                                </div>
                            </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-gray-600">Capacité (jauge)</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="px-2">
                                            {availableJaugeMax > 0 ? (
                                                <Range
                                                    values={jaugeRange}
                                                    step={1}
                                                    min={0}
                                                    max={availableJaugeMax}
                                                    disabled={isSearching}
                                                    onChange={(vals: number[]) => {
                                                        const v0 = Math.max(0, Math.min(Number(availableJaugeMax), vals[0]))
                                                        const v1 = Math.max(0, Math.min(Number(availableJaugeMax), vals[1]))
                                                        setJaugeRange([v0, v1])
                                                        setJaugeMin(v0)
                                                        setJaugeMax(v1)
                                                    }}
                                                    renderTrack={({ props, children }: { props: any, children: any }) => {
                                                        // avoid spreading `key` prop into DOM (React warns)
                                                        const { key, ...rest } = props as any
                                                        return (
                                                            <div
                                                                key={key}
                                                                {...rest}
                                                                className={`w-full h-2 bg-gray-200 rounded-md relative ${isSearching ? 'opacity-50' : ''}`}
                                                                style={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <div className="absolute h-2 bg-indigo-500 rounded-md" style={{ left: `${(jaugeRange[0] / (availableJaugeMax || 1)) * 100}%`, right: `${100 - (jaugeRange[1] / (availableJaugeMax || 1)) * 100}%` }} />
                                                                {children}
                                                            </div>
                                                        )
                                                    }}
                                                    renderThumb={({ props, index }: { props: any, index: number }) => {
                                                        const { key, ...rest } = props as any
                                                        return (
                                                            <div
                                                                key={key}
                                                                {...rest}
                                                                className="w-5 h-5 rounded-full bg-white border border-gray-400 shadow flex items-center justify-center"
                                                                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                                                            >
                                                                <div className="text-xs text-gray-700">{jaugeRange[index]}</div>
                                                            </div>
                                                        )
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-2 bg-gray-100 rounded-md" />
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                aria-label="Jauge min"
                                                value={jaugeMin}
                                                onChange={(e) => {
                                                    const v = Number(e.target.value)
                                                    if (Number.isNaN(v)) return
                                                    const nv = Math.max(0, Math.min(Number(availableJaugeMax || 0), v))
                                                    const newMax = Math.max(nv, jaugeMax)
                                                    setJaugeMin(nv)
                                                    setJaugeRange([nv, newMax])
                                                }}
                                                disabled={isSearching}
                                                className="w-24 p-1 border rounded text-sm disabled:bg-gray-100"
                                            />
                                            <input
                                                type="number"
                                                aria-label="Jauge max"
                                                value={jaugeMax}
                                                onChange={(e) => {
                                                    const v = Number(e.target.value)
                                                    if (Number.isNaN(v)) return
                                                    const nv = Math.max(0, Math.min(Number(availableJaugeMax || 0), v))
                                                    const newMin = Math.min(jaugeMin, nv)
                                                    setJaugeMax(nv)
                                                    setJaugeRange([newMin, nv])
                                                }}
                                                disabled={isSearching}
                                                className="w-24 p-1 border rounded text-sm disabled:bg-gray-100"
                                            />
                                            <div className="text-xs text-gray-500 self-center">Max proposé: {availableJaugeMax}</div>
                                        </div>
                                    </div>
                                </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Types d'équipements</label>
                                <div className={isSearching ? "opacity-50 pointer-events-none" : ""}>
                                    <MultiComboBox 
                                        options={equipOptions} 
                                        selected={selectedEquips} 
                                        onChange={(vals) => setSelectedEquips(vals.map(String))} 
                                        placeholder="Sélectionner types d'équipements" 
                                    />
                                </div>
                            </div>
                            {userType === 'PARTICULIER' ? (
                                null
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Types de pièces</label>
                                        <div className={isSearching ? "opacity-50 pointer-events-none" : ""}>
                                            <MultiComboBox 
                                                options={piecesOptions} 
                                                selected={selectedPieces} 
                                                onChange={(vals) => setSelectedPieces(vals.map(String))} 
                                                placeholder="Sélectionner types de pièces" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Accessibilités</label>
                                        <div className={isSearching ? "opacity-50 pointer-events-none" : ""}>
                                            <MultiComboBox 
                                                options={accessOptions} 
                                                selected={selectedAccess} 
                                                onChange={(vals) => setSelectedAccess(vals.map(String))} 
                                                placeholder="Sélectionner accessibilités" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-gray-600">Dates</label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left" disabled={isSearching}>
                                                    <CalendarIcon className="mr-2" />
                                                    {dateFrom ? format(dateFrom, 'PPP') : <span className="text-gray-500">Date de début</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={dateFrom} onSelect={(d) => setDateFrom(d as Date)} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            )}
                            <div className="w-full">
                                <Button onClick={() => performFilterSearch()} className="w-full" disabled={isSearching} aria-busy={isSearching}>
                                    {isSearching ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Recherche...</span>
                                        </span>
                                    ) : 'Rechercher'}
                                </Button>
                            </div>

                        </div>
        </div>
    )
}