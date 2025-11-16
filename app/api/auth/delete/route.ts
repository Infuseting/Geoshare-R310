import { NextResponse } from "next/server"
import { query } from "@/lib/db"

function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie")
    const cookies = parseCookies(cookieHeader)
    const token = cookies["access_token"] ?? null

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const rows = await query("SELECT idUser FROM access_token WHERE access_token = ? LIMIT 1", [token])
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const idUser = (rows[0] as any).idUser

    try {
      // Delete all access tokens for this user first (FK on access_token)
      await query("DELETE FROM access_token WHERE idUser = ?", [idUser])
    } catch (e) {
      console.error("Failed to delete access_token rows for user", idUser, e)
      // continue: try to remove other references and user row
    }

    try {
      // Clear any 'responsable' links referencing this user (nullable)
      await query("DELETE FROM responsable WHERE idUser = ?", [idUser])
    } catch (e) {
      console.error("Failed to delete responsable rows for user", idUser, e)
    }

    try {
      // Finally delete the user row
      await query("DELETE FROM `user` WHERE idUser = ?", [idUser])
    } catch (e) {
      console.error("Failed to delete user row", idUser, e)
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    // Clear cookie
    const clearCookie = `access_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`

    return NextResponse.json({ ok: true }, { status: 200, headers: { "Set-Cookie": clearCookie } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 })
  }
}

// Allow GET for convenience during manual testing
export async function GET(req: Request) {
  return POST(req)
}
