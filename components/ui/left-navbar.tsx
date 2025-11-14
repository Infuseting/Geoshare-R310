"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  MagnetIcon,
  Menu as MenuIcon,
  ScanSearch,
  Book,
} from "lucide-react";
import RecentSearches from "./recent-searches";
import { useLeftPanel } from "./left-panel-context";
import SignetsViewer from "./signets-viewer";

export default function LeftNavbar() {
  const { togglePanel } = useLeftPanel();
  const router = useRouter();
  const [userType, setUserType] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return
        if (data && data.type) setUserType(data.type)
        else setUserType(null)
      })
      .catch(() => {
        if (!mounted) return
        setUserType(null)
      })
    return () => {
      mounted = false
    }
  }, [])
  const items = [
    { key: "menu", label: "Menu", icon: MenuIcon },
    { key: "bookmarks", label: "Signets", icon: Bookmark },
    { key: "search", label: "Recherche", icon: ScanSearch },
    {
      key: "manager",
      label: "Gestionnaire",
      icon: Book,
      href: "/dashboard",
      allowedTypes: ["ENTREPRISE", "COLLECTIVITE"],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-[9999] w-16 bg-white border-r border-gray-100 shadow-sm">
      <div className="h-full flex flex-col items-center py-3 space-y-3 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          // hide button if it has an allowedTypes restriction and current userType is not permitted
          if (it.allowedTypes && !it.allowedTypes.includes(userType ?? "")) {
            return null
          }

          return (
            <div key={it.key} className="justify-center items-center flex flex-col">
              <button
                key={it.key}
                title={it.label}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700"
                aria-label={it.label}
                onClick={() => {
                  try {
                    if (it.key === "search") {
                      togglePanel({
                        name: "Recherches récentes",
                        title: "Recherches récentes",
                        html: <RecentSearches vertical={false} />,
                      });
                    } else if (it.key === "bookmarks") {
                      togglePanel({
                        name: "Signets",
                        title: "Signets",
                        html: <SignetsViewer />,
                      })
                    } else if (it.href) {
                      router.push(it.href);
                    }
                  } catch (e) {
                    console.warn("failed to toggle leftPanel", e);
                  }
                }}
              >
                <Icon className="h-5 w-5" />
              </button>
              <span className="block w-10 truncate text-sm text-center">
                {it.label}
              </span>
            </div>
          );
        })}
        <div className="border-t border-gray-200 w-full " />

        <RecentSearches vertical={true} />

        <div className="flex-1" />
      </div>
    </aside>
  );
}
