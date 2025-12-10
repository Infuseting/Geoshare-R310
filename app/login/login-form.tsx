"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function LoginForm() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const router = useRouter()
	const searchParams = useSearchParams()
	const redirectTo = searchParams.get("redirect") || "/map"

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError("")
		setLoading(true)
		try {
			// Call login API route
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password }),
			})
			const data = await res.json()
			if (!res.ok) {
				setError(data?.error || "Échec de la connexion")
				return
			}
			router.push(redirectTo)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Se connecter</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="space-y-4">
					{error && (
						<div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
							{error}
						</div>
					)}
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
							required
							className="mt-1"
						/>
					</div>

					<div>
						<Label htmlFor="password">Mot de passe</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
							required
							className="mt-1"
						/>
					</div>

					<div className="flex items-center justify-between">
						<Button type="submit" disabled={loading}>
							{loading ? "Connexion..." : "Se connecter"}
						</Button>
						<Link href="/register" className="text-sm text-muted-foreground">
							Créer un compte
						</Link>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}
