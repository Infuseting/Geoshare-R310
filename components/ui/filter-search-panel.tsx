"use client"

import React from "react"
import { Search, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import MultiComboBox from "./multi-combobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useLeftPanel } from "./left-panel-context"
import InfraViewer from "./infra-viewer"

export default function FilterSearchPanel() {
    React.useEffect(() => {
        try { window.dispatchEvent(new CustomEvent('infraster:filter:open')) } catch (e) {}
        return () => {
            try { window.dispatchEvent(new CustomEvent('infraster:filter:close')) } catch (e) {}
        }
    }, [])

        const [piecesOptions, setPiecesOptions] = React.useState<string[]>([])
        const [equipOptions, setEquipOptions] = React.useState<string[]>([])
        const [accessOptions, setAccessOptions] = React.useState<string[]>([])
        const [searchQ, setSearchQ] = React.useState<string>('')

        const [selectedPieces, setSelectedPieces] = React.useState<string[]>([])
        const [selectedEquips, setSelectedEquips] = React.useState<string[]>([])
        const [selectedAccess, setSelectedAccess] = React.useState<string[]>([])
        const [distanceKm, setDistanceKm] = React.useState<number>(0)
        const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
        const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)

        React.useEffect(() => {
                let mounted = true
                fetch('/api/filters')
                    .then((r) => r.json())
                    .then((data) => {
                        if (!mounted) return
                        setPiecesOptions(Array.isArray(data.pieces) ? data.pieces : [])
                        setEquipOptions(Array.isArray(data.equipements) ? data.equipements : [])
                        setAccessOptions(Array.isArray(data.accessibilites) ? data.accessibilites : [])
                    })
                    .catch((e) => console.error('failed to load filters', e))
                return () => { mounted = false }
        }, [])

        // emit filter change events when selections, distance or dates change
        React.useEffect(() => {
            try {
                window.dispatchEvent(new CustomEvent('infraster:filters:change', { detail: {
                    pieces: selectedPieces,
                    equipments: selectedEquips,
                        accessibilites: selectedAccess,
                    distanceKm,
                    dateFrom: dateFrom ? dateFrom.toISOString() : null,
                    dateTo: dateTo ? dateTo.toISOString() : null,
                } }))
            } catch (e) {}
        }, [selectedPieces, selectedEquips, selectedAccess, distanceKm, dateFrom, dateTo])

        const { openPanel } = useLeftPanel()

        // perform the search using current filters
        async function performFilterSearch(opts?: any) {
            const payload = opts ?? {
                q: searchQ,
                pieces: selectedPieces,
                equipments: selectedEquips,
                accessibilites: selectedAccess,
                distanceKm,
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
                centerLat: centerLat,
                centerLon: centerLon,
                dateFrom: payload.dateFrom || null,
                dateTo: payload.dateTo || null,
                limit: payload.limit || 100
            }

            // send to API
            try {
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
                                    try { window.dispatchEvent(new CustomEvent('infraster:panTo', { detail: { lat: Number(it.lat), lng: Number(it.lon), zoom: 16, addMarker: true } })) } catch (e) {}
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
                    setDateFrom(f.dateFrom ? new Date(f.dateFrom) : undefined)
                    setDateTo(f.dateTo ? new Date(f.dateTo) : undefined)
                    // run search with provided center if any
                    performFilterSearch(f)
                } catch (err) {}
            }
            window.addEventListener('infraster:executeFilterSearch', onExec as EventListener)
            return () => window.removeEventListener('infraster:executeFilterSearch', onExec as EventListener)
        }, [selectedPieces, selectedEquips, selectedAccess, distanceKm, dateFrom, dateTo, searchQ])

    return (
        <div className="p-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-row w-full border rounded p-2 items-center bg-white">
                                <input
                                    aria-label="Recherche"
                                    className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                                    placeholder="Rechercher dans GeoShare"
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            performFilterSearch()
                                        }
                                    }}
                                />
                                <Search className="w-5 h-5 text-gray-500 ml-2"/>
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
                                        className="flex-1"
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
                                        step={0.1}
                                        className="w-20 p-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Types de pièces</label>
                                <MultiComboBox options={piecesOptions} selected={selectedPieces} onChange={setSelectedPieces} placeholder="Sélectionner types de pièces" />
                            </div>

                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Types d'équipements</label>
                                <MultiComboBox options={equipOptions} selected={selectedEquips} onChange={setSelectedEquips} placeholder="Sélectionner types d'équipements" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Accessibilités</label>
                                <MultiComboBox options={accessOptions} selected={selectedAccess} onChange={setSelectedAccess} placeholder="Sélectionner accessibilités" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">Dates</label>
                            </div>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left">
                                            <CalendarIcon className="mr-2" />
                                            {dateFrom ? format(dateFrom, 'PPP') : <span className="text-gray-500">Date de début</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={dateFrom} onSelect={(d) => setDateFrom(d as Date)} />
                                    </PopoverContent>
                                </Popover>

                            </div>
                            <div className="w-full">
                                <Button onClick={() => performFilterSearch()} className="w-full">Rechercher</Button>
                            </div>

                        </div>
        </div>
    )
}