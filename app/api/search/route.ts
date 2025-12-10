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
    const jaugeMin = Number.isFinite(Number(body.jaugeMin)) ? Number(body.jaugeMin) : null
    const jaugeMax = Number.isFinite(Number(body.jaugeMax)) ? Number(body.jaugeMax) : null
    const rawLimit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(100, Number(body.limit))) : 100

    // Build dynamic SQL
    const where: string[] = []
    // we'll collect params in three groups so we can place them in the correct order
    const cteParams: any[] = [] // parameters used by the calendar CTE (start,end)
    const centerParams: any[] = [] // parameters used for distance calculation (radians center)
    const whereParams: any[] = [] // parameters for where-clause conditions
    let useDateAvailability = false

    if (q) {
      where.push('(Infrastructure.name LIKE ? OR Infrastructure.adresse LIKE ?)')
      const like = `%${q}%`
      whereParams.push(like, like)
    }

    if (pieces.length > 0) {
      // AND logic: infrastructure must have ALL selected pieces
      for (const piece of pieces) {
        where.push(`EXISTS (SELECT 1 FROM has_Piece hp JOIN Piece p ON hp.idPiece = p.idPiece WHERE hp.idInfrastructure = Infrastructure.idInfrastructure AND p.Name = ?)`)
        whereParams.push(piece)
      }
    }

    if (equipments.length > 0) {
      // AND logic: infrastructure must have ALL selected equipments
      for (const equip of equipments) {
        where.push(`EXISTS (SELECT 1 FROM has_Equipements he JOIN Equipements e ON he.idEquipements = e.idEquipements WHERE he.idInfrastrcture = Infrastructure.idInfrastructure AND e.typeEquipements = ?)`)
        whereParams.push(equip)
      }
    }

    if (accessibilites.length > 0) {
      // AND logic: must have ALL selected accessibilities
      for (const access of accessibilites) {
        where.push(`EXISTS (SELECT 1 FROM is_accessible ia JOIN Accessibilite a ON ia.idAccessibilite = a.idAccessibilite WHERE ia.idInfrastructure = Infrastructure.idInfrastructure AND a.name = ?)`)
        whereParams.push(access)
      }
    }
    if (jaugeMin != null || jaugeMax != null) {
      // ensure infrastructures have a max_jauge within the requested range
      if (jaugeMin != null && jaugeMax != null) {
        where.push(`EXISTS (SELECT 1 FROM Jauge j WHERE j.idInfrastructure = Infrastructure.idInfrastructure AND j.max_jauge >= ? AND j.max_jauge <= ?)`)
        whereParams.push(jaugeMin, jaugeMax)
      } else if (jaugeMin != null) {
        where.push(`EXISTS (SELECT 1 FROM Jauge j WHERE j.idInfrastructure = Infrastructure.idInfrastructure AND j.max_jauge >= ?)`)
        whereParams.push(jaugeMin)
      } else if (jaugeMax != null) {
        where.push(`EXISTS (SELECT 1 FROM Jauge j WHERE j.idInfrastructure = Infrastructure.idInfrastructure AND j.max_jauge <= ?)`)
        whereParams.push(jaugeMax)
      }
    }
    if (dateFrom || dateTo) {
      // Use a single calendar CTE computed once and derive an `avail` set of infrastructures
      // that have at least one open day (or a special opening) in the requested range.
      // We'll prepend the CTE to the final SQL and pass its params in front of others.
      const start = dateFrom || dateTo
      const end = dateTo || dateFrom
      useDateAvailability = true
      cteParams.push(start, end)
    }

    // base select
    let select = 'SELECT DISTINCT Infrastructure.idInfrastructure as id, Infrastructure.name, Infrastructure.adresse, Infrastructure.latitude, Infrastructure.longitude'

    // distance calculation if center provided and distanceKm > 0
    let having = ''
    if (centerLat != null && centerLon != null && distanceKm > 0) {
      select += `, (6371 * acos( cos(radians(?)) * cos(radians(CAST(Infrastructure.latitude AS DECIMAL(10,6)))) * cos(radians(CAST(Infrastructure.longitude AS DECIMAL(10,6))) - radians(?)) + sin(radians(?)) * sin(radians(CAST(Infrastructure.latitude AS DECIMAL(10,6))))) ) as distance`
      // center params will be placed after cte params but before where params
      centerParams.push(centerLat, centerLon, centerLat)
      having = ` HAVING distance <= ${Number(distanceKm)}`
    }

    const whereClause = where.length > 0 ? ('WHERE ' + where.join(' AND ')) : ''
    const limitClause = ` LIMIT ${rawLimit}`

    // If we're filtering by availability range, compute a calendar CTE and an `avail` set
    // once, then join it to Infrastructure to avoid evaluating the recursive logic per-row.
    let sql = ''
    if (useDateAvailability) {
      const cte = `WITH RECURSIVE calendar AS ( SELECT ? AS date_jour UNION ALL SELECT DATE_ADD(date_jour, INTERVAL 1 DAY) FROM calendar WHERE date_jour < ? ), avail AS ( SELECT DISTINCT io.idInfrastructure FROM calendar c JOIN Ouverture_Jour oj ON oj.jour = ELT(WEEKDAY(c.date_jour)+1, 'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche') JOIN Infra_Ouverture io ON io.id = oj.id_ouverture WHERE NOT EXISTS (SELECT 1 FROM Ouverture_Exception oe JOIN Infra_Ouverture io2 ON io2.id = oe.id_ouverture WHERE io2.idInfrastructure = io.idInfrastructure AND c.date_jour BETWEEN oe.date_debut AND oe.date_fin AND oe.type = 'Fermeture') UNION SELECT DISTINCT io2.idInfrastructure FROM calendar c JOIN Ouverture_Exception oe JOIN Infra_Ouverture io2 ON io2.id = oe.id_ouverture WHERE oe.type = 'Ouverture' AND c.date_jour BETWEEN oe.date_debut AND oe.date_fin )`
      sql = `${cte} ${select} FROM Infrastructure JOIN avail a ON a.idInfrastructure = Infrastructure.idInfrastructure ${whereClause} ${having} ${limitClause}`
    } else {
      sql = `${select} FROM Infrastructure ${whereClause} ${having} ${limitClause}`
    }

    // final params order: cteParams, centerParams, whereParams
    const finalParams = [...cteParams, ...centerParams, ...whereParams]

    const rows = await query(sql, finalParams)

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
