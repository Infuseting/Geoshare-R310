import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function POST(request: Request) {
  try {
    // Auth
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies["access_token"] ?? null;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRows = await query(
      "SELECT u.idUser, u.type FROM access_token a JOIN `user` u ON a.idUser = u.idUser WHERE a.access_token = ? LIMIT 1",
      [token]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = userRows[0] as any;
    const userType = user.type;

    if (!["ENTREPRISE", "COLLECTIVITE", "ASSOCIATION"].includes(userType)) {
      return NextResponse.json(
        { error: "Not authorized to create infrastructures" },
        { status: 403 }
      );
    }

    // Body
    const body = await request.json();
    const {
      id,
      name,
      address,
      latitude,
      longitude,
      description,
      status,
      city,
      type,
      accessibility,
      piece,
    } = body;

    const infraId = id;

    if (!name || !address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    const statusValue = status === "Ouvert" ? 1 : status === "Fermé" ? 2 : 3;

    // TODO: lookup city properly
    const idVille = city ? 1 : null;

    // Update infrastructure
    await query(
      `UPDATE Infrastructure 
       SET name = ?, adresse = ?, informations = ?, latitude = ?, longitude = ?, en_service = ? 
       WHERE idInfrastructure = ?`,
      [
        name,
        address,

        description || null,
        latitude?.toString() || "0",
        longitude?.toString() || "0",
        statusValue,
        infraId,
      ]
    );

    console.log(`✅ Infrastructure modifiée avec ID : ${infraId}`);

    const currentEquipRows = await query(
      `SELECT idEquipements 
   FROM has_Equipements 
   WHERE idInfrastrcture = ?`,
      [infraId]
    );

    const currentEquipIds = currentEquipRows.map((r: any) => r.idEquipements);

    const currentPieceRows = await query(
      `SELECT idPiece
    FROM has_Piece
    WHERE idInfrastructure = ?`,
      [infraId]
    );

    const currentAccessRows = await query(
      `SELECT idAccessibilite
        FROM is_accessible
        WHERE idInfrastructure = ?`,
      [infraId]
    );

    const currentAccessIds = currentAccessRows.map(
      (r: any) => r.idAccessibilite
    );

    const accessNames =
      typeof body.accessibility === "string"
        ? body.accessibility
            .split(",")
            .map((a: string) => a.trim())
            .filter(Boolean)
        : [];

    const newAccessIds: number[] = [];
    for (const name of accessNames) {
      const row = await query(
        `SELECT idAccessibilite FROM Accessibilite WHERE name = ? LIMIT 1`,
        [name]
      );
      if (row[0]) newAccessIds.push(row[0].idAccessibilite);
    }
    const accessToDelete = currentAccessIds.filter(
      (id) => !newAccessIds.includes(id)
    );
    const accessToInsert = newAccessIds.filter(
      (id) => !currentAccessIds.includes(id)
    );
    for (const id of accessToDelete) {
      await query(
        `DELETE FROM is_accessible WHERE idInfrastructure = ? AND idAccessibilite = ?`,
        [infraId, id]
      );
      console.log(`🗑️ Accessibilité supprimée: ${id}`);
    }
    for (const id of accessToInsert) {
      await query(
        `INSERT INTO is_accessible (idInfrastructure, idAccessibilite) VALUES (?, ?)`,
        [infraId, id]
      );
      console.log(`➕ Accessibilité ajoutée: ${id}`);
    }
    const currentPieceIds = currentPieceRows.map((r: any) => r.idPiece);

    const pieceNames =
      typeof body.piece === "string"
        ? body.piece
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean)
        : [];

    const newPieceIds: number[] = [];
    for (const name of pieceNames) {
      const row = await query(
        `SELECT idPiece FROM Piece WHERE name = ? LIMIT 1`,
        [name]
      );
      if (row[0]) newPieceIds.push(row[0].idPiece);
    }
    const pieceToDelete = currentPieceIds.filter(
      (id) => !newPieceIds.includes(id)
    );
    const pieceToInsert = newPieceIds.filter(
      (id) => !currentPieceIds.includes(id)
    );
    for (const id of pieceToDelete) {
      await query(
        `DELETE FROM has_Piece WHERE idInfrastructure = ? AND idPiece = ?`,
        [infraId, id]
      );
      console.log(`🗑️ Pièce supprimée: ${id}`);
    }

    for (const id of pieceToInsert) {
      await query(
        `INSERT INTO has_Piece (idInfrastructure, idPiece) VALUES (?, ?)`,
        [infraId, id]
      );

      console.log(`➕ Pièce ajoutée: ${id}`);
    }

    const equipementNames =
      typeof body.type === "string"
        ? body.type
            .split(",")
            .map((e: string) => e.trim())
            .filter(Boolean)
        : [];

    const newEquipIds: number[] = [];
    for (const name of equipementNames) {
      const row = await query(
        `SELECT idEquipements FROM Equipements WHERE typeEquipements = ? LIMIT 1`,
        [name]
      );
      if (row[0]) newEquipIds.push(row[0].idEquipements);
    }
    const toDelete = currentEquipIds.filter((id) => !newEquipIds.includes(id));
    const toInsert = newEquipIds.filter((id) => !currentEquipIds.includes(id));
    for (const id of toDelete) {
      await query(
        `DELETE FROM has_Equipements WHERE idInfrastrcture = ? AND idEquipements = ?`,
        [infraId, id]
      );
      console.log(`🗑️ Équipement supprimé: ${id}`);
    }

    for (const id of toInsert) {
      await query(
        `INSERT INTO has_Equipements (idInfrastrcture, idEquipements) VALUES (?, ?)`,
        [infraId, id]
      );
      console.log(`➕ Équipement ajouté: ${id}`);
    }

    // Return updated infra
    const updated = {
      id: infraId,
      name,
      type,
      accessibility,
      piece,
      address,
      status,
      latitude,
      longitude,
      description,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    console.error("Error updating infrastructure:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
