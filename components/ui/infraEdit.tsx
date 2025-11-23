import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Infrastructure } from "../../app/dashboard/page";

import MultiComboBox from "./multi-combobox";
import React from "react";

type Props = {
  infra: Infrastructure;
  onClose: () => void;
  onSave: (updated: Infrastructure) => void;
};

async function updateInfrastructure(data: Partial<Infrastructure>) {
  const response = await fetch("/api/infra/modify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error || "Erreur lors de la modification");
  }
  return await response.json(); // renvoie l'infrastructure modifiée
}

export default function InfraEditModal({ infra, onSave, onClose }: Props) {
  const [piecesOptions, setPiecesOptions] = useState<string[]>([]);
  const [equipOptions, setEquipOptions] = useState<string[]>([]);
  const [accessOptions, setAccessOptions] = useState<string[]>([]);

  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [selectedEquips, setSelectedEquips] = useState<string[]>([]);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);

  const [form, setForm] = useState<Infrastructure>(infra);

  useEffect(() => {
    let mounted = true;
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setPiecesOptions(Array.isArray(data.pieces) ? data.pieces : []);
        setEquipOptions(
          Array.isArray(data.equipements) ? data.equipements : []
        );
        setAccessOptions(
          Array.isArray(data.accessibilites) ? data.accessibilites : []
        );
      })
      .catch((e) => console.error("failed to load filters", e));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Initialiser les sélections à partir du form
    setSelectedPieces(form.piece?.split(", ") || []);
    setSelectedEquips(form.type?.split(", ") || []);
    setSelectedAccess(form.accessibility?.split(", ") || []);
  }, [form]);

  const handleChange = (
    field: keyof Infrastructure,
    value: string | string[]
  ) => {
    const cleanedArray = Array.isArray(value)
      ? value.filter((v) => v.trim() !== "")
      : [];
    const formatted = Array.isArray(value)
      ? cleanedArray.length > 0
        ? cleanedArray.join(", ")
        : undefined
      : value.trim() || undefined;

    setForm((prev) => ({ ...prev, [field]: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newInfra: Infrastructure = {
      ...form,
      piece: selectedPieces.join(", "),
      accessibility: selectedAccess.join(", "),
    };

    console.log("Données modifiées :", newInfra);
    updateInfrastructure(newInfra);
    onSave(newInfra);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative overflow-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Modifier l'infrastructure
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Nom"
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="text"
            value={form.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Adresse"
            className="w-full border rounded px-3 py-2"
          />
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Sélectionner un statut</option>
            <option value="Ouvert">Ouvert</option>
            <option value="Fermé">Fermé</option>
            <option value="Plein">Plein</option>
          </select>

          <textarea
            value={form.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Description"
            className="w-full border rounded px-3 py-2"
          />

          {/* Accessibilité */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Accessibilités
            </label>
            <MultiComboBox
              options={accessOptions}
              selected={selectedAccess}
              onChange={(value) => {
                const cleaned = value.filter((v) => v.trim() !== "");
                setSelectedAccess(cleaned);
                handleChange("accessibility", cleaned);
              }}
              placeholder="Sélectionner accessibilités"
            />
          </div>

          {/* Types de pièces */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Types de pièces
            </label>
            <MultiComboBox
              options={piecesOptions}
              selected={selectedPieces}
              onChange={(value) => {
                const cleaned = value.filter((v) => v.trim() !== "");
                setSelectedPieces(cleaned);
                handleChange("piece", cleaned);
              }}
              placeholder="Sélectionner types de pièces"
            />
          </div>

          {/* Types d'équipements */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Types d'équipements
            </label>
            <MultiComboBox
              options={equipOptions}
              selected={selectedEquips}
              onChange={(value) => {
                const cleaned = value.filter((v) => v.trim() !== "");
                setSelectedEquips(cleaned);
                handleChange("type", cleaned);
              }}
              placeholder="Sélectionner types d'équipements"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#e30613] text-white py-2 rounded hover:bg-[#c00010]"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
