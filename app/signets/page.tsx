"use client"

import React from "react"
import SignetsViewer from "@/components/ui/signets-viewer"

export default function SignetsPage() {
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Signets</h2>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>Vos infrastructures favorites. Cliquer recentre la carte et ouvre les détails.</p>
        </div>
      </header>

      <main style={{ marginTop: 18 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
          <SignetsViewer />
        </div>
      </main>
    </div>
  )
}
