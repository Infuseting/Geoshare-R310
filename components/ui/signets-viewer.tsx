"use client"

import React from "react"
import InfraViewer from "./infra-viewer"
import { useLeftPanel } from "./left-panel-context"

type FavItem = {
	id: string
	name?: string | null
	adresse?: string | null
	lat?: number | null
	lon?: number | null
}

export default function SignetsViewer({ compact = false }: { compact?: boolean }) {
	const [items, setItems] = React.useState<FavItem[] | null>(null)
	const [loading, setLoading] = React.useState(false)
	const { openPanel } = useLeftPanel()

	React.useEffect(() => {
		let mounted = true
		async function load() {
			setLoading(true)
			try {
				const raw = localStorage.getItem("infraster:favorites")
				const favs: string[] = raw ? JSON.parse(raw) : []
				// fetch details in parallel
				const unique = Array.from(new Set(favs.map((v) => String(v))))
				const detailPromises = unique.map(async (id) => {
					try {
						const res = await fetch(`/api/infra/id?id=${encodeURIComponent(id)}`, { credentials: "same-origin" })
						if (!res.ok) return { id, name: null, adresse: null, lat: null, lon: null }
						const j = await res.json().catch(() => null)
						return {
							id,
							name: j?.name ?? null,
							adresse: j?.adresse ?? j?.address ?? null,
							lat: j?.lat ? Number(j.lat) : null,
							lon: j?.lon ? Number(j.lon) : null,
						}
					} catch (e) {
						return { id, name: null, adresse: null, lat: null, lon: null }
					}
				})

				const details = await Promise.all(detailPromises)
				if (!mounted) return
				setItems(details)
			} catch (e) {
				if (!mounted) return
				setItems([])
			} finally {
				if (!mounted) return
				setLoading(false)
			}
		}
		load()
		return () => {
			mounted = false
		}
	}, [])

	const handleClick = async (it: FavItem) => {
		// Prefer using available coords to pan immediately
		try {
			if (it.lat != null && it.lon != null) {
				try {
					window.dispatchEvent(new CustomEvent("infraster:panTo", { detail: { lat: it.lat, lng: it.lon, zoom: 15, addMarker: true } }))
				} catch (e) {}
			}

			// open left panel with InfraViewer; using infra id ensures viewer loads
					openPanel({
						name: `Infrastructure #${it.id}`,
						title: it.name ?? `Infrastructure #${it.id}`,
						html: <InfraViewer infra={{ id: it.id, name: it.name ?? undefined, adresse: it.adresse ?? undefined, lat: it.lat ?? undefined, lon: it.lon ?? undefined }} />,
					})
		} catch (e) {
			console.warn('failed to open favorite', e)
		}
	}

	if (loading) return <div>Chargement des signets…</div>
	if (!items || items.length === 0) return <div>Aucun signet</div>

	return (
		<div className={compact ? "space-y-2 text-sm" : "space-y-3"}>
			{items.map((it) => (
				<button
					key={it.id}
					onClick={() => handleClick(it)}
					className="w-full text-left p-2 rounded-md hover:bg-gray-100 flex flex-col"
				>
					<div className="flex items-center justify-between">
						<strong className="truncate">{it.name ?? `Infrastructure #${it.id}`}</strong>
						<span className="text-xs text-gray-500">{it.lat != null && it.lon != null ? '📍' : ''}</span>
					</div>
					{it.adresse && <div className="text-gray-500 text-sm truncate">{it.adresse}</div>}
				</button>
			))}
		</div>
	)
}
