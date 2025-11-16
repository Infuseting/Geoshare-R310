"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
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
				alert(data?.error || "Login failed")
				return
			}
			router.push("/map")
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
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
										<Label htmlFor="password">Password</Label>
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
								{loading ? "Signing in..." : "Sign in"}
							</Button>
							<Link href="/register" className="text-sm text-muted-foreground">
								Create an account
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

