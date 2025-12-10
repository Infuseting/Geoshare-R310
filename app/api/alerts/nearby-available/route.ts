import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { lat, lon, minAvailabilityPercent = 10 } = body

        if (!lat || !lon) {
            return NextResponse.json([])
        }

        const minRatio = Math.max(0, Math.min(100, Number(minAvailabilityPercent))) / 100.0

        // SQL to find nearby infra sort by distance
        // Filter by availability >= minRatio
        // availability = (max_jauge - jauge) / max_jauge
        // so (max_jauge - jauge) >= minRatio * max_jauge
        // Jauge table has: idInfrastructure, max_jauge, jauge

        const sql = `
      SELECT 
        i.idInfrastructure as id,
        i.name,
        i.adresse,
        i.latitude,
        i.longitude,
        j.jauge,
        j.max_jauge,
        (6371 * acos( cos(radians(?)) * cos(radians(CAST(i.latitude AS DECIMAL(10,6)))) * cos(radians(CAST(i.longitude AS DECIMAL(10,6))) - radians(?)) + sin(radians(?)) * sin(radians(CAST(i.latitude AS DECIMAL(10,6))))) ) as distance
      FROM Infrastructure i
      JOIN Jauge j ON i.idInfrastructure = j.idInfrastructure
      WHERE i.latitude IS NOT NULL 
        AND i.longitude IS NOT NULL
        AND j.max_jauge > 0
        AND ((j.max_jauge - j.jauge) / j.max_jauge) >= ?
      HAVING distance < 50
      ORDER BY distance ASC
      LIMIT 100
    `

        // We restrict search to 50km radius for performance/relevance, can be adjusted
        const rows = await query(sql, [lat, lon, lat, minRatio])

        const items = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            adresse: r.adresse,
            lat: parseFloat(r.latitude),
            lon: parseFloat(r.longitude),
            distance: Number(r.distance),
            jauge: r.jauge,
            max_jauge: r.max_jauge,
            availabilityPercent: Math.round(((r.max_jauge - r.jauge) / r.max_jauge) * 100)
        }))

        return NextResponse.json(items)

    } catch (e: any) {
        console.error('Nearby available API error:', e)
        return NextResponse.json([], { status: 500 })
    }
}
