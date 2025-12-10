"use client"
import React from 'react'
import { useLeftPanel } from './left-panel-context'

export default function LeftPanel({name, children}: {name?: string, children?: React.ReactNode}) {
  const { open, title, html, closePanel } = useLeftPanel()

  // Notify search UI using window events for backward compatibility when panel opens/closes
  React.useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('geoshare:leftPanel:open'))
      // also request search to close
      window.dispatchEvent(new CustomEvent('geoshare:search:close'))
    } else {
      window.dispatchEvent(new CustomEvent('geoshare:leftPanel:close'))
    }
  }, [open])

  return (
    <>
      {/* Toggle button (kept for quick access) */}
      <button
        aria-expanded={open}
        aria-controls="left-panel"
        onClick={() => { if (open) { window.dispatchEvent(new CustomEvent('geoshare:leftPanel:userClose')); closePanel(); } }}
        className="fixed left-2 top-4 z-9999 bg-white border rounded-full p-2 shadow-sm hover:bg-gray-50"
      >
        <span className="sr-only">Toggle left panel</span>
        {open ? '←' : '☰'}
      </button>

      {/* Panel: always rendered so we can animate open/close via CSS */}
      <div
        id="left-panel"
        className={`fixed left-16 top-0 h-screen w-[min(320px,56vw)] max-h-screen bg-white shadow-md z-9998 overflow-auto rounded-r-2xl transform transition-transform duration-500 ease-out ${open ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between mb-4 px-4 pt-4">
          <h3 className="font-semibold">{title ?? name ?? 'Panneau'}</h3>
          <button onClick={() => { window.dispatchEvent(new CustomEvent('geoshare:leftPanel:userClose')); closePanel(); }} className="text-sm text-gray-500">☰</button>
        </div>
        <div>

          {children}
          {/* render any React node passed as html */}
          {html && <div className="mt-2">{html}</div>}
        </div>
      </div>
    </>
  )
}
 
