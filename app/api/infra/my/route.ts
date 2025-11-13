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

const STATUS_MAP: Record<number, string> = {
  1: 'Ouvert',
  2: 'Fermé',
  3: 'Plein',
};


export async function GET(request: Request) {
  try {
    // Get user from access token
    const cookieHeader = request.headers.get('cookie')
    const cookies = parseCookies(cookieHeader)
    const token = cookies['access_token'] ?? null

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user info
    const userRows = await query(
      'SELECT u.idUser, u.type FROM access_token a JOIN `user` u ON a.idUser = u.idUser WHERE a.access_token = ? LIMIT 1',
      [token]
    )

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user = userRows[0] as any
    const userId = user.idUser
    const userType = user.type

    // Only ENTREPRISE, COLLECTIVITE, and ASSOCIATION can have infrastructures
    if (!['ENTREPRISE', 'COLLECTIVITE', 'ASSOCIATION'].includes(userType)) {
      return NextResponse.json([])
    }

    // Get infrastructures based on user responsibilities
    // This query gets infrastructures where the user is:
    // 1. Directly responsible for the infrastructure
    // 2. Responsible for the region/EPCI/commune that contains the infrastructure
    const infraRows = await query(`
      SELECT
  i.idInfrastructure AS id,
  i.name,
  i.adresse,
  i.latitude,
  i.longitude,
  i.en_service AS status,
  i.informations AS description,
  c.name AS ville,
  COALESCE(
    GROUP_CONCAT(DISTINCT eq.typeEquipements ORDER BY eq.typeEquipements SEPARATOR ', '),
    ''
  ) AS type
FROM Infrastructure i
LEFT JOIN Commune c ON i.idVille = c.idVille
LEFT JOIN Commune_has_EPCI che ON c.idVille = che.Commune_idVille
LEFT JOIN EPCI_has_Region ehr ON che.EPCI_idEPCI = ehr.EPCI_idEPCI
LEFT JOIN has_Equipements heq ON i.idInfrastructure = heq.idInfrastrcture
LEFT JOIN Equipements eq ON heq.idEquipements = eq.idEquipements
WHERE EXISTS (
  SELECT 1 FROM responsable r
  WHERE r.idUser = ?
    AND (
      r.idInfrastructure = i.idInfrastructure
      OR r.Commune_idVille = c.idVille
      OR r.EPCI_idEPCI = che.EPCI_idEPCI
      OR r.Region_idRegion = ehr.Region_idRegion
    )
)
GROUP BY
  i.idInfrastructure,
  i.name,
  i.adresse,
  i.latitude,
  i.longitude,
  i.en_service,
  i.informations,
  c.name
ORDER BY i.name
    `, [userId])

    // Transform data to match frontend Infrastructure type
    const items = infraRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type, // Default type - you may want to add a type field to the database
      address: row.adresse,
       status : row.status === 1 ? 'Ouvert' : row.status === 2 ?'Fermé':'Plein',
            
      createdAt: new Date().toISOString(), // Database doesn't have creation date
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      description: row.description || undefined,
    }))

    return NextResponse.json(items)
  } catch (e) {
    console.error('Error fetching user infrastructures:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}