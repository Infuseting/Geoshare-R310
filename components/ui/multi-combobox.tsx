"use client"

import React from "react"

type Props = {
  options: string[]
  selected: string[]
  onChange: (s: string[]) => void
  placeholder?: string
}

export default function MultiComboBox({ options, selected, onChange, placeholder }: Props) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [highlight, setHighlight] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const available = React.useMemo(() => {
    const lower = q.trim().toLowerCase()
    return options
      .filter((o) => !selected.includes(o))
      .filter((o) => (lower === "" ? true : o.toLowerCase().includes(lower)))
  }, [options, selected, q])

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return
      if (!(e.target instanceof Node)) return
      if (!containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  function add(item: string) {
    const next = [...selected, item]
    onChange(next)
    setQ("")
    // keep dropdown open so the user can select multiple items in sequence
    setOpen(true)
    setHighlight(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function remove(item: string) {
    onChange(selected.filter((s) => s !== item))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHighlight((h) => Math.min(h + 1, available.length - 1))
      setOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault(); if (available[highlight]) add(available[highlight])
    } else if (e.key === 'Backspace') {
      if (q === '' && selected.length > 0) {
        // remove last
        remove(selected[selected.length - 1])
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-wrap gap-2 items-center border rounded p-2 bg-white">
        {selected.map((s) => (
          <span key={s} className="flex items-center bg-gray-100 text-sm text-gray-800 px-2 py-1 rounded">
            <span className="mr-2">{s}</span>
            <button onClick={() => remove(s)} className="text-gray-500 hover:text-gray-800">✕</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHighlight(0) }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Sélectionner..."}
          className="flex-1 outline-none text-sm text-gray-700 bg-transparent min-w-[120px]"
        />
      </div>

      {open && available.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full max-h-52 overflow-auto border rounded bg-white shadow z-50">
          {available.map((o, i) => (
            <div
              key={o}
              onMouseDown={(e) => { e.preventDefault(); add(o) }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-3 py-2 cursor-pointer ${i === highlight ? 'bg-gray-100' : ''}`}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
