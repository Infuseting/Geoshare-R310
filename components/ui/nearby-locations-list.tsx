"use client"

import React from 'react'
import { MapPin, Navigation, Percent } from 'lucide-react'

export interface NearbyLocation {
    id: string
    name: string
    adresse?: string
    lat: number
    lon: number
    distance: number
    jauge: number
    max_jauge: number
    availabilityPercent: number
}

interface NearbyLocationsListProps {
    locations: NearbyLocation[]
    onSelect: (loc: NearbyLocation) => void
}

export default function NearbyLocationsList({ locations, onSelect }: NearbyLocationsListProps) {
    if (!locations || locations.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                Aucun lieu disponible trouvé à proximité avec les critères demandés.
            </div>
        )
    }

    return (
        <div className="space-y-4 p-2 pb-20">
            <div className="px-2">
                <h3 className="font-semibold text-lg">Lieux disponibles à proximité</h3>
                <p className="text-sm text-gray-500">{locations.length} résultats trouvés</p>
            </div>

            <div className="space-y-2">
                {locations.map((loc) => (
                    <div 
                        key={loc.id}
                        onClick={() => onSelect(loc)}
                        className="bg-white border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors shadow-sm flex flex-col gap-2 relative overflow-hidden group"
                    >
                        <div className="flex justify-between items-start">
                             <div className="flex-1">
                                <h4 className="font-medium text-gray-900 line-clamp-1">{loc.name}</h4>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <MapPin size={12} className="mr-1" />
                                    <span className="line-clamp-1">{loc.adresse || 'Adresse non disponible'}</span>
                                </div>
                             </div>
                             <div className="flex flex-col items-end pl-2">
                                <div className="flex items-center font-bold text-blue-600 text-sm">
                                    <Navigation size={12} className="mr-1" />
                                    {loc.distance < 1 ? 
                                        `${Math.round(loc.distance * 1000)} m` : 
                                        `${loc.distance.toFixed(1)} km`
                                    }
                                </div>
                             </div>
                        </div>

                        {/* Availability Bar */}
                        <div className="mt-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-600">Disponibilité</span>
                                <span className={`font-bold ${loc.availabilityPercent > 50 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {loc.availabilityPercent}% ({loc.max_jauge - loc.jauge} places)
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full ${
                                        loc.availabilityPercent > 50 ? 'bg-green-500' : 
                                        loc.availabilityPercent > 20 ? 'bg-yellow-500' : 
                                        'bg-red-500'
                                    }`}
                                    style={{ width: `${loc.availabilityPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
