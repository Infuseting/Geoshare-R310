"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import UserMenu from "@/components/ui/user-menu";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(!!data?.name || !!data?.user);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Référence pour cibler la section à animer
  const ref = useRef(null);
  
  // État pour gérer la catégorie sélectionnée
  const [selectedCategory, setSelectedCategory] = useState<
    "particulier" | "association" | "collectivite"
  >("particulier");

  // État pour vérifier si l'utilisateur est connecté
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Vérifier si l'utilisateur est connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        setIsLoggedIn(res.ok);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);
  
  // useScroll track la progression du scroll sur l'élément référencé
  // scrollYProgress retourne une valeur entre 0 et 1
  const { scrollYProgress } = useScroll({
    target: ref, // L'élément à tracker
    offset: ["start 0.5", "start 0.10"], 
    // "start 0.5" : animation commence quand le haut de la section atteint 50% du viewport
    // "start 0.10" : animation se termine quand le haut de la section atteint 10% du viewport
    // Plus ces valeurs sont éloignées, plus l'animation est lente
  });

  // Division du texte en mots individuels pour pouvoir les animer séparément
  const words = "Geoshare rassemble en un seul endroit toutes les infrastructures sportives de Normandie. Que vous soyez un sportif amateur, une association ou une collectivité, accédez facilement aux informations dont vous avez besoin pour dynamiser le sport dans votre région.".split(" ");

  // Données des étapes pour chaque catégorie
  const stepsData = {
    particulier: [
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        title: "Créez votre compte",
        description: "Inscrivez-vous gratuitement en quelques secondes pour accéder à toutes les infrastructures de la région."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        title: "Recherchez des infrastructures",
        description: "Utilisez la carte interactive pour trouver les équipements sportifs près de chez vous selon vos besoins."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ),
        title: "Sauvegardez vos favoris",
        description: "Mettez en signet vos infrastructures favorites et consultez votre historique de recherche pour un accès rapide."
      }
    ],
    association: [
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        title: "Créez votre compte",
        description: "Inscrivez votre association gratuitement pour accéder à la plateforme et ses fonctionnalités avancées."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        title: "Recherche avancée d'infrastructures",
        description: "Utilisez les filtres avancés pour trouver les équipements sportifs adaptés aux besoins spécifiques de votre association."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ),
        title: "Gérez vos favoris",
        description: "Sauvegardez vos infrastructures préférées et consultez les disponibilités pour planifier vos activités associatives."
      }
    ],
    collectivite: [
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        title: "Enregistrez votre collectivité",
        description: "Créez un profil pour votre collectivité et gérez toutes les installations sportives de votre territoire."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        title: "Gérez vos infrastructures",
        description: "Mettez à jour les informations, modifiez les caractéristiques et maintenez vos données à jour en temps réel."
      },
      {
        icon: (
          <svg className="w-8 h-8 text-[#D2232A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        title: "Indiquez les détails",
        description: "Renseignez le statut (ouvert/fermé), l'accessibilité, le type d'équipement et les types de pièces disponibles pour chaque infrastructure."
      }
    ]
  };

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
                <a href="#fonctionnalites" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">Fonctionnalités</a>
                <a href="#advantages" className="text-sm font-medium text-gray-700 hover:text-[#D2232A] transition-colors">Avantages</a>
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
                  {loading ? (
                    <div className="px-5 py-2 text-sm text-gray-500">Chargement...</div>
                  ) : isAuthenticated ? (
                    <UserMenu />
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-to-b from-red-50 via-white to-gray-50">
        {/* Banner Section */}
        <div 
          className="relative w-full text-center py-32 pt-40 overflow-hidden"
          style={{
            backgroundImage: "url('/bg-map.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay pour assombrir l'image de fond */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs"></div>
          
          {/* Contenu */}
          <div className="relative z-10 container max-w-6xl mx-auto px-4">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Recensez et gérez les infrastructures sportives
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
              Plateforme collaborative pour les associations et entreprises permettant de recenser, gérer et partager les infrastructures sportives de la région.
            </p>
            <div className="flex justify-center">
              <Link href={isLoggedIn ? "/map" : "/login"}>
                <button className="rounded-full px-8 py-3 text-base font-semibold bg-[#D2232A] hover:bg-[#B01E24] text-white shadow-2xl hover:shadow-xl transition-all transform hover:scale-105">
                  Commencer maintenant
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Section d'accroche avec reveal au scroll */}
        {/* ref={ref} : permet à useScroll de tracker cette section */}
        <section ref={ref} className="py-32 overflow-hidden">
          <div className="container max-w-4xl mx-auto px-4">
            <p className="text-2xl md:text-3xl text-center leading-relaxed font-light">
              {/* Boucle sur chaque mot du texte */}
              {words.map((word, i) => {
                // Calcul du moment où ce mot spécifique doit commencer à apparaître
                // Ex: mot 10 sur 50 mots total = 10/50 = 0.2 (20% de la progression du scroll)
                const start = i / words.length;
                
                // Calcul du moment où ce mot doit finir d'apparaître
                // Ex: 0.2 + (1/50) = 0.22 (22% de la progression)
                const end = start + 1 / words.length;
                
                // useTransform transforme scrollYProgress en opacité
                // Quand scrollYProgress est entre start et end, l'opacité passe de 0.2 à 1
                // Ex: scrollYProgress = 0.21 (entre 0.2 et 0.22) → opacité = ~0.6
                const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);

                // Détermine si le mot doit être mis en évidence (rouge et gras)
                const isHighlight = word === "Geoshare" || word === "dynamiser";

                return (
                  // motion.span : composant animé de framer-motion
                  // style={{ opacity }} : applique l'opacité calculée dynamiquement
                  <motion.span
                    key={i} // Clé unique pour React
                    style={{ opacity }} // Opacité qui varie avec le scroll
                    className={`inline-block mr-2 ${isHighlight ? 'text-[#D2232A] font-semibold' : 'text-gray-700'}`}
                  >
                    {word}
                  </motion.span>
                );
              })}
            </p>
          </div>
        </section>

        {/* Section Comment ça marche */}
        <section id="fonctionnalites" className="py-20 bg-white">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Comment ça fonctionne ?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Une solution simple et collaborative pour recenser et gérer les infrastructures sportives de votre région.
              </p>

              {/* Sélecteur de catégorie */}
              <div className="flex justify-center gap-4 flex-wrap">
                <button
                  onClick={() => setSelectedCategory("particulier")}
                  className={`px-6 py-3 rounded-full font-medium transition-all ${
                    selectedCategory === "particulier"
                      ? "bg-[#D2232A] text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Particulier
                </button>
                <button
                  onClick={() => setSelectedCategory("association")}
                  className={`px-6 py-3 rounded-full font-medium transition-all ${
                    selectedCategory === "association"
                      ? "bg-[#D2232A] text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Association
                </button>
                <button
                  onClick={() => setSelectedCategory("collectivite")}
                  className={`px-6 py-3 rounded-full font-medium transition-all ${
                    selectedCategory === "collectivite"
                      ? "bg-[#D2232A] text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Collectivité
                </button>
              </div>
            </div>

            {/* Affichage des étapes selon la catégorie sélectionnée */}
            <motion.div
              key={selectedCategory} // Force la réanimation lors du changement
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-3 gap-8"
            >
              {stepsData[selectedCategory].map((step, index) => (
                <div
                  key={index}
                  className="text-center p-6 rounded-2xl hover:shadow-lg transition-shadow"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Section Avantages */}
        <section id="advantages" className="py-20 bg-gray-50">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Pourquoi utiliser Geoshare ?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pour les particuliers</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Découvrez toutes les infrastructures sportives près de chez vous</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Consultez les horaires et disponibilités en temps réel</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Trouvez le terrain idéal pour votre activité sportive</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pour les associations</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Trouvez facilement des infrastructures disponibles près de chez vous</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Effectué une recherche avancé pour trouvez l'infrastructure idéale</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Consultez les horaires et disponibilités en temps réel</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pour les collectivités</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Centralisez toutes les infrastructures de votre territoire</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Suivez l'utilisation et adapter votre calendrier</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-[#D2232A] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Facilitez l'accès aux données pour tous les acteurs</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
