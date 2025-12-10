"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function UserMenu({ name }: { name?: string }) {
  const [initial, setInitial] = React.useState<string>(() => {
    if (name && name.length > 0) return name.trim()[0].toUpperCase()
    return "U"
  })

  React.useEffect(() => {
    // Priority: prop `name` -> localStorage 'userName' -> fetch '/api/auth/me' -> fallback 'U'
    if (name && name.length > 0) {
      setInitial(name.trim()[0].toUpperCase())
      return
    }

    try {
      const stored = localStorage.getItem("userName")
      if (stored && stored.length > 0) {
        setInitial(stored.trim()[0].toUpperCase())
        return
      }
    } catch (e) {
      // ignore localStorage errors
    }

    // Try optional API endpoint '/api/auth/me' — silently ignore failures
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) return
        const json = await res.json()
        const maybeName = json?.name || json?.user?.name
        if (maybeName && maybeName.length > 0) {
          setInitial(maybeName.trim()[0].toUpperCase())
          setUserType(json.type || null)
          
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [name])

  const router = useRouter()
  const [loggingOut, setLoggingOut] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [userType, setUserType] = React.useState<string | null>(null)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Call logout endpoint which clears the server-side token and cookie
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
      if (res.ok) {
        try {
          localStorage.removeItem("userName")
        } catch (e) {
          // ignore localStorage errors
        }
        // If on home page, reload to update auth state, otherwise redirect
        if (window.location.pathname === "/") {
          window.location.reload()
        } else {
          router.push("/")
        }
        return
      }
      // If not ok, still navigate to home to force unauthenticated state
      if (window.location.pathname === "/") {
        window.location.reload()
      } else {
        router.push("/")
      }
    } catch (e) {
      // On error, still try to navigate to home
      if (window.location.pathname === "/") {
        window.location.reload()
      } else {
        router.push("/")
      }
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return
    const ok = confirm("Voulez-vous vraiment supprimer définitivement votre compte ? Cette action est irréversible.")
    if (!ok) return
    setDeleting(true)
    try {
      const res = await fetch("/api/auth/delete", { method: "POST", credentials: "same-origin" })
      if (res.ok) {
        try {
          localStorage.removeItem("userName")
        } catch (e) {
          // ignore localStorage errors
        }
        // Navigate to registration page after deletion
        router.push("/register")
        return
      }
      // If the delete failed, still navigate to login to ensure unauthenticated state
      router.push("/login")
    } catch (e) {
      // On error, still try to navigate to login
      router.push("/login")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open user menu"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar>
            <AvatarFallback className="bg-purple-600 text-white">{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="z-[100000]">
        <DropdownMenuItem asChild>
          <Link href="/map" className="w-full cursor-pointer">
            Voir la carte
          </Link>
        </DropdownMenuItem>
        {(userType === 'ENTREPRISE' || userType === 'COLLECTIVITE') && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="w-full cursor-pointer">
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            onClick={handleLogout}
            className="w-full text-left"
            disabled={loggingOut}
            aria-disabled={loggingOut}
          >
            {loggingOut ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </DropdownMenuItem>
        { userType === 'PARTICULIER' || userType === 'ASSOCIATION' ? (
          <>
          <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
            
                <button
                onClick={handleDeleteAccount}
                className="w-full text-left text-red-600"
                disabled={deleting}
                aria-disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer mon compte"}
              </button>
            </DropdownMenuItem>
          </>
          ) : (
            null
          
          
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
