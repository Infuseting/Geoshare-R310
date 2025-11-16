import { NextResponse } from 'next/server'
import { query } from '../../../lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  // accept a 'limit' parameter from client, clamp to 1..100
  const rawLimit = parseInt(searchParams.get('limit') || '12', 10)
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 12

  if (!q) return NextResponse.json([], { status: 200 })

  try {
    // search name or adresse (case-insensitive)
  const like = `%${q}%`
  // LIMIT cannot be parameterized in some DB drivers, ensure 'limit' is an integer we control
  const rows = await query(`SELECT idInfrastructure as id, name, adresse, latitude, longitude FROM Infrastructure WHERE name LIKE ? OR adresse LIKE ? LIMIT ${limit}`, [like, like])

    // normalize coordinates
    const items = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      adresse: r.adresse,
      lat: r.latitude ? parseFloat(r.latitude) : null,
      lon: r.longitude ? parseFloat(r.longitude) : null,
      source: 'infra'
    }))

    return NextResponse.json(items)
  } catch (e) {
    console.error('search api error', e)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const q = (body.q || '').trim()
    const pieces: string[] = Array.isArray(body.pieces) ? body.pieces : []
    const equipments: string[] = Array.isArray(body.equipments) ? body.equipments : []
    const accessibilites: string[] = Array.isArray(body.accessibilites) ? body.accessibilites : []
    const distanceKm = Number.isFinite(Number(body.distanceKm)) ? Number(body.distanceKm) : 0
    const centerLat = typeof body.centerLat === 'number' ? body.centerLat : (body.centerLat ? Number(body.centerLat) : null)
    const centerLon = typeof body.centerLon === 'number' ? body.centerLon : (body.centerLon ? Number(body.centerLon) : null)
    const dateFrom = body.dateFrom ? String(body.dateFrom) : null
    const dateTo = body.dateTo ? String(body.dateTo) : null
    const rawLimit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(100, Number(body.limit))) : 100

    // Build dynamic SQL
    const where: string[] = []
    const params: any[] = []

    if (q) {
      where.push('(Infrastructure.name LIKE ? OR Infrastructure.adresse LIKE ?)')
      const like = `%${q}%`
      params.push(like, like)
    }

    if (pieces.length > 0) {
      // match by piece name via has_Piece + Piece
      where.push(`EXISTS (SELECT 1 FROM has_Piece hp JOIN Piece p ON hp.idPiece = p.idPiece WHERE hp.idInfrastructure = Infrastructure.idInfrastructure AND p.Name IN (${pieces.map(() => '?').join(',')}))`)
      params.push(...pieces)
    }

    if (equipments.length > 0) {
      where.push(`EXISTS (SELECT 1 FROM has_Equipements he JOIN Equipements e ON he.idEquipements = e.idEquipements WHERE he.idInfrastrcture = Infrastructure.idInfrastructure AND e.typeEquipements IN (${equipments.map(() => '?').join(',')}))`)
      params.push(...equipments)
    }

    if (accessibilites.length > 0) {
      where.push(`EXISTS (SELECT 1 FROM is_accessible ia JOIN Accessibilite a ON ia.idAccessibilite = a.idAccessibilite WHERE ia.idInfrastructure = Infrastructure.idInfrastructure AND a.name IN (${accessibilites.map(() => '?').join(',')}))`)
      params.push(...accessibilites)
    }

    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        where.push(`EXISTS (SELECT 1 FROM Informations info WHERE info.idInfrastructure = Infrastructure.idInfrastructure AND info.apparition_date >= ? AND info.apparition_date <= ? )`)
        params.push(dateFrom, dateTo)
      } else if (dateFrom) {
        where.push(`EXISTS (SELECT 1 FROM Informations info WHERE info.idInfrastructure = Infrastructure.idInfrastructure AND info.apparition_date >= ? )`)
        params.push(dateFrom)
      } else if (dateTo) {
        where.push(`EXISTS (SELECT 1 FROM Informations info WHERE info.idInfrastructure = Infrastructure.idInfrastructure AND info.apparition_date <= ? )`)
        params.push(dateTo)
      }
    }

    // base select
    let select = 'SELECT DISTINCT Infrastructure.idInfrastructure as id, Infrastructure.name, Infrastructure.adresse, Infrastructure.latitude, Infrastructure.longitude'

    // distance calculation if center provided and distanceKm > 0
    let having = ''
    if (centerLat != null && centerLon != null && distanceKm > 0) {
      select += `, (6371 * acos( cos(radians(?)) * cos(radians(CAST(Infrastructure.latitude AS DECIMAL(10,6)))) * cos(radians(CAST(Infrastructure.longitude AS DECIMAL(10,6))) - radians(?)) + sin(radians(?)) * sin(radians(CAST(Infrastructure.latitude AS DECIMAL(10,6))))) ) as distance`
      // center params go at front of params for SELECT
      params.unshift(centerLat, centerLon, centerLat)
      having = ` HAVING distance <= ${Number(distanceKm)}`
    }

    const whereClause = where.length > 0 ? ('WHERE ' + where.join(' AND ')) : ''
    const limitClause = ` LIMIT ${rawLimit}`

    const sql = `${select} FROM Infrastructure ${whereClause} ${having} ${limitClause}`

    const rows = await query(sql, params)

    const items = (rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      adresse: r.adresse,
      lat: r.latitude ? parseFloat(r.latitude) : null,
      lon: r.longitude ? parseFloat(r.longitude) : null,
      distance: r.distance != null ? Number(r.distance) : undefined,
      source: 'infra'
    }))

    return NextResponse.json(items)
  } catch (e) {
    console.error('search POST api error', e)
    return NextResponse.json([], { status: 500 })
  }
}
