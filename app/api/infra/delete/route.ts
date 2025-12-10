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
                { error: "Not authorized to delete infrastructures" },
                { status: 403 }
            );
        }

        // Body
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Infrastructure ID is required" },
                { status: 400 }
            );
        }

        // Delete related records in cascade
        // 1. Delete equipment associations
        await query(
            `DELETE FROM has_Equipements WHERE idInfrastrcture = ?`,
            [id]
        );
        console.log(`🗑️ Équipements supprimés pour infrastructure ${id}`);

        // 2. Delete piece associations
        await query(
            `DELETE FROM has_Piece WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Pièces supprimées pour infrastructure ${id}`);

        // 3. Delete accessibility associations
        await query(
            `DELETE FROM is_accessible WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Accessibilités supprimées pour infrastructure ${id}`);

        // 4. Delete responsable associations
        await query(
            `DELETE FROM responsable WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Responsables supprimés pour infrastructure ${id}`);

        // 5. Delete Jauge records
        await query(
            `DELETE FROM Jauge WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Jauges supprimées pour infrastructure ${id}`);

        // 6. Delete Informations records
        await query(
            `DELETE FROM Informations WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Informations supprimées pour infrastructure ${id}`);

        // 7. Delete Infra_Ouverture and related records
        // First get the ouverture IDs
        const ouvertureRows = await query(
            `SELECT id FROM Infra_Ouverture WHERE idInfrastructure = ?`,
            [id]
        );

        for (const row of ouvertureRows as any[]) {
            const ouvertureId = row.id;

            // Delete Ouverture_Jour
            await query(
                `DELETE FROM Ouverture_Jour WHERE id_ouverture = ?`,
                [ouvertureId]
            );

            // Delete Ouverture_Exception
            await query(
                `DELETE FROM Ouverture_Exception WHERE id_ouverture = ?`,
                [ouvertureId]
            );
        }

        // Delete Infra_Ouverture
        await query(
            `DELETE FROM Infra_Ouverture WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`🗑️ Ouvertures supprimées pour infrastructure ${id}`);

        // 8. Delete the infrastructure itself
        await query(
            `DELETE FROM Infrastructure WHERE idInfrastructure = ?`,
            [id]
        );
        console.log(`✅ Infrastructure supprimée avec ID : ${id}`);

        return NextResponse.json({ success: true, id }, { status: 200 });
    } catch (e) {
        console.error("Error deleting infrastructure:", e);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
