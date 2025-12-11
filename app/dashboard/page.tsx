"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AccordeonInfra from "../../components/accordeonInfra";
import InfraEdit from "../../components/ui/infraEdit";
import InfraAddModal from "@/components/ui/infraAddModal";
import UserMenu from "@/components/ui/user-menu";
import AlertManager from "@/components/ui/alert-manager";

const Carte = dynamic(() => import("../../components/ui/dashboarCarte"), {
  ssr: false,
});

import { Undo2, Plus } from "lucide-react";
/* Types */
type InfrastructureType =
  | "Multisports/City-stades"
  | "Boucle de randonnée"
  | "Salle de musculation/cardiotraining"
  | "Salle multisports (gymnase)"
  | "Bassin mixte de natation"
  | "Carrière"
  | "Terrain de pétanque"
  | "Terrain de football"
  | "Terrain de basket-ball"
  | "Dojo / Salle d'arts martiaux"
  | "Autre";

export type Infrastructure = {
  id: string;
  name: string;
  type: InfrastructureType;
  address?: string;
  city?: string;
  postalCode?: string;
  status: "Ouvert" | "Fermé" | "Plein";
  createdAt: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  piece?: string;
  accessibility?: string;
};

/* Utils */
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 9);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

/* API calls */
const fetchInfrastructures = async (): Promise<Infrastructure[]> => {
  const res = await fetch("/api/infra/my");
  if (!res.ok) {
    throw new Error("Failed to fetch infrastructures");
  }
  return res.json();
};

const createInfrastructure = async (
  payload: Omit<Infrastructure, "id" | "createdAt">
): Promise<Infrastructure> => {
  const res = await fetch("/api/infra/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create infrastructure");
  }
  return res.json();
};

