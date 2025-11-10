"use client";

import React from "react";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [q, setQ] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  // recent searches stored in localStorage under the key 'recentSearches'
  const [recentSearches, setRecentSearches] = React.useState<Array<any>>([]);
  const [suggestions, setSuggestions] = React.useState<Array<any>>([])
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("recentSearches");
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch (err) {
      // ignore parse errors
      console.warn("failed to load recentSearches", err);
    }
  }, []);

  // Fetch suggestions from Nominatim as the user types (debounced)
  React.useEffect(() => {
    if (!focused) return
    if (!q || q.trim().length === 0) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const queryText = q.trim()

        // call local infra search and nominatim in parallel
        const infraPromise = fetch(`/api/search?q=${encodeURIComponent(queryText)}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((arr: any[]) => arr.map((it) => ({ ...it, source: 'infra' })))
          .catch((e) => { console.warn('infra search failed', e); return [] })

        const nomPromise = fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryText)}&format=jsonv2&addressdetails=1&limit=6`, { signal: controller.signal, headers: { 'Accept-Language': 'fr' } })
          .then((r) => (r.ok ? r.json() : []))
          .then((arr: any[]) => arr.map((it) => ({ ...it, source: 'nominatim' })))
          .catch((e) => { if ((e as any).name === 'AbortError') throw e; console.warn('nominatim failed', e); return [] })

        const [infraRes, nomRes] = await Promise.all([infraPromise, nomPromise])

        if (cancelled) return

        // merge: infra items first, then nominatim items that don't duplicate infra by name (normalized)
        const infraNames = new Set((infraRes || []).map((i: any) => (i.name || '').trim().toLowerCase()))
        const filteredNom = (nomRes || []).filter((n: any) => {
          const dn = (n.display_name || '').trim().toLowerCase()
          return !infraNames.has(dn)
        })

        const merged = [...(infraRes || []), ...(filteredNom || [])]
        setSuggestions(merged)
      } catch (e) {
        if ((e as any).name === 'AbortError') return
        console.warn('failed to fetch suggestions', e)
        setSuggestions([])
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }, 300)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeout)
    }
  }, [q, focused])

  function persistRecent(list: Array<any>) {
    try {
      localStorage.setItem("recentSearches", JSON.stringify(list));
    } catch (e) {
      console.warn("failed to save recentSearches", e);
    }
    setRecentSearches(list);
  }

  // Normalize a title for deduplication (trim + lowercase) and include type (infra|address)
  function normKey(title?: string, type?: string) {
    const t = (type ?? 'address')
    return `${t}:${(title ?? '').trim().toLowerCase()}`
  }

  // Add an entry to recent searches. entry may include:
  // { title, subtitle, icon, action, type: 'infra'|'address', lat?, lon? }
  function addToHistory(entry: { title: string; subtitle?: string; detail?: string; icon?: string; action?: string; type?: string; lat?: number | string; lon?: number | string }) {
    const normalized = { icon: "🕘", subtitle: "", type: 'address', ...entry } as any;

    const key = normKey(normalized.title, normalized.type)
    const existingIndex = recentSearches.findIndex((r) => normKey(r.title, r.type) === key)

    let next: Array<any>
    if (existingIndex >= 0) {
      // merge existing with new data (newer fields take precedence)
      const existing = recentSearches[existingIndex];
      const merged = { ...existing, ...normalized };
      next = [merged, ...recentSearches.filter((_, i) => i !== existingIndex)];
    } else {
      // insert at front, remove any other duplicates of same key
      next = [normalized, ...recentSearches.filter((r) => normKey(r.title, r.type) !== key)];
    }

    next = next.slice(0, 50);
    persistRecent(next);
  }

  function doSearch(term?: string) {
    const value = (term ?? q)?.trim();
    if (!value) return;
    // Don't add a history item yet without coordinates or type.
    // We'll add to history when we have a concrete result (dispatchPanTo).
    // If we already have a suggestion that matches exactly (infra name or nominatim display_name), use it
    const exact = suggestions.find((s) => {
      if (s.source === 'infra') return (s.name || '') === value || (s.name || '').toLowerCase() === value.toLowerCase()
      return (s.display_name || '') === value || (s.display_name || '').toLowerCase() === value.toLowerCase()
    })
    if (exact) {
      dispatchPanTo(exact)
      setQ('')
      setFocused(false)
      return
    }

    // Otherwise query Nominatim for the best match and pan the map
    ;(async () => {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', value)
        url.searchParams.set('format', 'jsonv2')
        url.searchParams.set('limit', '1')
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('geocode failed')
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          // the nominatim result will be handled by dispatchPanTo which adds history with type 'address'
          data[0].source = 'nominatim'
          dispatchPanTo(data[0])
          setQ('')
        } else {
          // no result: keep history but notify user
          console.log('Aucun résultat pour', value)
        }
      } catch (e) {
        console.warn('geocode error', e)
      } finally {
        setFocused(false)
      }
    })()
  }

  function dispatchPanTo(item: any) {
    // item can be from nominatim (display_name, lat, lon) or infra (name, adresse, lat, lon)
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      window.dispatchEvent(new CustomEvent('infraster:panTo', { detail: { lat, lng, zoom: 16, addMarker: true } }))

      // Choose a sensible title/subtitle for history depending on source
      if (item.source === 'infra') {
        addToHistory({ title: item.name || `${lat}, ${lng}`, subtitle: item.adresse ?? '', type: 'infra', lat, lon: lng })
      } else {
        addToHistory({ title: item.display_name || `${lat}, ${lng}`, subtitle: item.type ?? '', type: 'address', lat, lon: lng })
      }
    }
  }

  return (
    <div
      className="fixed top-4 left-24 z-9998"
      // allow the container to receive focus/blur events from its children
      tabIndex={-1}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        // keep open if focus moves inside the container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setFocused(false);
        }
      }}
    >
      <div className="relative">
        <div className={`flex items-center flex-col bg-white  rounded-2xl shadow-md border px-5 py-3 w-[min(320px,56vw)]`} >
          <div className="flex flex-row w-full">
            <input
              aria-label="Recherche"
              className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
              placeholder="Rechercher dans GeoShare"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doSearch();
                }
              }}
            />
            <Search className="w-5 h-5 text-gray-500 ml-2 "/>
          </div>
          <div className="">
            {focused && (recentSearches.length > 0 || suggestions.length > 0) && (
              <div
                tabIndex={0}
                className="left-0 top-full w-[min(320px,56vw)] text-sm overflow-hidden bg-white mt-2 rounded-lg"
              >
                <div className="p-2">
                  {loadingSuggestions ? (
                    <div className="p-3 text-sm text-gray-500">Recherche...</div>
                  ) : suggestions && suggestions.length > 0 ? (
                    suggestions.slice(0, 6).map((item: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          // perform the pan/zoom then clear the input
                          dispatchPanTo(item)
                          setQ('')
                          setFocused(false)
                        }}
                        className="w-full text-left "
                      >
                        <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 max-w-full w-full rounded">
                          <div className={`min-w-8 min-h-8 rounded-full flex items-center justify-center text-gray-600 bg-gray-100`}>
                            {item.source === 'infra' ? '🏢' : '📍'}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* name / display as primary */}
                              <div className="font-medium text-sm truncate">
                              {item.source === 'infra' ? item.name : item.display_name}
                            </div>
                            {/* address / type as secondary */}
                            {item.source === 'infra' ? (
                              <div className="text-xs text-gray-500 truncate">{item.adresse}</div>
                            ) : (
                              item.type ? <div className="text-xs text-gray-500 truncate">{item.type}</div> : null
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div>
                      {recentSearches && recentSearches.length > 0 ? (
                        recentSearches.slice(0, 5).map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              // If the history item has coordinates, pan directly. Otherwise perform a search.
                              if (item.lat != null && item.lon != null) {
                                // ensure shape similar to nominatim/infra result for dispatchPanTo
                                const histItem = { lat: item.lat, lon: item.lon, source: item.type === 'infra' ? 'infra' : 'nominatim', display_name: item.title, name: item.title, adresse: item.subtitle }
                                dispatchPanTo(histItem)
                                setQ('')
                                setFocused(false)
                                return
                              }
                              setQ(item.title)
                              doSearch(item.title)
                            }}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded">
                              <div className={`min-w-8 min-h-8 rounded-full flex items-center justify-center text-gray-600 ${item.title === 'Domicile' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'}`}>
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{item.title}</div>
                                {item.subtitle ? <div className="text-xs text-gray-500 truncate">{item.subtitle}</div> : null}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div></div>
                      )}
                      {recentSearches.length > 5 && (
                        <div className="border-t border-gray-100 text-center py-2 text-sm text-blue-600">Autres adresses récentes</div>
                      ) }
                    </div>
                  )}
                </div>
                
                
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
