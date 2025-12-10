import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Edit2, AlertTriangle, Calendar, Clock } from 'lucide-react'
import MultiComboBox, { Option } from './multi-combobox'

// Types
type AlertItem = {
    id: number
    title: string
    message?: string
    risk_level: 'JAUNE' | 'ORANGE' | 'ROUGE'
    start_time: string
    end_time?: string
    is_active: number // 0 or 1
    communes_names?: string
    regions_names?: string
    epcis_names?: string
}

type ResponsibleAreas = {
    communes: Array<{ id: number, name: string, codepostal: string }>
    regions: Array<{ id: number, name: string }>
    epcis: Array<{ id: number, name: string }>
}

export default function AlertManager() {
    const [alerts, setAlerts] = useState<AlertItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [responsibleAreas, setResponsibleAreas] = useState<ResponsibleAreas>({ communes: [], regions: [], epcis: [] })

    const fetchAlerts = async () => {
        try {
            const res = await fetch('/api/alerts/my')
            if (res.ok) {
                const data = await res.json()
                setAlerts(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchAreas = async () => {
        try {
            const res = await fetch('/api/user/responsible-areas')
            if (res.ok) {
                const data = await res.json()
                setResponsibleAreas(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        fetchAlerts()
        fetchAreas()
    }, [])

    const handleDelete = async (id: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) return
        try {
            const res = await fetch('/api/alerts/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                setAlerts(prev => prev.filter(a => a.id !== id))
            } else {
                alert('Erreur lors de la suppression')
            }
        } catch (e) {
            alert('Erreur serveur')
        }
    }

    const handleCreate = async (data: any) => {
        try {
            const res = await fetch('/api/alerts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                setShowModal(false)
                fetchAlerts()
            } else {
                const err = await res.json()
                alert(err.error || 'Erreur lors de la création')
            }
        } catch (e) {
            alert('Erreur serveur')
        }
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-lg font-bold text-gray-900">Mes Alertes</h3>
                   <p className="text-sm text-gray-500">Gérez les alertes pour vos zones de responsabilité</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                    <Plus size={16} />
                    Nouvelle Alerte
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Chargement...</div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                    Aucune alerte configurée.
                </div>
            ) : (
                <div className="grid gap-4">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                        alert.risk_level === 'ROUGE' ? 'bg-red-100 text-red-700 border border-red-200' :
                                        alert.risk_level === 'ORANGE' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    }`}>
                                        {alert.risk_level}
                                    </span>
                                    {alert.is_active ? (
                                        <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs text-medium">Inactive</span>
                                    )}
                                </div>
                                <h4 className="font-bold text-gray-900">{alert.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">{alert.message}</p>
                                
                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        Du {new Date(alert.start_time).toLocaleDateString()}
                                        {alert.end_time && ` au ${new Date(alert.end_time).toLocaleDateString()}`}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AlertTriangle size={12} />
                                        Zones: {[alert.communes_names, alert.regions_names, alert.epcis_names].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 self-end md:self-center">
                                <button 
                                    onClick={() => handleDelete(alert.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Supprimer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    <AlertForm 
                        areas={responsibleAreas} 
                        onClose={() => setShowModal(false)}
                        onSubmit={handleCreate}
                    />
                </div>
            )}
        </div>
    )
}

function AlertForm({ areas, onClose, onSubmit }: { areas: ResponsibleAreas, onClose: () => void, onSubmit: (data: any) => void }) {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [riskLevel, setRiskLevel] = useState<'JAUNE' | 'ORANGE' | 'ROUGE'>('JAUNE')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    
    // Selections
    const [selectedCommunes, setSelectedCommunes] = useState<number[]>([])
    const [selectedRegions, setSelectedRegions] = useState<number[]>([])
    const [selectedEpcis, setSelectedEpcis] = useState<number[]>([])

    // Options for MultiComboBox
    const regionOptions = useMemo<Option[]>(() => areas.regions.map(r => ({ value: Number(r.id), label: r.name })), [areas.regions])
    const epciOptions = useMemo<Option[]>(() => areas.epcis.map(e => ({ value: Number(e.id), label: e.name })), [areas.epcis])
    const communeOptions = useMemo<Option[]>(() => areas.communes.map(c => ({ value: Number(c.id), label: `${c.name} (${c.codepostal})` })), [areas.communes])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !startTime) return
        
        onSubmit({
            title,
            message,
            risk_level: riskLevel,
            start_time: startTime,
            end_time: endTime || null,
            communes: selectedCommunes,
            regions: selectedRegions,
            epcis: selectedEpcis
        })
    }

    const hasNoResult = areas.communes.length === 0 && areas.regions.length === 0 && areas.epcis.length === 0

    return (
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="font-bold text-xl">Nouvelle Alerte</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'alerte *</label>
                   <input 
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border rounded-lg p-2"
                        placeholder="Ex: Alerte Inondation"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                   <textarea 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="w-full border rounded-lg p-2"
                        rows={3}
                        placeholder="Détails sur l'alerte..."
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de risque *</label>
                        <select 
                            value={riskLevel}
                            onChange={(e: any) => setRiskLevel(e.target.value)}
                            className="w-full border rounded-lg p-2"
                        >
                            <option value="JAUNE">JAUNE</option>
                            <option value="ORANGE">ORANGE</option>
                            <option value="ROUGE">ROUGE</option>
                        </select>
                    </div>
                    <div>
                         {/* Spacer or active toggle? */}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                        <input 
                            type="datetime-local"
                            required
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full border rounded-lg p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                        <input 
                            type="datetime-local"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="w-full border rounded-lg p-2"
                        />
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Zones affectées</h4>
                    {hasNoResult && (
                         <div className="p-3 bg-orange-50 text-orange-700 rounded text-sm mb-2">
                             Vous n'êtes responsable d'aucune zone (Commune, Région, EPCI). Impossible de cibler une alerte.
                         </div>
                    )}

                    <div className="space-y-4">
                        {areas.regions.length > 0 && (
                            <div>
                                <MultiComboBox 
                                    label="Régions"
                                    options={regionOptions}
                                    selected={selectedRegions}
                                    onChange={(vals) => setSelectedRegions(vals as number[])}
                                    placeholder="Sélectionner des régions..."
                                />
                            </div>
                        )}
                        
                        {areas.epcis.length > 0 && (
                            <div>
                                <MultiComboBox 
                                    label="EPCIs"
                                    options={epciOptions}
                                    selected={selectedEpcis}
                                    onChange={(vals) => setSelectedEpcis(vals as number[])}
                                    placeholder="Sélectionner des EPCIs..."
                                />
                            </div>
                        )}

                        {areas.communes.length > 0 && (
                            <div>
                                <MultiComboBox 
                                    label="Communes"
                                    options={communeOptions}
                                    selected={selectedCommunes}
                                    onChange={(vals) => setSelectedCommunes(vals as number[])}
                                    placeholder="Sélectionner des communes..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit"
                        disabled={hasNoResult}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Créer l'alerte
                    </button>
                </div>
            </form>
        </div>
    )
}
