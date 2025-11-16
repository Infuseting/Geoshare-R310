import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // fetch basic infrastructure and commune info
    const infraRows = await query(
      "SELECT i.idInfrastructure as id, i.name, i.adresse, i.idVille, i.informations, i.latitude, i.longitude, i.en_service, c.name as ville_name, c.codepostal as codepostal FROM Infrastructure i LEFT JOIN Commune c ON i.idVille = c.idVille WHERE i.idInfrastructure = ? LIMIT 1",
      [id]
    );
    if (!infraRows || infraRows.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const infra = infraRows[0] as any;

    // fetch equipments
    const equipRows = await query("SELECT e.idEquipements as id, e.nomEquipements as name, e.typeEquipements as type FROM has_Equipements h JOIN Equipements e ON h.idEquipements = e.idEquipements WHERE h.idInfrastrcture = ?", [id]);

    // fetch accessibilities
    const accessRows = await query("SELECT a.idAccessibilite as id, a.name FROM is_accessible ia JOIN Accessibilite a ON ia.idAccessibilite = a.idAccessibilite WHERE ia.idInfrastructure = ?", [id]);

    // fetch first responsable (user) for this infrastructure, if any
    const respRows = await query(
      `SELECT u.idUser as idUser, u.email as email, u.name as name FROM responsable r JOIN \`user\` u ON r.idUser = u.idUser WHERE r.idInfrastructure = ? ORDER BY r.id LIMIT 1`,
      [id]
    );

    // fetch the most recent active information (appear/expiration) from Informations table
    // only informations where apparition_date <= today and (expiration_date IS NULL OR expiration_date >= today)
    const infoRows = await query(
      `SELECT texte, apparition_date, expiration_date FROM Informations WHERE idInfrastructure = ? AND apparition_date <= CURDATE() AND (expiration_date IS NULL OR expiration_date >= CURDATE()) ORDER BY apparition_date DESC LIMIT 1`,
      [id]
    );

    // determine if current user is responsable for this infra
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies["access_token"] ?? null;

    let isResponsable = false;
    if (token) {
      const trows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token]);
      if (trows && trows.length > 0) {
        const uid = (trows[0] as any).idUser;
        const rrows = await query("SELECT 1 FROM responsable WHERE idUser = ? AND idInfrastructure = ? LIMIT 1", [uid, id]);
        if (rrows && rrows.length > 0) isResponsable = true;
      }
    }

    const enService = Number(infra.en_service) === 1;

    if (!enService && !isResponsable) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Build response
    const out = {
      id: infra.id,
      name: infra.name,
      adresse: infra.adresse,
      idVille: infra.idVille,
      ville_name: infra.ville_name ?? null,
      codepostal: infra.codepostal ?? null,
  // prefer the most recent active Informations entry if present, otherwise fallback to the legacy infra.informations
  informations: (infoRows && infoRows.length > 0) ? infoRows[0].texte : infra.informations,
      lat: infra.latitude ? parseFloat(infra.latitude) : null,
      lon: infra.longitude ? parseFloat(infra.longitude) : null,
      en_service: enService ? 1 : 0,
      equipments: equipRows.map((r: any) => ({ id: r.id, name: r.name, type: r.type })),
      accessibilites: accessRows.map((r: any) => ({ id: r.id, name: r.name })),
      isResponsable,
      responsable: respRows && respRows.length > 0 ? { idUser: respRows[0].idUser, email: respRows[0].email, name: respRows[0].name } : null,
    };

    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    console.error("infra id api error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
