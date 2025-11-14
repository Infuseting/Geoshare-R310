"use client"

import React from 'react'

type LeftPanelPayload = {
  name?: string
  title?: React.ReactNode
  html?: React.ReactNode
}

type LeftPanelContextValue = {
  open: boolean
  title?: React.ReactNode
  html?: React.ReactNode
  contentKey?: string
  openPanel: (p: LeftPanelPayload) => void
  closePanel: () => void
  togglePanel: (p: LeftPanelPayload) => void
}

const LeftPanelContext = React.createContext<LeftPanelContextValue | undefined>(undefined)

export function LeftPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState<React.ReactNode | undefined>(undefined)
  const [html, setHtml] = React.useState<React.ReactNode | undefined>(undefined)
  const [contentKey, setContentKey] = React.useState<string | undefined>(undefined)
  const fetchAbortRef = React.useRef<AbortController | null>(null)

  const openPanel = React.useCallback((p: LeftPanelPayload) => {
    setContentKey(p.name)
    setTitle(p.title ?? p.name)
    setHtml(p.html)
    setOpen(true)
    // notify listeners with panel payload (useful for map to recentre when infra opens)
    try { window.dispatchEvent(new CustomEvent('infraster:leftPanel:openDetail', { detail: { name: p.name } })) } catch (e) {}
    // If the provided name contains an infra id like "#123" try to fetch the real name
    try {
      const m = String(p.name ?? '').match(/#(\w+)$/)
      if (m && m[1]) {
        // abort previous
        try { fetchAbortRef.current?.abort() } catch (e) {}
        const ac = new AbortController()
        fetchAbortRef.current = ac
        ;(async () => {
          try {
            const res = await fetch(`/api/infra/id?id=${encodeURIComponent(m[1])}`, { signal: ac.signal, credentials: 'same-origin' })
            if (!res.ok) return
            const j = await res.json().catch(() => null)
            if (j && j.name) setTitle(j.name)
          } catch (e) {
            // ignore fetch errors
          }
        })()
      }
    } catch (e) {}
  }, [])

  const closePanel = React.useCallback(() => {
    setOpen(false)
    try { window.dispatchEvent(new CustomEvent('infraster:leftPanel:close')) } catch (e) {}
  }, [])

  const togglePanel = React.useCallback((p: LeftPanelPayload) => {
    // if same contentKey and currently open -> close
    if (p.name && open && p.name === contentKey) {
      setOpen(false)
      try { window.dispatchEvent(new CustomEvent('infraster:leftPanel:close')) } catch (e) {}
      return
    }

    // If switching to a different content while panel is open, update the
    // content and keep the panel open. If panel is closed, open it.
    setContentKey(p.name)
    setTitle(p.title ?? p.name)
    setHtml(p.html)
    setOpen(true)
    try { window.dispatchEvent(new CustomEvent('infraster:leftPanel:openDetail', { detail: { name: p.name } })) } catch (e) {}
    // same fetch logic when toggling open to update title from api if name contains an id
    try {
      const m = String(p.name ?? '').match(/#(\w+)$/)
      if (m && m[1]) {
        try { fetchAbortRef.current?.abort() } catch (e) {}
        const ac = new AbortController()
        fetchAbortRef.current = ac
        ;(async () => {
          try {
            const res = await fetch(`/api/infra/id?id=${encodeURIComponent(m[1])}`, { signal: ac.signal, credentials: 'same-origin' })
            if (!res.ok) return
            const j = await res.json().catch(() => null)
            if (j && j.name) setTitle(j.name)
          } catch (e) {}
        })()
      }
    } catch (e) {}
  }, [open, contentKey])

  const value = React.useMemo(() => ({ open, title, html, contentKey, openPanel, closePanel, togglePanel }), [open, title, html, contentKey, openPanel, closePanel, togglePanel])

  return (
    <LeftPanelContext.Provider value={value}>
      {children}
    </LeftPanelContext.Provider>
  )
}

export function useLeftPanel() {
  const ctx = React.useContext(LeftPanelContext)
  if (!ctx) throw new Error('useLeftPanel must be used within LeftPanelProvider')
  return ctx
}

export default LeftPanelContext
