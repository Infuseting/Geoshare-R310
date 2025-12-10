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
        const respRows = await query(`
      SELECT Region_idRegion, Commune_idVille, EPCI_idEPCI 
      FROM responsable 
      WHERE idUser = ?
    `, [userId])

        const allowedCommunes = new Set<number>()
        const allowedRegions = new Set<number>()
        const allowedEpcis = new Set<number>()

        respRows.forEach((r: any) => {
            if (r.Commune_idVille) allowedCommunes.add(r.Commune_idVille)
            if (r.Region_idRegion) allowedRegions.add(r.Region_idRegion)
            if (r.EPCI_idEPCI) allowedEpcis.add(r.EPCI_idEPCI)
        })

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
