import type { Tech } from "./types";

function nextDayLabel(): string {
  // Demo day label in San Diego time: tomorrow's weekday, e.g. "Tue"
  const now = new Date(Date.now() + 24 * 3600 * 1000);
  return now.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Los_Angeles" });
}

export function seedTechs(): Tech[] {
  const d = nextDayLabel();
  return [
    {
      id: "t1",
      name: "Mike Torres",
      phone: "+1 (619) 555-0141",
      brands: ["Samsung", "LG", "Sub-Zero", "Whirlpool"],
      certified: ["Samsung"],
      appliance_types: ["refrigerator", "freezer", "ice maker", "dishwasher"],
      zone: "Mission Valley",
      areas: ["Mission Valley", "Hillcrest", "Old Town", "Clairemont", "Linda Vista", "Poway", "Rancho Bernardo", "Heatherfield", "92108", "92103", "92110", "92111", "92117", "92064", "92128"],
      windows: [`${d} 1–3 PM`, `${d} 3–5 PM`],
      color: "#38bdf8",
    },
    {
      id: "t2",
      name: "Priya Shah",
      phone: "+1 (619) 555-0172",
      brands: ["Whirlpool", "GE", "Maytag", "KitchenAid", "Frigidaire"],
      certified: ["Whirlpool", "GE"],
      appliance_types: ["washer", "dryer", "range", "oven", "refrigerator"],
      zone: "North Park",
      areas: ["North Park", "City Heights", "South Park", "Kensington", "Normal Heights", "92104", "92105", "92116", "92102"],
      windows: [`${d} 9–11 AM`, `${d} 11 AM–1 PM`, `${d} 3–5 PM`],
      color: "#a78bfa",
    },
    {
      id: "t3",
      name: "Dave Kim",
      phone: "+1 (858) 555-0118",
      brands: ["LG", "Samsung", "Bosch", "Electrolux"],
      certified: ["LG", "Bosch"],
      appliance_types: ["washer", "dryer", "dishwasher", "refrigerator", "microwave"],
      zone: "La Jolla / UTC",
      areas: ["La Jolla", "UTC", "University City", "Pacific Beach", "Del Mar", "Sorrento Valley", "92037", "92122", "92109", "92014", "92121"],
      windows: [`${d} 8–10 AM`, `${d} 1–3 PM`],
      color: "#34d399",
    },
    {
      id: "t4",
      name: "Rosa Alvarez",
      phone: "+1 (619) 555-0193",
      brands: ["Sub-Zero", "Wolf", "Viking", "Thermador", "GE", "Frigidaire"],
      certified: ["Sub-Zero", "Wolf", "Viking", "Thermador"],
      appliance_types: ["refrigerator", "range", "oven", "cooktop", "wine cooler"],
      zone: "Chula Vista / South Bay",
      areas: ["Chula Vista", "National City", "Bonita", "Coronado", "Imperial Beach", "Downtown", "91910", "91911", "91950", "92118", "92101"],
      windows: [`${d} 10 AM–12 PM`, `${d} 2–4 PM`],
      color: "#fbbf24",
    },
  ];
}
