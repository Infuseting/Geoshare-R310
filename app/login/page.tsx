import React, { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LoginForm } from "./login-form"

export default function LoginPage() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4 relative">
			<Link 
				href="/" 
				className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
			>
				<ArrowLeft className="w-5 h-5" />
				<span className="text-sm font-medium">Retour</span>
			</Link>
			<Suspense fallback={<div className="w-full max-w-md h-64 flex items-center justify-center">Chargement...</div>}>
				<LoginForm />
			</Suspense>
		</div>
	)
}
