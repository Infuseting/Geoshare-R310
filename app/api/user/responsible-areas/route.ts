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

const RESP_QUERY = `
  SELECT 
    r.Region_idRegion, 
    r.Commune_idVille, 
    r.EPCI_idEPCI,
    u.type as userType
  FROM responsable r
  JOIN user u ON r.idUser = u.idUser
  WHERE r.idUser = ?
`

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie")
        const cookies = parseCookies(cookieHeader)
        const token = cookies["access_token"]

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userRows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token])
        if (!userRows.length) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const userId = userRows[0].idUser

        // 1. Get Direct Responsibilities & User Type
        const respRows = await query(RESP_QUERY, [userId])

        let userType = 'PARTICULIER'
        if (respRows.length > 0 && respRows[0].userType) {
            userType = respRows[0].userType
        } else {
            // Fallback if no responsable entry but user exists (e.g. simple user)
            const u = await query("SELECT type FROM user WHERE idUser = ?", [userId])
            if (u.length) userType = u[0].type
        }

        const directRegionIds = new Set<number>()
        const directEpciIds = new Set<number>()
        const directCommuneIds = new Set<number>()

        respRows.forEach((r: any) => {
            if (r.Region_idRegion) directRegionIds.add(r.Region_idRegion)
            if (r.EPCI_idEPCI) directEpciIds.add(r.EPCI_idEPCI)
            if (r.Commune_idVille) directCommuneIds.add(r.Commune_idVille)
        })

        let allRegionIds = Array.from(directRegionIds)
        let allEpciIds = Array.from(directEpciIds)
        let allCommuneIds = Array.from(directCommuneIds)

        // 2. Cascade: Region -> EPCIs
        if (allRegionIds.length > 0) {
            const placeholders = allRegionIds.map(() => '?').join(',')
            const regionEpciRows = await query(`
                SELECT EPCI_idEPCI 
                FROM EPCI_has_Region 
                WHERE Region_idRegion IN (${placeholders})
            `, allRegionIds)

            regionEpciRows.forEach((row: any) => {
                if (!directEpciIds.has(row.EPCI_idEPCI)) {
                    allEpciIds.push(row.EPCI_idEPCI)
                }
            })

            // ALSO Cascade: Region -> Communes (via Region_has_Commune relationship, if exists, or implied via departments/EPCI)
            // The previous code only did Region -> EPCI. It missed direct Region -> Commune link or Region -> Department -> Commune.
            // Assuming simplified model where Commune belongs to EPCI, and EPCI belongs to Region, we are covering it by expanding EPCI first.
            // BUT check if there are Communes directly linked to Regions or implied.
            // Let's stick to EPCI expansion first, then EPCI -> Commune.
        }

        // 3. Cascade: EPCIs -> Communes (including those gained from Regions)
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

        // Final IDs
        const finalCommuneIds = Array.from(new Set(allCommuneIds))
        const finalEpciIds = Array.from(new Set(allEpciIds))
        const finalRegionIds = Array.from(new Set(allRegionIds))

        // Fetch Details
        let communes: any[] = []
        let epcis: any[] = []
        let regions: any[] = []

        if (finalCommuneIds.length > 0) {
            const p = finalCommuneIds.map(() => '?').join(',')
            communes = await query(`SELECT idVille as id, name, codepostal FROM Commune WHERE idVille IN (${p}) ORDER BY name`, finalCommuneIds)
        }

        if (finalEpciIds.length > 0) {
            const p = finalEpciIds.map(() => '?').join(',')
            epcis = await query(`SELECT idEPCI as id, name FROM EPCI WHERE idEPCI IN (${p}) ORDER BY name`, finalEpciIds)
        }

        if (finalRegionIds.length > 0) {
            const p = finalRegionIds.map(() => '?').join(',')
            regions = await query(`SELECT idRegion as id, name FROM Region WHERE idRegion IN (${p}) ORDER BY name`, finalRegionIds)
        }

        return NextResponse.json({
            userType,
            communes,
            epcis,
            regions
        })

    } catch (e: any) {
        console.error('Responsible areas error', e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
