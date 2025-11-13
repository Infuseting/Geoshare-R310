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

function generateId(prefix = 'infra_') {
  return prefix + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export async function POST(request: Request) {
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

    // Only ENTREPRISE, COLLECTIVITE, and ASSOCIATION can create infrastructures
    if (!['ENTREPRISE', 'COLLECTIVITE', 'ASSOCIATION'].includes(userType)) {
      return NextResponse.json({ error: 'Not authorized to create infrastructures' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, address, latitude, longitude, description } = body

    if (!name || !address) {
      return NextResponse.json({ error: 'Name and address are required' }, { status: 400 })
    }

    // TODO: Get idVille from address or default to a value
    // For now, we'll use a default value or you need to implement geocoding
    const defaultVille = 1 // You should implement proper city lookup

    // Generate unique ID for infrastructure
    const infraId = generateId('infra_')

    // Insert infrastructure
    await query(
      `INSERT INTO Infrastructure (idInfrastructure, name, adresse, idVille, informations, latitude, longitude, en_service)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        infraId,
        name,
        address,
        defaultVille,
        description || null,
        latitude?.toString() || '0',
        longitude?.toString() || '0',
        1 // en_service = 1 (Ouvert)
      ]
    )

    // Link infrastructure to user in responsable table
    await query(
      `INSERT INTO responsable (idUser, idInfrastructure) VALUES (?, ?)`,
      [userId, infraId]
    )

    // Return created infrastructure
    const created = {
      id: infraId,
      name,
      type: 'Autre' as const,
      address,
      status: 'Ouvert' as const,
      createdAt: new Date().toISOString(),
      latitude,
      longitude,
      description,
    }

    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error('Error creating infrastructure:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
