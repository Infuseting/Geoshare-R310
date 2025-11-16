"use client"

import { Bookmark, BookmarkCheck, BookMarked, BookMarkedIcon, ChevronRight, Clock, Mail, MapPin, Route, Share2, Volleyball, Check } from 'lucide-react'
import React from 'react'
import { motion } from 'framer-motion'
import { useToast, useToastDismiss } from './toast'

type InfraSummary = {
    id: string
    name?: string
    adresse?: string
    lat?: number | null
    lon?: number | null
}

type InfraDetail = InfraSummary & {
    idVille?: number | null
    informations?: string | null
    en_service: number
    equipments: Array<{ id?: number; name?: string; type?: string }>
    accessibilites: Array<{ id?: number; name?: string }>
    isResponsable?: boolean
    responsable?: { idUser?: number; email?: string | null; name?: string | null } | null
    ville_name?: string | null
    codepostal?: string | null
}

export default function InfraViewer({ infra }: { infra?: InfraSummary }) {
    const [detail, setDetail] = React.useState<InfraDetail | null>(null)
    const [isFav, setIsFav] = React.useState<boolean>(false)
    const [copied, setCopied] = React.useState<boolean>(false)
    const toast = useToast()
    const dismissToast = useToastDismiss()
    
    // compute destination coordinates for external links (prefer detailed data)
    const destLat = detail?.lat ?? infra?.lat
    const destLon = detail?.lon ?? infra?.lon
    const destination = destLat != null && destLon != null ? `${destLat},${destLon}` : '48.8566,2.3522'

    React.useEffect(() => {
        let mounted = true
        async function load() {
            if (!infra || !infra.id) return
            try {
                const res = await fetch(`/api/infra/id?id=${encodeURIComponent(infra.id)}`, { credentials: 'same-origin' })
                if (res.status === 403) {
                    setDetail(null)
                    return
                }
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    setDetail(null)
                    return
                }
                const j = await res.json()
                if (!mounted) return
                setDetail(j as InfraDetail)
            } catch (e: any) {
                if (!mounted) return
                setDetail(null)
            } finally {
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [infra?.id])

    // sync favorites state from localStorage when infra changes
    React.useEffect(() => {
        try {
            if (!infra?.id) {
                setIsFav(false)
                return
            }
            const raw = localStorage.getItem('infraster:favorites')
            const arr = raw ? JSON.parse(raw) : []
            const set = new Set(arr.map((v: any) => String(v)))
            setIsFav(set.has(String(infra.id)))
        } catch (e) {
            // ignore
        }
    }, [infra?.id])

    function toggleFavorite() {
        if (!infra?.id) return
        try {
            const key = 'infraster:favorites'
            const raw = localStorage.getItem(key)
            const arr = raw ? JSON.parse(raw) : []
            const set = new Set(arr.map((v: any) => String(v)))
            const idStr = String(infra.id)
            if (set.has(idStr)) {
                set.delete(idStr)
                setIsFav(false)
            } else {
                set.add(idStr)
                setIsFav(true)
            }
            localStorage.setItem(key, JSON.stringify(Array.from(set)))
        } catch (e) {
            console.warn('failed to toggle favorite', e)
        }
    }

    if (!infra) return <div>Aucune infrastructure sélectionnée</div>

    return (
        <div className="space-y-3">
            <img src="https://placehold.co/600x400" alt={infra.name} className="w-full h-auto shadow-md" />
            
            <div className='flex flex-row flex-nowrap justify-center'>
                <motion.a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" className='flex flex-col justify-center items-center px-2 cursor-pointer' whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }}>
                    <p  className="bg-blue-500 rounded-full flex items-center justify-center h-10 w-10">
                        <Route className="h-5 w-5 text-white" />
                    </p>
                    <p>Itinéraire</p>
                </motion.a>
                <motion.div onClick={toggleFavorite} className='flex flex-col justify-center items-center px-2 cursor-pointer' whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }}>
                    <button  className="bg-blue-500 rounded-full flex items-center justify-center h-10 w-10">
                        {isFav ? <BookmarkCheck className="h-5 w-5 text-white" /> : <Bookmark className="h-5 w-5 text-white" />}
                    </button>
                    <p>Signets</p>
                </motion.div>
                <motion.div className='flex flex-col justify-center items-center px-2 cursor-pointer' whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} onClick={async () => {
                        try {
                            if (!infra?.id) return
                            const u = new URL(window.location.href)
                            u.searchParams.set('infra', String(infra.id))
                            const shareUrl = u.toString()
                            const pendingId = toast({ title: 'Copie en cours...', description: 'Préparation du lien...', duration: 0 })
                            await navigator.clipboard.writeText(shareUrl)
                            try { dismissToast(pendingId) } catch (e) {}
                            toast({ title: 'Lien copié', description: 'URL de l’infrastructure copiée', variant: 'success' })
                            setCopied(true)
                            window.setTimeout(() => setCopied(false), 2500)
                        } catch (e) {
                            try {
                                // fallback: build simple url
                                const shareUrl = `${window.location.origin}${window.location.pathname}?infra=${encodeURIComponent(String(infra?.id))}`
                                const pendingId = toast({ title: 'Copie en cours...', description: 'Préparation du lien...', duration: 0 })
                                await navigator.clipboard.writeText(shareUrl)
                                try { dismissToast(pendingId) } catch (e) {}
                                setCopied(true)
                                toast({ title: 'Lien copié', description: 'URL de l’infrastructure copiée', variant: 'success' })
                                window.setTimeout(() => setCopied(false), 2500)
                            } catch (err) {
                                console.warn('Failed to copy share link', err)
                                toast({ title: 'Échec', description: 'Impossible de copier le lien', variant: 'destructive' })
                            }
                        }
                    }}>
                    <button  className="bg-blue-500 rounded-full flex items-center justify-center h-10 w-10">
                        {copied ? (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>) : <Share2 className="h-5 w-5 text-white" />}
                    </button>
                    <p>{copied ? 'Copié' : 'Partager'}</p>
                </motion.div>
            </div>
            <div className='w-full h-0.5 border-t'></div>
            
                <div className={`flex flex-row flex-nowrap px-4 items-center ${detail?.informations ? ' hover:bg-gray-100/90 p-2 rounded-md cursor-pointer' : ''}`}>
                    <div>
                        <p className='text-sm'>{((detail?.informations ?? '').trim() || 'Aucune informations')}</p>
                    </div>
                    <div>
                        {detail?.informations && (<ChevronRight className="h-5 w-5 text-gray-500" />)}
                    </div>
                </div>
            
            <div className='w-full h-0.5 border-t'></div>
            <div className='flex flex-row flex-wrap px-4 justify-center space-y-4'>
                <div onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                            try {
                                const parts = [
                                    detail?.adresse ?? infra?.adresse,
                                    detail?.ville_name,
                                    detail?.codepostal
                                ].filter(Boolean).map(s => String(s).trim())
                                const addr = parts.join(' ').trim() || 'Adresse non disponible'
                                const pendingId = toast({ title: 'Copie en cours...', description: 'Préparation de l’adresse...', duration: 0 })
                                await navigator.clipboard.writeText(addr)
                                try { dismissToast(pendingId) } catch (e) {}
                                toast({ title: 'Adresse copiée', description: addr, variant: 'success' })
                            } catch (err) {
                                console.warn('Échec de la copie de l’adresse', err)
                                toast({ title: 'Échec', description: 'Impossible de copier l’adresse', variant: 'destructive' })
                            }
                        }} className='w-full space-x-2 flex flex-row items-center hover:bg-gray-100/90 p-2 rounded-md cursor-pointer'>
                    <MapPin className='flex justify-center items-center min-w-7 min-h-7'/>
                    <button
                        
                        className="text-left"
                        title="Cliquer pour copier l'adresse"
                    >
                        <p className='text-sm  cursor-pointer'>
                            {[
                                detail?.adresse ?? infra?.adresse,
                                detail?.ville_name,
                                detail?.codepostal
                            ].filter(Boolean).join(' ') || 'Adresse non disponible'}
                        </p>
                    </button>
                </div>
                <div className='w-full space-x-2 flex flex-row items-center hover:bg-gray-100/90 p-2 rounded-md cursor-pointer'>
                    <Clock className='flex justify-center items-center min-w-7 min-h-7'/>
                    <div className='flex flex-row flex-wrap items-center'>
                        <p className='text-sm'>Ouvert <span className='inline-block w-2 h-2 bg-green-600 rounded-full align-middle' /></p>
                        <p className='text-sm w-full text-gray-400'>Voir plus</p>
                    </div>
                    <div className='flex-1' />
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                </div>
                <div className='w-full space-x-2 flex flex-row items-center hover:bg-gray-100/90 p-2 rounded-md cursor-pointer' onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                            try {
                                const email = detail?.responsable?.email ?? ''
                                const pendingId = toast({ title: 'Copie en cours...', description: 'Préparation de l’email...', duration: 0 })
                                if (email) {
                                    await navigator.clipboard.writeText(email)
                                    try { dismissToast(pendingId) } catch (e) {}
                                    toast({ title: 'Email copié', description: email, variant: 'success' })
                                } else {
                                    try { dismissToast(pendingId) } catch (e) {}
                                    toast({ title: 'Aucun email', description: 'Email non disponible', variant: 'destructive' })
                                }
                            } catch (err) {
                                console.warn('Échec de la copie de l’email', err)
                                toast({ title: 'Échec', description: 'Impossible de copier l’email', variant: 'destructive' })
                            }
                        }}>
                    <Mail className='flex justify-center items-center min-w-7 min-h-7'/>
                    <button
                        
                        className="text-left"
                        title="Cliquer pour copier l'email"
                    >
                        <p className='text-sm  cursor-pointer'>{detail?.responsable?.email ?? 'Email non disponible'}</p>
                    </button>
                </div>
                
            </div>
            <div className='w-full h-0.5 border-t'></div>
            <div className='flex flex-row flex-wrap px-4 justify-center space-y-4'>
                {detail?.equipments && detail.equipments.length > 0 ? (
                    detail.equipments.map((eq) => (
                        <div key={String(eq.id ?? eq.name)} className='w-full space-x-2 flex flex-row items-center p-2 rounded-md '
                            
                        >
                            <Volleyball className='flex justify-center items-center min-w-7 min-h-7'/>
                            <p className='text-sm '>{eq.name ?? 'Équipement'}</p>
                        </div>
                    ))
                ) : (
                    <div className='w-full space-x-2 flex flex-row items-center p-2 rounded-md '
                        
                    >
                        <Volleyball className='flex justify-center items-center min-w-7 min-h-7'/>
                        <p className='text-sm '>Aucun équipement listé</p>
                    </div>
                )}
            </div>
            <div className='w-full h-0.5 border-t'></div>

            <div className='flex flex-row flex-wrap px-4 justify-center space-y-4'>
                {detail?.accessibilites && detail.accessibilites.length > 0 ? (
                    detail.accessibilites.map((ac) => (
                        <div key={String(ac.id ?? ac.name)} className='w-full space-x-2 flex flex-row items-center p-2 rounded-md '>
                            <Check className='flex justify-center items-center min-w-7 min-h-7'/>
                            <p className='text-sm '>{ac.name ?? 'Accessibilité'}</p>
                        </div>
                    ))
                ) : (
                    null
                )}
            </div>


        </div>
    )
}