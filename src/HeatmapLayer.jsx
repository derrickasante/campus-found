import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ items }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !items || items.length === 0) return;

    const points = items
      .filter(item => item.location?.latitude && item.location?.longitude)
      .map(item => [item.location.latitude, item.location.longitude, 0.6]); // intensity

    if (points.length === 0) return;

    const heatLayer = window.L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      gradient: { 0.2: "blue", 0.5: "lime", 0.8: "red" },
    });

    heatLayer.addTo(map);

    return () => map.removeLayer(heatLayer);
  }, [map, items]);

  return null;
}

