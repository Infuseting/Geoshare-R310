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

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie")
        const cookies = parseCookies(cookieHeader)
        const token = cookies["access_token"]

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userRows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token])
        if (!userRows.length) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userId = userRows[0].idUser

        // Get permissions
        // Get permissions
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

        // Cascade logic to find all child areas
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

        if (allowedCommunes.size === 0 && allowedRegions.size === 0 && allowedEpcis.size === 0) {
            return NextResponse.json([])
        }

        const cIds = Array.from(allowedCommunes)
        const rIds = Array.from(allowedRegions)
        const eIds = Array.from(allowedEpcis)

        let conditions = []
        if (cIds.length) conditions.push(`ac.commune_id IN (${cIds.join(',')})`)
        if (rIds.length) conditions.push(`ar.region_id IN (${rIds.join(',')})`)
        if (eIds.length) conditions.push(`ae.epci_id IN (${eIds.join(',')})`)

        if (conditions.length === 0) return NextResponse.json([]) // Should be caught above but safe check

        const sql = `
        SELECT DISTINCT
            a.id,
            a.title,
            a.message,
            a.risk_level,
            a.start_time,
            a.end_time,
            a.is_active,
            (SELECT GROUP_CONCAT(c.name SEPARATOR ', ') FROM Alert_Communes ac2 JOIN Commune c ON ac2.commune_id = c.idVille WHERE ac2.alert_id = a.id) as communes_names,
            (SELECT GROUP_CONCAT(r.name SEPARATOR ', ') FROM Alert_Regions ar2 JOIN Region r ON ar2.region_id = r.idRegion WHERE ar2.alert_id = a.id) as regions_names,
            (SELECT GROUP_CONCAT(e.name SEPARATOR ', ') FROM Alert_EPCIs ae2 JOIN EPCI e ON ae2.epci_id = e.idEPCI WHERE ae2.alert_id = a.id) as epcis_names
        FROM Active_Alerts a
        LEFT JOIN Alert_Communes ac ON a.id = ac.alert_id
        LEFT JOIN Alert_Regions ar ON a.id = ar.alert_id
        LEFT JOIN Alert_EPCIs ae ON a.id = ae.alert_id
        WHERE ${conditions.join(' OR ')}
        ORDER BY a.start_time DESC
    `

        const rows = await query(sql)
        return NextResponse.json(rows)

    } catch (e: any) {
        console.error('Fetch alerts error', e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
