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
        // 1. Authenticate
        const cookieHeader = request.headers.get("cookie")
        const cookies = parseCookies(cookieHeader)
        const token = cookies["access_token"]

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userRows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token])
        if (!userRows.length) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userId = userRows[0].idUser

        // 2. Parse body
        const body = await request.json()
        let { title, message, risk_level, start_time, end_time, communes = [], regions = [], epcis = [] } = body

        // Filter out nulls/undefined and ensure numbers (also allow numeric strings)
        communes = communes.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
        regions = regions.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
        epcis = epcis.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)

        if (!title || !risk_level || !start_time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (communes.length === 0 && regions.length === 0 && epcis.length === 0) {
            return NextResponse.json({ error: "Select at least one area" }, { status: 400 })
        }

        // 3. Check Permissions
        // Get all responsibilities for this user
        // 3. Check Permissions
        // First check user type
        const userTypeRows = await query("SELECT type FROM user WHERE idUser = ?", [userId])
        if (userTypeRows.length > 0 && userTypeRows[0].type === 'ENTREPRISE') {
            return NextResponse.json({ error: "Companies cannot create alerts" }, { status: 403 })
        }

        // Get all responsibilities for this user
        const respRows = await query(`
      SELECT Region_idRegion, Commune_idVille, EPCI_idEPCI 
      FROM responsable 
      WHERE idUser = ?
    `, [userId])

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

        // Validate
        const unauthorized =
            communes.some((id: number) => !allowedCommunes.has(id)) ||
            regions.some((id: number) => !allowedRegions.has(id)) ||
            epcis.some((id: number) => !allowedEpcis.has(id))

        if (unauthorized) {
            return NextResponse.json({ error: "You are not responsible for some of the selected areas" }, { status: 403 })
        }

        // 4. Insert Output
        const insertRes = await query(`
      INSERT INTO Active_Alerts (title, message, risk_level, start_time, end_time, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [title, message || '', risk_level, start_time, end_time || null])

        // @ts-ignore
        const alertId = insertRes.insertId

        // 5. Insert Junctions
        if (communes.length > 0) {
            const values = communes.map((id: number) => `(${alertId}, ${id})`).join(',')
            await query(`INSERT INTO Alert_Communes (alert_id, commune_id) VALUES ${values}`)
        }
        if (regions.length > 0) {
            const values = regions.map((id: number) => `(${alertId}, ${id})`).join(',')
            await query(`INSERT INTO Alert_Regions (alert_id, region_id) VALUES ${values}`)
        }
        if (epcis.length > 0) {
            const values = epcis.map((id: number) => `(${alertId}, ${id})`).join(',')
            await query(`INSERT INTO Alert_EPCIs (alert_id, epci_id) VALUES ${values}`)
        }

        return NextResponse.json({ success: true, id: alertId })

    } catch (e: any) {
        console.error('Create alert error', e)
        return NextResponse.json({ error: e.message || "Internal Error" }, { status: 500 })
    }
}
