"use client";
import dynamic from "next/dynamic";

// Dynamically load the client-only Leaflet map to avoid server-side evaluation
const LeafletMap = dynamic(() => import("./leaflet-map.client"), { ssr: false });

export default LeafletMap;
