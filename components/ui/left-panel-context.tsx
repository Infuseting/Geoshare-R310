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

  const openPanel = React.useCallback((p: LeftPanelPayload) => {
    setContentKey(p.name)
    setTitle(p.title ?? p.name)
    setHtml(p.html)
    setOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setOpen(false)
  }, [])

  const togglePanel = React.useCallback((p: LeftPanelPayload) => {
    // if same contentKey and currently open -> close
    if (p.name && open && p.name === contentKey) {
      setOpen(false)
      return
    }
    setContentKey(p.name)
    setTitle(p.title ?? p.name)
    setHtml(p.html)
    setOpen((v) => !v)
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
