import { NextResponse } from 'next/server'
import { query } from '../../../lib/db'

export async function GET() {
  try {
    // distinct piece names
    const pieceRows = await query('SELECT DISTINCT Name FROM Piece ORDER BY Name')
    const pieces = (pieceRows || []).map((r: any) => r.Name).filter(Boolean)

    // distinct equipment types
    const equipRows = await query('SELECT DISTINCT typeEquipements as type FROM Equipements ORDER BY type')
    const equipements = (equipRows || []).map((r: any) => r.type).filter(Boolean)

    // distinct accessibilite names
    const accessRows = await query('SELECT DISTINCT name FROM Accessibilite ORDER BY name')
    const accessibilites = (accessRows || []).map((r: any) => r.name).filter(Boolean)

    return NextResponse.json({ pieces, equipements, accessibilites })
  } catch (err) {
    console.error('filters api error', err)
    return NextResponse.json({ pieces: [], equipements: [], accessibilites: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET()
}
