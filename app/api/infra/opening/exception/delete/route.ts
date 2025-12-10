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

export async function DELETE(request: Request) {
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

        const url = new URL(request.url)
        const exceptionId = url.searchParams.get('id')

        if (!exceptionId) {
            return NextResponse.json({ error: 'missing id' }, { status: 400 })
        }

        // Verify the exception belongs to an infrastructure owned by the user
        // Check all levels: direct infrastructure, commune, EPCI, region
        const rows = await query(
            `SELECT oe.id 
             FROM Ouverture_Exception oe
             JOIN Infra_Ouverture io ON io.id = oe.id_ouverture
             JOIN Infrastructure i ON i.idInfrastructure = io.idInfrastructure
             LEFT JOIN Commune c ON i.idVille = c.idVille
             LEFT JOIN Commune_has_EPCI che ON c.idVille = che.Commune_idVille
             LEFT JOIN EPCI_has_Region ehr ON che.EPCI_idEPCI = ehr.EPCI_idEPCI
             WHERE oe.id = ?
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
            [exceptionId, userId]
        )

        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'not found or unauthorized' }, { status: 404 })
        }

        // Delete the exception
        await query(`DELETE FROM Ouverture_Exception WHERE id = ?`, [exceptionId])

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('exception delete error', e)
        return NextResponse.json({ error: 'internal' }, { status: 500 })
    }
}
