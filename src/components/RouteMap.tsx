"use client";

import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { Home, Flag, Plane } from "lucide-react";
import type { ItineraryItem } from "@/types";

const ICON_BY_TYPE: Record<ItineraryItem["item_type"], typeof Flag> = {
  accommodation: Home,
  flight: Plane,
  activity: Flag,
};

// One distinct color per day, cycling if a trip runs longer than this list.
const DAY_COLORS = [
  "#2b6a73",
  "#c9752b",
  "#7a4fc9",
  "#2f9e5f",
  "#c9436b",
  "#2f83c9",
  "#a68a1f",
];

// Custom teardrop-pin markers built from lucide icons instead of Leaflet's
// default image markers — colored per day, shaped per item type, so an
// accommodation night (Home) is visually distinct from a planned activity
// (Flag) at a glance. Built with a plain SVG icon rendered to a static
// markup string via react-dom/server, since Leaflet's divIcon takes raw
// HTML, not a React node.
const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(color: string, itemType: ItineraryItem["item_type"]): L.DivIcon {
  const cacheKey = `${color}-${itemType}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const Icon = ICON_BY_TYPE[itemType];
  const iconHtml = renderToStaticMarkup(
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
        background: color,
        border: "2px solid white",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ display: "block", transform: "rotate(45deg)" }}>
        <Icon color="white" size={14} strokeWidth={2.5} />
      </span>
    </div>
  );

  const icon = L.divIcon({
    html: iconHtml,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

type LatLng = [number, number];

export function RouteMap({
  itemsByDay,
}: {
  itemsByDay: Record<number, ItineraryItem[]>;
}) {
  const days = Object.keys(itemsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const mappedItemsByDay = days.map((day) => ({
    day,
    items: itemsByDay[day].filter(
      (item) => item.latitude != null && item.longitude != null
    ),
  }));

  const allPoints: LatLng[] = mappedItemsByDay.flatMap(({ items }) =>
    items.map((item) => [item.latitude as number, item.longitude as number] as LatLng)
  );

  if (allPoints.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 px-6 text-center text-sm text-brand-muted">
        No mapped activities yet — add a location to an activity in the
        itinerary builder and it&apos;ll show up here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal-600 text-white">
            <Flag className="h-3 w-3" strokeWidth={2.5} />
          </span>
          Activity
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal-600 text-white">
            <Home className="h-3 w-3" strokeWidth={2.5} />
          </span>
          Accommodation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal-600 text-white">
            <Plane className="h-3 w-3" strokeWidth={2.5} />
          </span>
          Flight
        </span>
        <span>Each color below is a different day.</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-teal-100">
        <MapContainer
          center={allPoints[0]}
          zoom={12}
          scrollWheelZoom
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mappedItemsByDay.map(({ day, items }, dayIndex) => {
            const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
            const dayPoints: LatLng[] = items.map(
              (item) => [item.latitude as number, item.longitude as number] as LatLng
            );

            return (
              <Fragment key={day}>
                {dayPoints.length > 1 && (
                  <Polyline positions={dayPoints} pathOptions={{ color, weight: 3 }} />
                )}
                {items.map((item) => (
                  <Marker
                    key={item.id}
                    position={[item.latitude as number, item.longitude as number]}
                    icon={getMarkerIcon(color, item.item_type)}
                  >
                    <Popup>
                      <strong>
                        Day {day}
                        {item.start_time ? ` · ${item.start_time}` : ""}
                      </strong>
                      <br />
                      {item.item_type === "accommodation" && "Accommodation: "}
                      {item.item_type === "flight" && "Flight: "}
                      {item.title}
                      {item.location_name && (
                        <>
                          <br />
                          <span style={{ color: "#5c7679" }}>{item.location_name}</span>
                        </>
                      )}
                    </Popup>
                  </Marker>
                ))}
              </Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
