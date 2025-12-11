import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

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
        const cookieHeader = request.headers.get("cookie")
        const cookies = parseCookies(cookieHeader)
        const token = cookies["access_token"]

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userRows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token])
        if (!userRows.length) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userId = userRows[0].idUser
        const body = await request.json()
        const { id } = body

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        // Check permission: User must be responsible for at least one area covered by the alert?
        // Or did they create it? We don't track creator.
        // So we check if they have rights on ANY of the areas linked to the alert.
        // Similar to "my alerts" logic.

        const respRows = await query(`
      SELECT Region_idRegion, Commune_idVille, EPCI_idEPCI 
      FROM responsable 
      WHERE idUser = ?
    `, [userId])

        // Create sets of all areas the user can manage (including children)
        const directRegionIds = new Set<number>()
        const directEpciIds = new Set<number>()
        const directCommuneIds = new Set<number>()

        respRows.forEach((r: any) => {
            if (r.Region_idRegion) directRegionIds.add(r.Region_idRegion)
            if (r.EPCI_idEPCI) directEpciIds.add(r.EPCI_idEPCI)
            if (r.Commune_idVille) directCommuneIds.add(r.Commune_idVille)
        })

        // Cascade logic
        let allRegionIds = Array.from(directRegionIds)
        let allEpciIds = Array.from(directEpciIds)
        let allCommuneIds = Array.from(directCommuneIds)

        // 1. Expand EPCIs from Regions
        if (allRegionIds.length > 0) {
            const placeholders = allRegionIds.map(() => '?').join(',')
            const regionEpciRows = await query(`
                SELECT EPCI_idEPCI 
                FROM EPCI_has_Region 
                WHERE Region_idRegion IN (${placeholders})
            `, allRegionIds)
            regionEpciRows.forEach((row: any) => {
                if (!directEpciIds.has(row.EPCI_idEPCI)) allEpciIds.push(row.EPCI_idEPCI)
            })
        }

        // 2. Expand Communes from (original + expanded) EPCIs
        const uniqueEpciIds = Array.from(new Set(allEpciIds))
        if (uniqueEpciIds.length > 0) {
            const placeholders = uniqueEpciIds.map(() => '?').join(',')
            const epciCommuneRows = await query(`
                SELECT Commune_idVille 
                FROM Commune_has_EPCI 
                WHERE EPCI_idEPCI IN (${placeholders})
            `, uniqueEpciIds)
            epciCommuneRows.forEach((row: any) => {
                allCommuneIds.push(row.Commune_idVille)
            })
        }

        const allowedCommunes = new Set(allCommuneIds)
        const allowedRegions = new Set(allRegionIds)
        const allowedEpcis = new Set(allEpciIds)

        // Get alert areas
        // If alert has NO area (orphan), maybe allow delete if admin? But we assume alerts have areas.
        // If alert has areas that user is NOT responsible for, should they be able to delete?
        // If I manage Commune A, and alert is on Commune A and Commune B.
        // If I delete it, it disappears for Commune B too.
        // This is a shared resource.
        // For now, if user has ANY responsibility overlap, allow delete.

        const alertAreas = await query(`
        SELECT 'C' as type, commune_id as id FROM Alert_Communes WHERE alert_id = ?
        UNION
        SELECT 'R' as type, region_id as id FROM Alert_Regions WHERE alert_id = ?
        UNION
        SELECT 'E' as type, epci_id as id FROM Alert_EPCIs WHERE alert_id = ?
    `, [id, id, id])

        if (alertAreas.length === 0) {
            // Orphan alert or doesn't exist. Allow delete if user is somehow authorized (e.g. created it but we don't know).
            // Or deny. Let's deny to be safe, or check if it exists first.
            const check = await query('SELECT 1 FROM Active_Alerts WHERE id = ?', [id])
            if (check.length === 0) return NextResponse.json({ error: "Alert not found" }, { status: 404 })
            // If it exists but no areas, who can delete? Maybe user who has ANY responsibility?
            // Let's assume this case is rare.
            return NextResponse.json({ error: "Alert has no linked areas" }, { status: 403 })
        }

        const hasPermission = alertAreas.some((area: any) => {
            if (area.type === 'C') return allowedCommunes.has(area.id)
            if (area.type === 'R') return allowedRegions.has(area.id)
            if (area.type === 'E') return allowedEpcis.has(area.id)
            return false
        })

        if (!hasPermission) {
            return NextResponse.json({ error: "You do not have permission to delete this alert" }, { status: 403 })
        }

        await query('DELETE FROM Active_Alerts WHERE id = ?', [id])

        return NextResponse.json({ success: true })

    } catch (e: any) {
        console.error('Delete alert error', e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
