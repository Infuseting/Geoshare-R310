"use client";

import React from "react";
import { Bookmark, MagnetIcon, Menu as MenuIcon, ScanSearch } from "lucide-react";
import RecentSearches from "./recent-searches";
import { useLeftPanel } from './left-panel-context'

export default function LeftNavbar() {
  const { togglePanel } = useLeftPanel()
  const items = [
    { key: "menu", label: "Menu", icon: MenuIcon },
    { key: "bookmarks", label: "Signets", icon: Bookmark },
    { key: "search", label: "Recherche", icon: ScanSearch },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-[9999] w-16 bg-white border-r border-gray-100 shadow-sm">
      <div className="h-full flex flex-col items-center py-3 space-y-3 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div className="justify-center items-center flex flex-col">
              <button
                key={it.key}
                title={it.label}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700"
                aria-label={it.label}
                  onClick={() => {
                    try {
                      if (it.key === 'search') {
                        // toggle left-panel open/close when clicking the search button
                        // use the LeftPanel context directly (more reliable than window events)
                        togglePanel({ name: 'Recherches récentes', title: 'Recherches récentes', html: <RecentSearches vertical={false} /> })
                      }
                    } catch (e) {
                      console.warn('failed to toggle leftPanel', e)
                    }
                  }}
              >
                <Icon className="h-5 w-5" />
                
              </button>
              <span className="block w-10 truncate text-sm text-center">{it.label}</span>
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
