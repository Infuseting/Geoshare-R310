import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

function parseCookies(cookieHeader: string | null) {
    const out: Record<string, string> = {}
    if (!cookieHeader) return out
    const parts = cookieHeader.split(';')
    for (const part of parts) {
        const idx = part.indexOf('=')
        if (idx === -1) continue
        const k = part.slice(0, idx).trim()
        const v = part.slice(idx + 1).trim()
        out[k] = decodeURIComponent(v)
    }
    return out
}

export async function POST(request: Request) {
    try {
        // Verify authentication
        const cookieHeader = request.headers.get('cookie')
        const cookies = parseCookies(cookieHeader)
        const token = cookies['access_token'] ?? null

        if (!token) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        // Get user from token
        const userRows = await query(
            'SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1',
            [token]
        )

        if (!userRows || userRows.length === 0) {
            return NextResponse.json({ error: 'invalid token' }, { status: 401 })
        }

        const userId = (userRows[0] as any).idUser

        const body = await request.json()
        const { infraId, days } = body

        if (!infraId || !Array.isArray(days)) {
            return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
        }

        // Verify the infrastructure belongs to the user (via responsable table)
        // Check all levels: direct infrastructure, commune, EPCI, region
        const infraRows = await query(
            `SELECT i.idInfrastructure 
             FROM Infrastructure i
             LEFT JOIN Commune c ON i.idVille = c.idVille
             LEFT JOIN Commune_has_EPCI che ON c.idVille = che.Commune_idVille
             LEFT JOIN EPCI_has_Region ehr ON che.EPCI_idEPCI = ehr.EPCI_idEPCI
             WHERE i.idInfrastructure = ?
             AND EXISTS (
               SELECT 1 FROM responsable r
               WHERE r.idUser = ?
               AND (
                 r.idInfrastructure = i.idInfrastructure
                 OR r.Commune_idVille = c.idVille
                 OR r.EPCI_idEPCI = che.EPCI_idEPCI
                 OR r.Region_idRegion = ehr.Region_idRegion
               )
             )
             LIMIT 1`,
            [infraId, userId]
        )
        if (!infraRows || infraRows.length === 0) {
            return NextResponse.json({ error: 'not found or unauthorized' }, { status: 404 })
        }

        // Get or create Infra_Ouverture entry
        let ouvertureRows = await query(
            `SELECT id FROM Infra_Ouverture WHERE idInfrastructure = ?`,
            [infraId]
        )

        let id_ouverture: number
        if (!ouvertureRows || ouvertureRows.length === 0) {
            // Create new Infra_Ouverture entry
            const result = await query(
                `INSERT INTO Infra_Ouverture (idInfrastructure) VALUES (?)`,
                [infraId]
            )
            id_ouverture = (result as any).insertId
        } else {
            id_ouverture = (ouvertureRows[0] as any).id
        }

        // Delete existing weekly days
        await query(`DELETE FROM Ouverture_Jour WHERE id_ouverture = ?`, [id_ouverture])

        // Insert new weekly days
        const validDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        for (const day of days) {
            if (validDays.includes(day)) {
                await query(
                    `INSERT INTO Ouverture_Jour (id_ouverture, jour) VALUES (?, ?)`,
                    [id_ouverture, day]
                )
            }
        }

        return NextResponse.json({ success: true, id_ouverture })
    } catch (e) {
        console.error('weekly update error', e)
        return NextResponse.json({ error: 'internal' }, { status: 500 })
    }
}
