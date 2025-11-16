"use client"
import React from 'react'
import { useLeftPanel } from './left-panel-context'

export default function LeftPanel({name, children}: {name?: string, children?: React.ReactNode}) {
  const { open, title, html, closePanel } = useLeftPanel()

  // Notify search UI using window events for backward compatibility when panel opens/closes
  React.useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('infraster:leftPanel:open'))
      // also request search to close
      window.dispatchEvent(new CustomEvent('infraster:search:close'))
    } else {
      window.dispatchEvent(new CustomEvent('infraster:leftPanel:close'))
    }
  }, [open])

  return (
    <>
      {/* Toggle button (kept for quick access) */}
      <button
        aria-expanded={open}
        aria-controls="left-panel"
        onClick={() => (open ? closePanel() : null)}
        className="fixed left-2 top-4 z-9999 bg-white border rounded-full p-2 shadow-sm hover:bg-gray-50"
      >
        <span className="sr-only">Toggle left panel</span>
        {open ? '←' : '☰'}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="left-panel"
          className="fixed left-16 top-0 h-screen w-[min(320px,56vw)] max-h-screen bg-white shadow-md z-9998 overflow-auto rounded-r-2xl"
        >
          <div className="flex items-center justify-between mb-4 px-4 pt-4">
            <h3 className="font-semibold">{title ?? name ?? 'Panneau'}</h3>
            <button onClick={() => closePanel()} className="text-sm text-gray-500">☰</button>
          </div>
          <div>

            {children}
            {/* render any React node passed as html */}
            {html && <div className="mt-2">{html}</div>}
          </div>
        </div>
      )}
    </>
  )
}
 
