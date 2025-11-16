import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    // Hash password with sha256 (hex)
    const hashed = crypto.createHash("sha256").update(password).digest("hex")

    const users = await query("SELECT idUser, password, name FROM `user` WHERE email = ?", [email])
    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0] as any
    if (user.password !== hashed) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create access token
    const token = crypto.randomBytes(32).toString("hex")

    await query("INSERT INTO access_token (access_token, idUser) VALUES (?, ?)", [token, user.idUser])

    // Set cookie (HTTP only)
    const maxAge = 60 * 60 * 24 * 30 // 30 days
    const cookie = `access_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Secure`

    return NextResponse.json(
      { ok: true, idUser: user.idUser, name: user.name },
      { status: 200, headers: { "Set-Cookie": cookie } }
    )
  } catch (err: any) {
    // Map DB connection timeouts to 504 so clients see a clear "upstream" failure instead of generic 500.
    const msg = String(err?.message ?? '');
    if (err?.code === 'ETIMEDOUT' || /ETIMEDOUT/i.test(msg) || /connect ETIMEDOUT/i.test(msg)) {
      return NextResponse.json({ error: 'Database connection timed out' }, { status: 504 })
    }

    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 })
  }
}
