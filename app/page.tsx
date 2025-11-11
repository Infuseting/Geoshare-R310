import React from "react";
import LeafletMap from "../components/ui/leaflet-map";
import UserMenu from "@/components/ui/user-menu";
import LeftNavbar from "../components/ui/left-navbar";
import SearchBar from "../components/ui/search-bar";

export default function Home() {
  return (
    <React.Fragment>
      <LeftNavbar />

      <SearchBar />

      <LeafletMap />
      <div className="fixed top-4 right-4 z-[9999] pointer-events-auto">
        <UserMenu />
      </div>
    </React.Fragment>
  );
}
