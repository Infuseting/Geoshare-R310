"use client"

import React from 'react'
import { MagnetIcon } from 'lucide-react'
import { useLeftPanel } from './left-panel-context'
import FilterSearchPanel from './filter-search-panel'

export default function RecentSearches({vertical, maxItems } : {vertical?: boolean, maxItems?: number}) {
  const [searches, setSearches] = React.useState<Array<any>>([])
  const { openPanel } = useLeftPanel()

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('recentSearches')
      if (!raw) return
      const arr = JSON.parse(raw)
      const filtered = (arr || []).filter((r: any) => r && r.type === 'search')
      // the history stored by addToHistory places newest items first, so keep order
      setSearches(filtered.slice(0, 11))
    } catch (e) {
      console.warn('failed to load recent searches', e)
    }
  }, [])

  if (!searches || searches.length === 0) {
    return <div className="text-xs text-gray-400 px-2">Aucune recherche récente</div>
  }

  const visible = typeof maxItems === 'number' ? searches.slice(0, maxItems) : searches.slice(0, 15)

  return (
    <div className="w-full px-2 py-auto h-full">
      {visible.map((s: any, idx: number) => (
        <div key={idx} className={` items-center flex ${vertical ? 'flex-col justify-center' : 'flex-row'} ${vertical ? '' : 'hover:bg-gray-100 rounded-md cursor-pointer'}`}  onClick={() => {
              try {
                const ANIM_MS = 500

                // If this recent search includes filters (saved from filter search),
                // open the filter panel and then dispatch an event that will re-execute the filtered search.
                if (s && (s.filters || s.filter)) {
                  try {
                    if (openPanel) openPanel({ name: 'Recherche par filtres', title: 'Recherche par filtres', html: <FilterSearchPanel /> })
                  } catch (e) {}
                  window.setTimeout(() => {
                    try { window.dispatchEvent(new CustomEvent('geoshare:executeFilterSearch', { detail: s })) } catch (e) {}
                  }, ANIM_MS)
                  return
                }

                // If the saved item contains coordinates (lat/lon) but no filters,
                // open the filter panel and re-run the filter search by creating a minimal filters object using the stored coords.
                if (s && (s.lat != null || s.lon != null)) {
                  try {
                    if (openPanel) openPanel({ name: 'Recherche par filtres', title: 'Recherche par filtres', html: <FilterSearchPanel /> })
                  } catch (e) {}
                  const detail = {
                    filters: {
                      q: s.title || '',
                      pieces: [],
                      equipments: [],
                      accessibilites: [],
                      distanceKm: 0,
                      centerLat: s.lat != null ? Number(s.lat) : null,
                      centerLon: s.lon != null ? Number(s.lon) : null,
                      dateFrom: null,
                      dateTo: null,
                      limit: 100
                    }
                  }
                  window.setTimeout(() => {
                    try { window.dispatchEvent(new CustomEvent('geoshare:executeFilterSearch', { detail })) } catch (e) {}
                  }, ANIM_MS)
                  return
                }

                // otherwise emit a simple searchQuery event with the title
                window.dispatchEvent(new CustomEvent('geoshare:searchQuery', { detail: { q: s.title } }))
              } catch (e) {
                console.warn('failed to dispatch recent search event', e)
              }
            }}>
          <button
            title={s.title}
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${vertical ? 'hover:bg-gray-100 text-gray-700 cursor-pointer' : 'cursor-pointer'} `}
            aria-label={s.title}
           
          >
            <MagnetIcon className="h-5 w-5" />
          </button>
          <span className={`block ${vertical ? 'w-10' : 'w-auto'} truncate text-sm text-center`}>{s.title}</span>
        </div>
      ))}
    </div>
  )
}
