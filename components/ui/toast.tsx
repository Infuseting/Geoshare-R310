"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastVariant = 'default' | 'success' | 'destructive'

type ToastMessage = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  toast: (t: { title?: string; description?: string; variant?: ToastVariant; duration?: number }) => string
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const toast = React.useCallback(({ title, description, variant = 'default', duration = 3000 }: { title?: string; description?: string; variant?: ToastVariant; duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const msg: ToastMessage = { id, title, description, variant }
    setToasts((s) => [msg, ...s])
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id))
      }, duration)
    }
    return id
  }, [])

  const remove = React.useCallback((id: string) => setToasts((s) => s.filter((t) => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ toast, dismiss: remove }}>
      {children}
      <div aria-live="polite">
  <div className="fixed right-4 bottom-4 z-[50000] flex flex-col-reverse gap-2 items-end">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div
                  className={`max-w-sm w-full pointer-events-auto bg-white border rounded-lg shadow-lg p-3 ring-1 ring-black/5 flex items-start space-x-3 ${t.variant === 'destructive' ? 'border-red-200' : ''}`}
                >
                  <div className="flex-1">
                    {t.title && <div className="font-medium text-sm">{t.title}</div>}
                    {t.description && <div className="text-sm text-gray-500 mt-1">{t.description}</div>}
                  </div>
                  <div className="pl-2">
                    <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}

export function useToastDismiss() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToastDismiss must be used within ToastProvider')
  return ctx.dismiss
}

export default ToastProvider
