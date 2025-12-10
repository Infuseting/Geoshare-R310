import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { lat, lon } = body

        if (!lat || !lon) {
            return NextResponse.json({ alerts: [] })
        }

        // 1. Reverse Geocoding via Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=fr`
        const geoRes = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'Geoshare-App/1.0'
            }
        })

        if (!geoRes.ok) {
            console.warn('Nominatim reverse geocoding failed', geoRes.status)
            return NextResponse.json({ alerts: [] })
        }

        const geoData = await geoRes.json()
        const address = geoData.address || {}
        const postcode = address.postcode
        // City can be under various keys
        const city = address.city || address.town || address.village || address.municipality

        if (!postcode) {
            return NextResponse.json({ alerts: [] })
        }

        // 2. Find Commune in DB
        // We prioritize postcode matching, then filter by name if multiple results
        let communeRows = await query('SELECT idVille, name FROM Commune WHERE codepostal = ?', [postcode])

        let communeId: number | null = null

        if (communeRows.length === 0) {
            // fallback: try to find by name only? might be risky.
            // let's stop here for now to be safe.
            return NextResponse.json({ alerts: [] })
        } else if (communeRows.length === 1) {
            communeId = communeRows[0].idVille
        } else {
            // multiple communes with same postcode, try to match name
            if (city) {
                const found = communeRows.find((c: any) => c.name.toLowerCase() === city.toLowerCase())
                if (found) {
                    communeId = found.idVille
                } else {
                    // fuzzy match or just take the first one?
                    // Safer to take none if unsure, but for alerts better to be safe than sorry?
                    // Let's take the first one for now as a fallback
                    communeId = communeRows[0].idVille
                }
            } else {
                communeId = communeRows[0].idVille
            }
        }

        if (!communeId) return NextResponse.json({ alerts: [] })

        // 3. Find associated EPCI and Region
        // Commune -> EPCI -> Region
        const hierarchyRows = await query(`
      SELECT 
        c.idVille,
        che.EPCI_idEPCI,
        ehr.Region_idRegion
      FROM Commune c
      LEFT JOIN Commune_has_EPCI che ON c.idVille = che.Commune_idVille
      LEFT JOIN EPCI_has_Region ehr ON che.EPCI_idEPCI = ehr.EPCI_idEPCI
      WHERE c.idVille = ?
    `, [communeId])

        const hierarchy = hierarchyRows[0] || {}
        let epciId = hierarchy.EPCI_idEPCI
        let regionId = hierarchy.Region_idRegion

        // Fallback: If Region not found via EPCI link, try matching by Name from Nominatim
        if (!regionId && address.state) {
            const regionName = address.state
            // Use partial matching or strict? DB names might be "Région Normandie" or just "Normandie"
            const regionRows = await query('SELECT idRegion FROM Region WHERE name LIKE ? LIMIT 1', [`%${regionName}%`])
            if (regionRows.length > 0) {
                regionId = regionRows[0].idRegion
            }
        }

        // 4. Query Active Alerts
        // We need alerts that are active NOW and linked to this Commune, EPCI, or Region
        const now = new Date()

        let sql = `
      SELECT DISTINCT 
        a.id, 
        a.title, 
        a.message, 
        a.risk_level,
        a.start_time,
        CASE 
            WHEN ac.commune_id IS NOT NULL THEN 'Commune'
            WHEN ae.epci_id IS NOT NULL THEN 'EPCI'
            WHEN ar.region_id IS NOT NULL THEN 'Region'
        END as source_type
      FROM Active_Alerts a
      LEFT JOIN Alert_Communes ac ON a.id = ac.alert_id AND ac.commune_id = ?
      LEFT JOIN Alert_EPCIs ae ON a.id = ae.alert_id AND ae.epci_id = ?
      LEFT JOIN Alert_Regions ar ON a.id = ar.alert_id AND ar.region_id = ?
      WHERE a.is_active = 1
      AND a.start_time <= NOW()
      AND (a.end_time IS NULL OR a.end_time >= NOW())
      AND (ac.commune_id IS NOT NULL OR ae.epci_id IS NOT NULL OR ar.region_id IS NOT NULL)
      ORDER BY a.risk_level DESC, a.start_time DESC
    `

        const params = [communeId, epciId || -1, regionId || -1]
        const alertRows = await query(sql, params)

        const alerts = alertRows.map((row: any) => ({
            id: row.id,
            title: row.title,
            message: row.message,
            risk_level: row.risk_level,
            source_type: row.source_type
        }))

        return NextResponse.json({ alerts })

    } catch (e: any) {
        console.error('Alert check error:', e)
        return NextResponse.json({ alerts: [] }) // fail gracefully
    }
}
