import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Proxy to protect routes: verifies that an access_token cookie exists and is valid.
// Because proxy runs in the Edge runtime where direct DB access isn't available,
// we call the internal verify API route at /api/auth/verify which performs DB checks.

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip public and API routes, and the login/register pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get("access_token")?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  try {
    const origin = req.nextUrl.origin
    const res = await fetch(`${origin}/api/auth/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.ok) {
      let body: any = null
      try {
        body = await res.json()
      } catch (e) {
        body = null
      }

      if (pathname.startsWith("/dashboard")) {
        const userType: string | null = body?.type ?? null
        if (userType === "ENTREPRISE" || userType === "COLLECTIVITE") {
          return NextResponse.next()
        }
        const url = req.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }

      return NextResponse.next()
    }
  } catch (e) {
    // fallthrough to redirect
  }



  const url = req.nextUrl.clone()
  url.pathname = "/login"
  return NextResponse.redirect(url)
}

export const config = {
  // protect everything except api, _next, static assets and auth pages
  matcher: ["/((?!api|_next|static|favicon.ico|login|register).*)"],
}
