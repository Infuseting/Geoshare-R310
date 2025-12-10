import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

        // Get the FIRST Infra_Ouverture id for this infrastructure
        const ouvertureRows = await query(
            `SELECT id FROM Infra_Ouverture WHERE idInfrastructure = ? LIMIT 1`,
            [id]
        )

        if (!ouvertureRows || ouvertureRows.length === 0) {
            // No opening schedule exists yet, return empty data
            return NextResponse.json({
                id_ouverture: null,
                weekly: [],
                exceptions: []
            })
        }

        const id_ouverture = (ouvertureRows[0] as any).id

        // Fetch weekly opening days for THIS id_ouverture only
        const weeklyRows = await query(
            `SELECT jour FROM Ouverture_Jour WHERE id_ouverture = ?`,
            [id_ouverture]
        )
        console.log('DB weeklyRows for id_ouverture', id_ouverture, ':', weeklyRows)
        const weekly = (weeklyRows || []).map((r: any) => r.jour)
        console.log('Mapped weekly days:', weekly)

        // Fetch exceptions for THIS id_ouverture only
        const excRows = await query(
            `SELECT id, date_debut, date_fin, type FROM Ouverture_Exception WHERE id_ouverture = ?`,
            [id_ouverture]
        )
        const exceptions = (excRows || []).map((r: any) => ({
            id: r.id,
            date_debut: r.date_debut,
            date_fin: r.date_fin,
            type: r.type
        }))

        return NextResponse.json({ id_ouverture, weekly, exceptions })
    } catch (e) {
        console.error('opening api error', e)
        return NextResponse.json({ error: 'internal' }, { status: 500 })
    }
}