/* Small UI primitives */
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warn";
}> = ({ children, variant = "neutral" }) => {
  const bg =
    variant === "success"
      ? "#d1fae5"
      : variant === "warn"
      ? "#fff4e5"
      : "#eef2ff";
  const color = variant === "warn" ? "#92400e" : "#0f172a";
  return (
    <span
      className="inline-block px-2 py-1 rounded-lg text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
};

/* Dashboard Page */
export default function DashboardPage(): JSX.Element {
  const [tab, setTab] = useState<'infra' | 'alerts'>('infra');
  const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddInfra = (newInfra: Infrastructure) => {
    setItems((prev) => [newInfra, ...prev]); 
    setPage(1); 
  };

  const handleSave = (updated: Infrastructure) => {
    console.log("updated.id:", updated.id);
    console.log(
      "items ids:",
      items.map((i) => i.id)
    );
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/infra/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || "Échec de la suppression");
        return;
      }

      // Remove from state
      setItems((prev) => prev.filter((item) => item.id !== id));
      console.log(`✅ Infrastructure ${id} supprimée`);
    } catch (e) {
      console.error("Error deleting infrastructure:", e);
      alert("Erreur lors de la suppression");
    }
  };

  const handleMapInfraClick = (infraId: string) => {
    // Set the selected infrastructure to expand it
    setSelectedInfraId(infraId);
    
    // Find the infrastructure in the filtered list to get its page
    const infraIndex = filtered.findIndex(item => item.id === infraId);
    if (infraIndex !== -1) {
      // Calculate which page the infrastructure is on
      const targetPage = Math.floor(infraIndex / perPage) + 1;
      setPage(targetPage);
      
      // Scroll to the infrastructure list
      setTimeout(() => {
        const element = document.getElementById(`infra-${infraId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const [selectedCenter, setSelectedCenter] = useState<[number, number] | null>(
    null
  );
  const [selectedInfraId, setSelectedInfraId] = useState<string | null>(null);
  const [items, setItems] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);

  /* UI state */
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InfrastructureType | "All">(
    "All"
  );
  const [statusFilter, setStatusFilter] = useState<
    "All" | Infrastructure["status"]
  >("All");
  const [page, setPage] = useState(1);
  const perPage = 6;

  /* Modal/Form state */
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check user authentication and type
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          window.location.href = "/login";
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setUserType(data.type);

        // Only ENTREPRISE, COLLECTIVITE, and ASSOCIATION can access dashboard
        if (
          !["ENTREPRISE", "COLLECTIVITE", "ASSOCIATION"].includes(data.type)
        ) {
          alert(
            "Vous devez être une entreprise, collectivité ou association pour accéder au dashboard."
          );
          window.location.href = "/";
          return;
        }

        // Fetch infrastructures
        setLoading(true);
        fetchInfrastructures()
          .then((data) => setItems(data))
          .catch((e) => setError(String(e)))
          .finally(() => setLoading(false));
      })
      .catch((e) => {
        console.error("Auth check failed:", e);
        window.location.href = "/login";
      });
  }, []);

  /* Derived data (search + filters) */
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (typeFilter !== "All" && !it.type.includes(typeFilter)) return false;
      if (statusFilter !== "All" && it.status !== statusFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        (it.address || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  /* Pagination slice */
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  /* Handlers */
  const handleCreate = async (
    payload: Omit<Infrastructure, "id" | "createdAt">
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInfrastructure(payload);
      setItems((s) => [created, ...s]);
      setShowForm(false);
      setPage(1);
    } catch (e) {
      setError("Impossible de créer l'infrastructure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 font-sans max-w-[1100px] mx-auto">
      <header className="flex flex-col md:flex-row items-center justify-between gap-3 mb-5">
        <div className=" flex  self-start md:self-center gap-2">
          {" "}
          <button
            onClick={() => {
              window.location.href = "/map";
            }}
            aria-label="Retour à l'accueil"
            className="z-50 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 "
          >
            <Undo2 className="w-4 h-4" />
            Retour
          </button>
        </div>
        <div>
          <h2 className="m-0 text-xl font-semibold">
             Tableau de bord
          </h2>
          <p className="mt-1.5 text-slate-600">
             Gérez vos infrastructures et vos alertes
          </p>
        </div>

        <div className="flex gap-2">
           {tab === 'infra' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-gray-300 bg-gray-100 text-sm text-gray-800 font-semibold hover:bg-gray-200 "
              >
                <Plus className="w-4 h-4" />
                Ajouter une infrastructure
              </button>
           )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        <button
            onClick={() => setTab('infra')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === 'infra' 
                ? 'bg-white border-l border-t border-r text-blue-600' 
                : 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            Infrastructures
        </button>
        {userType !== 'ENTREPRISE' && (
            <button
                onClick={() => setTab('alerts')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    tab === 'alerts' 
                    ? 'bg-white border-l border-t border-r text-blue-600' 
                    : 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                Alertes
            </button>
        )}
      </div>

      {tab === 'alerts' ? (
          <AlertManager />
      ) : (
      <main className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[18px]">
        {/* Left: List */}
        <section className="min-w-0">
          <div className="flex gap-2 flex-wrap mb-3">
            <input
              aria-label="Recherche"
              placeholder="Rechercher par nom, adresse, description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-2 rounded-lg border border-[#e6e9ef]"
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="All">Tous types</option>
              <option value="Multisports/City-stades">
                MultiSports/City-stades
              </option>
              <option value="Boucle de randonnée">Boucle de randonnée</option>
              <option value="Salle de musculation/cardiotraining">
                Salle de musculation/cardiotraining
              </option>
              <option value="Salle multisports (gymnase)">Gymnase</option>
              <option value="Bassin mixte de natation">Natation</option>
              <option value="Carrière">Carrière</option>
              <option value="Terrain de pétanque">Terrain de pétanque</option>
              <option value="Terrain de football">Terrain de football</option>
              <option value="Terrain de basket-ball">
                Terrain de basket-ball
              </option>
              <option value="Dojo / Salle d'arts martiaux">
                Dojo / Salle d'arts martiaux
              </option>
              <option value="Autre">Autre</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              <option value="All">Tous statuts</option>
              <option value="Ouvert">Ouvert</option>
              <option value="Fermé">Fermé</option>
              <option value="Plein">Plein</option>
            </select>
          </div>

          <div className="bg-white rounded-[10px] p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {loading ? (
              <p>Chargement...</p>
            ) : error ? (
              <p className="text-[crimson]">{error}</p>
            ) : filtered.length === 0 ? (
              <p>Aucune infrastructure trouvée.</p>
            ) : (
              <ul className="list-none m-0 p-0 grid gap-[10px]">
                {pageItems.map((it) => (
                  <AccordeonInfra
                    key={it.id}
                    infra={it}
                    setEditingInfra={setEditingInfra}
                    isOpen={selectedInfraId === it.id}
                    onToggle={() =>
                      setSelectedInfraId((prev) =>
                        prev === it.id ? null : it.id
                      )
                    }
                    onSelect={(center) => setSelectedCenter(center)}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}

            {/* Pagination */}
            {filtered.length > perPage && (
              <div className="flex justify-between items-center mt-3">
                <div className="text-slate-500">
                  {filtered.length} résultat(s)
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:bg-slate-100"
                  >
                    Préc
                  </button>

                  <div className="px-2.5 py-1.5 bg-slate-50 rounded-md text-slate-700">
                    {page} / {totalPages}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:bg-slate-100"
                  >
                    Suiv
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Summary + Map (placeholder) */}
        <aside style={{ minWidth: 0 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <h4 style={{ margin: "0 0 8px" }}>Résumé</h4>
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#0f172a",
                }}
              >
                <span>Total infrastructures</span>
                <strong>{items.length}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#0f172a",
                }}
              >
                <span>Fermé</span>
                <strong>
                  {items.filter((i) => i.status === "Fermé").length}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#0f172a",
                }}
              >
                <span>Infrastructure pleine</span>
                <strong>
                  {items.filter((i) => i.status === "Plein").length}
                </strong>
              </div>
            </div>
          </div>
          <Carte 
            infrastructures={items} 
            selectedCenter={selectedCenter} 
            onInfraClick={handleMapInfraClick}
          />{" "}
        </aside>
      </main>
      )}

      {editingInfra && (
        <InfraEdit
          infra={editingInfra}
          onClose={() => setEditingInfra(null)}
          onSave={handleSave}
        />
      )}
      {showAddModal && (
        <InfraAddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddInfra}
        />
      )}

      {/* Modal Form */}
      {showForm && (
        <div
          role="dialog"
          aria-modal
          aria-label="Ajouter une infrastructure"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(2,6,23,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <FormCreate
            onCancel={() => setShowForm(false)}
            onSubmit={handleCreate}
            submitting={submitting}
          />
        </div>
      )}

      {/* UserMenu in bottom left corner */}
      <div className="fixed bottom-4 left-4 z-50">
        <UserMenu />
      </div>
    </div>
  );
}

/* Form component */
function FormCreate({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (
    payload: Omit<Infrastructure, "id" | "createdAt">
  ) => Promise<void>;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<InfrastructureType>("Autre");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Infrastructure["status"]>("Ouvert");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Le nom est requis";
    if (!type) e.type = "Le type est requis";
    if (lat && Number.isNaN(Number(lat))) e.lat = "Latitude invalide";
    if (lng && Number.isNaN(Number(lng))) e.lng = "Longitude invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      type,
      address: address.trim() || undefined,
      status,
      latitude: lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
      description: desc.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: 720,
        maxWidth: "100%",
        background: "white",
        borderRadius: 10,
        padding: 18,
        boxShadow: "0 8px 20px rgba(2,6,23,0.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Ajouter une infrastructure</h3>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Nom *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e6e9ef",
            }}
          />
          {errors.name && (
            <div style={{ color: "crimson", fontSize: 13 }}>{errors.name}</div>
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InfrastructureType)}
            style={{ width: "100%", padding: 8, borderRadius: 8 }}
          >
            <option value="Route">Route</option>
            <option value="Eau">Eau</option>
            <option value="Eclairage">Eclairage</option>
            <option value="Batiment">Bâtiment</option>
            <option value="Autre">Autre</option>
          </select>
          {errors.type && (
            <div style={{ color: "crimson", fontSize: 13 }}>{errors.type}</div>
          )}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Adresse
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e6e9ef",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Statut
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Infrastructure["status"])
            }
            style={{ width: "100%", padding: 8, borderRadius: 8 }}
          >
            <option value="Ouvert">Ouvert</option>
            <option value="Fermé">Fermé</option>
            <option value="Plein">Plein</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Latitude
          </label>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="49.182..."
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e6e9ef",
            }}
          />
          {errors.lat && (
            <div style={{ color: "crimson", fontSize: 13 }}>{errors.lat}</div>
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Longitude
          </label>
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-0.370..."
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e6e9ef",
            }}
          />
          {errors.lng && (
            <div style={{ color: "crimson", fontSize: 13 }}>{errors.lng}</div>
          )}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e6e9ef",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#f1f5f9",
            border: "none",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#0ea5a4",
            color: "white",
            border: "none",
            fontWeight: 700,
          }}
        >
          {submitting ? "Enregistrement..." : "Créer"}
        </button>
      </div>
    </form>
  );
}
