import React from "react";
import LeafletMap from "@/components/ui/leaflet-map";
import UserMenu from "@/components/ui/user-menu";
import LeftNavbar from "@/components/ui/left-navbar";
import SearchBar from "@/components/ui/search-bar";
import { LeftPanelProvider } from "@/components/ui/left-panel-context";
import LeftPanel from "@/components/ui/left-panel";
import { ToastProvider } from "@/components/ui/toast";
import AlertSystemIntegration from "@/components/ui/alert-system-integration";
export default function MapPage() {
  return (
    <ToastProvider>
      <LeftPanelProvider>
        <LeftPanel />
        <LeftNavbar />
        <SearchBar />
        <AlertSystemIntegration />
        <LeafletMap />
  
      </LeftPanelProvider>
    </ToastProvider>
  );
}
