"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Save, AlertCircle } from 'lucide-react'

type Exception = {
  id: number
  date_debut: string
  date_fin: string
  type: 'Ouverture' | 'Fermeture'
}

type OpeningData = {
  id_ouverture: number | null
  weekly: string[]
  exceptions: Exception[]
}

type Props = {
  infraId: string
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function OpeningHoursManager({ infraId }: Props) {
  const [data, setData] = useState<OpeningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [newException, setNewException] = useState({
    date_debut: '',
    date_fin: '',
    type: 'Ouverture' as 'Ouverture' | 'Fermeture'
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [infraId])

  async function loadData() {
    try {
      setLoading(true)
      const res = await fetch(`/api/infra/opening?id=${infraId}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      console.log('Opening data loaded:', json)
      console.log('Weekly days:', json.weekly)
      setData(json)
      setSelectedDays(json.weekly || [])
    } catch (e) {
      showMessage('error', 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  async function saveWeeklySchedule() {
    try {
      setSaving(true)
      const res = await fetch('/api/infra/opening/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ infraId, days: selectedDays })
      })
      if (!res.ok) throw new Error('Failed to save')
      showMessage('success', 'Horaires sauvegardés')
      await loadData()
    } catch (e) {
      showMessage('error', 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function addException() {
    if (!newException.date_debut || !newException.date_fin) {
      showMessage('error', 'Veuillez remplir les dates')
      return
    }
    try {
      const res = await fetch('/api/infra/opening/exception/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ infraId, ...newException })
      })
      if (!res.ok) throw new Error('Failed to add')
      showMessage('success', 'Exception ajoutée')
      setNewException({ date_debut: '', date_fin: '', type: 'Ouverture' })
      await loadData()
    } catch (e) {
      showMessage('error', "Erreur d'ajout")
    }
  }

  async function deleteException(id: number) {
    if (!confirm('Supprimer cette exception ?')) return
    try {
      const res = await fetch(`/api/infra/opening/exception/delete?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete')
      showMessage('success', 'Exception supprimée')
      await loadData()
    } catch (e) {
      showMessage('error', 'Erreur de suppression')
    }
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message notification */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Horaires hebdomadaires</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {DAYS.map(day => (
            <label
              key={day}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedDays.includes(day)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedDays.includes(day)}
                onChange={() => toggleDay(day)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className={`text-sm font-medium ${
                selectedDays.includes(day) ? 'text-blue-900' : 'text-gray-700'
              }`}>
                {day}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={saveWeeklySchedule}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
        </button>
      </div>

      {/* Exceptions */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exceptions (ouvertures/fermetures spéciales)</h3>
        
        {/* Add exception form */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Ajouter une exception</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
              <input
                type="date"
                value={newException.date_debut}
                onChange={e => setNewException(prev => ({ ...prev, date_debut: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
              <input
                type="date"
                value={newException.date_fin}
                onChange={e => setNewException(prev => ({ ...prev, date_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newException.type}
                onChange={e => setNewException(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="Ouverture">Ouverture spéciale</option>
                <option value="Fermeture">Fermeture</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={addException}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Exceptions list */}
        {data && data.exceptions.length > 0 ? (
          <div className="space-y-2">
            {data.exceptions.map(exc => (
              <div
                key={exc.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  exc.type === 'Ouverture'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      exc.type === 'Ouverture'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {exc.type === 'Ouverture' ? 'Ouverture spéciale' : 'Fermeture'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    Du {new Date(exc.date_debut).toLocaleDateString('fr-FR')} au {new Date(exc.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => deleteException(exc.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Aucune exception définie</p>
        )}
      </div>
    </div>
  )
}
