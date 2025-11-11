"use client"

import React from 'react'
import { MagnetIcon } from 'lucide-react'

export default function RecentSearches({vertical  } : {vertical?: boolean}) {
  const [searches, setSearches] = React.useState<Array<any>>([])

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('recentSearches')
      if (!raw) return
      const arr = JSON.parse(raw)
      const filtered = (arr || []).filter((r: any) => r && r.type === 'search')
      // the history stored by addToHistory places newest items first, so keep order
      setSearches(filtered.slice(0, 10))
    } catch (e) {
      console.warn('failed to load recent searches', e)
    }
  }, [])

  if (!searches || searches.length === 0) {
    return <div className="text-xs text-gray-400 px-2">Aucune recherche récente</div>
  }

  return (
    <div className="w-full px-2">
      {searches.map((s: any, idx: number) => (
        <div key={idx} className={` items-center flex ${vertical ? 'flex-col justify-center' : 'flex-row'} ${vertical ? '' : 'hover:bg-gray-100 rounded-md cursor-pointer'}`}  onClick={() => {
              // emit a custom event with the query so other parts (like SearchBar) may react
              try {
                window.dispatchEvent(new CustomEvent('infraster:searchQuery', { detail: { q: s.title } }))
              } catch (e) {
                console.warn('failed to dispatch searchQuery', e)
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
