import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Infrastructure } from "@/app/dashboard/page";

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
    // Get user from access token
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies["access_token"] ?? null;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user info
    const userRows = await query(
      "SELECT u.idUser, u.type FROM access_token a JOIN `user` u ON a.idUser = u.idUser WHERE a.access_token = ? LIMIT 1",
      [token]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = userRows[0] as any;
    const userId = user.idUser;
    const userType = user.type;

    // Only ENTREPRISE, COLLECTIVITE, and ASSOCIATION can create infrastructures
    if (!["ENTREPRISE", "COLLECTIVITE", "ASSOCIATION"].includes(userType)) {
      return NextResponse.json(
        { error: "Not authorized to create infrastructures" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log("📦 Body reçu :", body);
    const {
      name,
      address,
      latitude,
      longitude,
      description,
      city,
      type,
      accessibility,
      piece,
    } = body;

    const status = "Ouvert"; // Default status

    if (!name || !address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    const lastIdRow = await query(
      `SELECT idInfrastructure FROM Infrastructure ORDER BY idInfrastructure DESC LIMIT 1`
    );

    const statusValue = status === "Ouvert" ? 1 : status === "Fermé" ? 2 : 3;

    let villeRow = await query(
      `SELECT idVille FROM Commune WHERE name = ? LIMIT 1`,
      [body.city || ""]
    );

    let idVille = villeRow[0]?.idVille;

    if (!idVille) {
      console.warn(`🏙️ Ville "${body.city}" absente, insertion en cours...`);
      await query(`INSERT INTO Commune (name,codepostal) VALUES (?,?)`, [
        body.city,
        body.postalCode || "00000",
      ]);
      villeRow = await query(
        `SELECT idVille FROM Commune WHERE name = ? LIMIT 1`,
        [body.city]
      );
      idVille = villeRow[0]?.idVille;

      if (!idVille) {
        return NextResponse.json(
          { error: `Impossible d'insérer la ville "${body.city}"` },
          { status: 500 }
        );
      }

      console.log(`✅ Ville "${body.city}" insérée avec idVille = ${idVille}`);
    }

    const lastId = lastIdRow[0]?.idInfrastructure ?? "I000000000";

    function generateNextId(lastId: string): string {
      const numericPart = parseInt(lastId.slice(1)); // retire le "I"
      const nextNumeric = numericPart + 1;
      return "I" + nextNumeric.toString().padStart(9, "0");
    }

    const infraId = generateNextId(lastId);
    console.log(`🆔 Nouveau ID généré pour l'infrastructure : ${infraId}`);

    // TODO: Get idVille from address or default to a value
    // For now, we'll use a default value or you need to implement geocoding
    // You should implement proper city lookup

    // Generate unique ID for infrastructure

    // Insert infrastructure

    console.log("🧪 Données à insérer :", {
      infraId,
      name,
      address,
      idVille,
      description,
      latitude,
      longitude,
      statusValue,
    });
    await query(
      `INSERT INTO Infrastructure (idInfrastructure, name, adresse, idVille, informations, latitude, longitude, en_service)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        infraId,
        name,
        address,
        idVille,
        description || null,
        latitude?.toString() || "0",
        longitude?.toString() || "0",
        statusValue,
      ]
    );

    console.log(`✅ Infrastructure créée avec ID : ${infraId}`);

    // Link infrastructure to user in responsable table
    await query(
      `INSERT INTO responsable (idUser, idInfrastructure) VALUES (?, ?)`,
      [userId, infraId]
    );

    const pieceNames =
      typeof body.piece === "string"
        ? body.piece
            .split(",")
            .map((p: String) => p.trim())
            .filter((p: String) => p)
        : [];

    const equipementNames =
      typeof body.type === "string"
        ? body.type
            .split(",")
            .map((e: String) => e.trim())
            .filter((e: String) => e)
        : [];

    const accessNames =
      typeof body.accessibility === "string"
        ? body.accessibility
            .split(",")
            .map((a: String) => a.trim())
            .filter((a: String) => a)
        : [];

    for (const pieceName of pieceNames) {
      const pieceRow = await query(
        `SELECT idPiece FROM Piece WHERE name = ? LIMIT 1`,
        [pieceName]
      );

      const idPiece = pieceRow[0]?.idPiece;

      if (idPiece) {
        await query(
          `INSERT INTO has_Piece (idInfrastructure, idPiece) VALUES (?, ?)`,
          [infraId, idPiece]
        );
        console.log(`✅ Pièce liée : "${pieceName}"`);
      } else {
        console.warn(`⚠️ Pièce non trouvée : "${pieceName}"`);
      }
    }
    for (const equipementName of equipementNames) {
      const equipementRow = await query(
        `SELECT idEquipements FROM Equipements WHERE typeEquipements = ? LIMIT 1`,
        [equipementName]
      );
      const idEquipement = equipementRow[0]?.idEquipements;
      if (idEquipement) {
        await query(
          `INSERT INTO has_Equipements (idInfrastrcture, idEquipements) VALUES (?, ?)`,
          [infraId, idEquipement]
        );
        console.log(`✅ Équipement lié : "${equipementName}"`);
      }
    }
    for (const accessName of accessNames) {
      const accessRow = await query(
        `SELECT idAccessibilite FROM Accessibilite WHERE name = ? LIMIT 1`,
        [accessName]
      );
      const idAccessibilite = accessRow[0]?.idAccessibilite;
      if (idAccessibilite) {
        await query(
          `INSERT INTO is_accessible (idInfrastructure, idAccessibilite) VALUES (?, ?)`,
          [infraId, idAccessibilite]
        );
        console.log(`✅ Accessibilité liée : "${accessName}"`);
      }
    }

    // Return created infrastructure
    const created = {
      id: infraId,
      name,
      type: body.type,
      accessibility: body.accessibility,
      piece: body.piece,
      address,
      status: status,
      createdAt: new Date().toISOString(),
      latitude,
      longitude,
      description,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("Error creating infrastructure:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
