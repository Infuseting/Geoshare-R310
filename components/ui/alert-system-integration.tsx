"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useLeftPanel } from './left-panel-context'
import AlertToast, { AlertData } from './alert-toast'
import NearbyLocationsList, { NearbyLocation } from './nearby-locations-list'
import InfraViewer from './infra-viewer'

export default function AlertSystemIntegration() {
    const { openPanel } = useLeftPanel()
    const [activeAlert, setActiveAlert] = useState<AlertData | null>(null)
    const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([])
    const hasCheckedRef = useRef(false)

    // Function to open the details panel
    const showDetails = (locations: NearbyLocation[] = nearbyLocations) => {
        if (locations.length === 0) return

        openPanel({
            name: '⚠️ Zones de repli',
            title: (
                <div className="flex items-center gap-2 text-red-700">
                    <span>Zones de repli disponibles</span>
                </div>
            ),
            html: <NearbyLocationsList 
                    locations={locations} 
                    onSelect={(loc) => {
                        window.dispatchEvent(new CustomEvent('geoshare:panTo', { 
                            detail: { lat: loc.lat, lng: loc.lon, zoom: 16, addMarker: true } 
                        }))
                        openPanel({
                            name: loc.name,
                            title: loc.name,
                            html: <InfraViewer infra={{ id: loc.id, name: loc.name, lat: loc.lat, lon: loc.lon }} />
                        })
                    }} 
                  />
        })
    }

    useEffect(() => {
        if (hasCheckedRef.current) return
        if (!('geolocation' in navigator)) return

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                
                try {
                    const checkRes = await fetch('/api/alerts/check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lat: latitude, lon: longitude })
                    })
                    
                    if (!checkRes.ok) return
                    const checkData = await checkRes.json()
                    const alerts = checkData.alerts || []

                    if (alerts.length > 0) {
                        const sorted = alerts.sort((a: any, b: any) => {
                            const priority = { 'ROUGE': 3, 'ORANGE': 2, 'JAUNE': 1 }
                            // @ts-ignore
                            return  priority[b.risk_level] - priority[a.risk_level] 
                        })
                        
                        const topAlert = sorted[0]
                        setActiveAlert(topAlert)
                        hasCheckedRef.current = true

                        const nearbyRes = await fetch('/api/alerts/nearby-available', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                lat: latitude, 
                                lon: longitude,
                                minAvailabilityPercent: 10 
                            })
                        })

                        if (nearbyRes.ok) {
                            const locations = await nearbyRes.json()
                            setNearbyLocations(locations)
                            showDetails(locations)
                        }
                    }
                } catch (e) {
                    console.error('Alert system error', e)
                }
            },
            (err) => {
                console.warn('Geolocation denied or failed', err)
            }
        )
    }, [openPanel])

    return (
        <AlertToast 
            alert={activeAlert} 
            onClick={() => showDetails()}
        />
    )
}
