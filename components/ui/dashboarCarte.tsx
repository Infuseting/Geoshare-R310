"use client";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { useEffect } from "react";

function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.whenReady(() => {
        map.flyTo(center, map.getZoom());
      });
    }
  }, [center, map]);

  return null;
}

type Infrastructure = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
};
const infraIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],

  shadowSize: [41, 41],
});

export default function Carte({
  infrastructures,
  selectedCenter,
  onInfraClick,
}: {
  infrastructures: Infrastructure[];
  selectedCenter: [number, number] | null;
  onInfraClick?: (infraId: string) => void;
}) {
  const defcenter: [number, number] = (() => {
    const first = infrastructures.find(
      (i) => typeof i.latitude === "number" && typeof i.longitude === "number"
    );
    return first
      ? [first.latitude as number, first.longitude as number]
      : [48.8566, 2.3522]; // fallback Paris
  })();
  return (
    <div className="bg-white rounded-[10px] p-3">
      <h4 className="mb-2">Carte</h4>
      <div className="h-[300px] rounded-[8px] overflow-hidden">
        <MapContainer
          center={[48.8566, 2.3522]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {defcenter && <MapCenterUpdater center={selectedCenter} />}
          {infrastructures
            .filter(
              (i) =>
                typeof i.latitude === "number" &&
                typeof i.longitude === "number"
            )
            .map((infra) => (
              <Marker
                key={infra.id}
                position={[infra.latitude!, infra.longitude!]}
                icon={infraIcon}
                eventHandlers={{
                  click: () => {
                    onInfraClick?.(infra.id);
                  },
                }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
