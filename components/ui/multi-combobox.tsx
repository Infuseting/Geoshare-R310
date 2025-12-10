"use client"

import React from "react"
import { Check, X } from "lucide-react"

export type Option = {
  value: string | number
  label: string
}

type Props = {
  options: Option[]
  selected: (string | number)[]
  onChange: (values: (string | number)[]) => void
  placeholder?: string
  label?: string
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function MultiComboBox({ options, selected, onChange, placeholder, label }: Props) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [highlight, setHighlight] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const available = React.useMemo(() => {
    const lower = q.trim().toLowerCase()
    return options
      .filter((o) => !selected.includes(o.value))
      .filter((o) => (lower === "" ? true : o.label.toLowerCase().includes(lower)))
  }, [options, selected, q])

  function add(item: Option) {
    const next = [...selected, item.value]
    onChange(next)
    setQ("")
    setOpen(true)
    setHighlight(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function remove(value: string | number) {
    onChange(selected.filter((s) => s !== value))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); 
      if (!open) {
          setOpen(true)
      } else {
         setHighlight((h) => Math.min(h + 1, available.length - 1))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault(); 
      if (available[highlight] && open) add(available[highlight])
    } else if (e.key === 'Backspace') {
      if (q === '' && selected.length > 0) {
        remove(selected[selected.length - 1])
      }
    }
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <div 
                className="flex flex-wrap gap-2 items-center border rounded-lg p-2 bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow cursor-text w-full"
                onClick={() => inputRef.current?.focus()}
            >
                {selected.map((val) => {
                const opt = options.find(o => o.value === val)
                return (
                    <span key={val} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-2 py-1 rounded-md border border-blue-100">
                        <span>{opt?.label || val}</span>
                        <button 
                        onClick={(e) => { e.stopPropagation(); remove(val) }} 
                        className="text-blue-400 hover:text-blue-700 rounded-full p-0.5"
                        >
                            <X size={14} />
                        </button>
                    </span>
                )
                })}
                <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setOpen(true); setHighlight(0) }}
                    onKeyDown={onKeyDown}
                    onFocus={() => setOpen(true)}
                    placeholder={selected.length === 0 ? (placeholder ?? "Sélectionner...") : ""}
                    className="flex-1 outline-none text-sm text-gray-700 bg-transparent min-w-[80px]"
                />
            </div>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[300px]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="max-h-60 overflow-auto">
                {available.length > 0 ? (
                    available.map((o, i) => (
                        <div
                        key={o.value}
                        onMouseDown={(e) => { e.preventDefault(); add(o) }}
                        onMouseEnter={() => setHighlight(i)}
                        className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${i === highlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                        >
                            <span>{o.label}</span>
                            {i === highlight && <span className="text-xs text-blue-400">Entrée pour ajouter</span>}
                        </div>
                    ))
                ) : (
                    <div className="p-3 text-sm text-gray-500 text-center">Aucun résultat</div>
                )}
            </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
