"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

export type AlertRiskLevel = 'JAUNE' | 'ORANGE' | 'ROUGE'

export interface AlertData {
  id: number
  title: string
  message?: string
  risk_level: AlertRiskLevel
  source_type?: string
}

export interface AlertToastProps {
  alert: AlertData | null
  onDismiss?: () => void
  onClick?: () => void
}

export default function AlertToast({ alert, onDismiss, onClick }: AlertToastProps) {
  if (!alert) return null

  const borderColor = {
    'JAUNE': 'border-yellow-400',
    'ORANGE': 'border-orange-500',
    'ROUGE': 'border-red-600'
  }[alert.risk_level]

  const textColor = {
    'JAUNE': 'text-yellow-600',
    'ORANGE': 'text-orange-600',
    'ROUGE': 'text-red-700'
  }[alert.risk_level]
  
  const iconColor = {
    'JAUNE': 'text-yellow-500',
    'ORANGE': 'text-orange-500',
    'ROUGE': 'text-red-600'
  }[alert.risk_level]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        exit={{ y: 100, opacity: 0, x: '-50%' }}
        className={`fixed bottom-8 left-1/2 z-[50000] w-full max-w-md px-4 cursor-pointer`}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`bg-white border-4 ${borderColor} rounded-xl shadow-2xl p-4 flex items-start gap-4 relative`}>
            {/* Removed internal dismiss button based on user request "il faut pas que ça s'enleve" */
            /* If reinstatement is needed, uncomment below */
            /* 
            {onDismiss && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss() }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>
            )}
            */
            }
            
            <div className={`mt-1 ${iconColor}`}>
                <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            
            <div className="flex-1 pr-6">
                <h3 className={`font-bold text-lg leading-tight uppercase mb-1 ${textColor}`}>
                    {alert.title}
                </h3>
                {alert.message && (
                    <p className="text-gray-700 text-sm leading-snug">
                        {alert.message}
                    </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider border`}>
                        Niveau {alert.risk_level}
                    </span>
                    {alert.source_type && (
                         <span className="text-[10px] text-gray-400">
                             Zone: {alert.source_type}
                         </span>
                    )}
                </div>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
