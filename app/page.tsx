import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="py-4 fixed w-full top-0 z-50 bg-gradient-to-b from-white to-transparent">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="border border-gray-200/50 rounded-full bg-white/80 backdrop-blur-md shadow-sm">
            <div className="flex justify-between items-center px-6 py-2.5">
              {/* Logo */}
              <a href="/" className="flex items-center">
                <span className="text-xl font-bold text-[#D2232A]">
                  Geoshare
                </span>
              </a>

              {/* Navigation desktop */}
              <nav className="hidden lg:flex gap-8">
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">Accueil</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">Fonctionnalités</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">Intégrations</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">FAQs</a>
              </nav>

              {/* Boutons */}
              <div className="flex items-center gap-3">
                {/* Menu mobile */}
                <button className="lg:hidden p-2 text-gray-700 hover:text-[#D2232A] hover:bg-gray-100 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Boutons desktop */}
                <div className="hidden lg:flex gap-3">
                  <Link href="/login">
                    <button className="rounded-full px-5 py-2 text-sm font-medium text-gray-700 hover:text-[#D2232A] hover:bg-gray-100 transition-all">
                      se connecter
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="rounded-full px-5 py-2 text-sm font-semibold bg-[#D2232A] hover:bg-[#B01E24] text-white shadow-md hover:shadow-lg transition-all">
                      s'inscrire
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-28 min-h-screen bg-gradient-to-b from-red-50 via-white to-gray-50">
        <div className="container max-w-6xl mx-auto px-4 text-center py-20">
          <h1 className="text-6xl font-bold text-[#D2232A] mb-6">
            Bienvenue sur Geoshare
          </h1>
        </div>
      </main>
    </>
  );
}
