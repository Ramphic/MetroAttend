import { calculateDistanceMeters } from './firebase';

interface KnownLandmark {
  name: string;
  lat: number;
  lng: number;
}

// Authentic major civil engineering corridors and municipal localities in Ghana
const KNOWN_LANDMARKS: KnownLandmark[] = [
  { name: 'Ministries, Central Accra', lat: 5.5492, lng: -0.1978 },
  { name: 'High Street / Osu Klottey, Accra', lat: 5.5410, lng: -0.2030 },
  { name: 'Adabraka / Ridge Enclave', lat: 5.5580, lng: -0.2050 },
  { name: 'Kwame Nkrumah Circle, Accra', lat: 5.5600, lng: -0.2080 },
  { name: 'Dansoman / Exhibition / Sahara', lat: 5.5520, lng: -0.2580 },
  { name: 'Dansoman / Keep Fit / Roundabout', lat: 5.5450, lng: -0.2650 },
  { name: 'Kaneshie / Industrial Area', lat: 5.5680, lng: -0.2350 },
  { name: 'Darkuman / Bubuashie / Kokompe', lat: 5.5780, lng: -0.2400 },
  { name: 'N1 Highway / Lapaz Junction', lat: 5.6020, lng: -0.2450 },
  { name: 'Awoshie / Anyaa Market', lat: 5.5900, lng: -0.2750 },
  { name: 'Ablekuma / Fan Milk Corridor', lat: 5.6150, lng: -0.2950 },
  { name: 'Achimota / Dome Corridor', lat: 5.6230, lng: -0.2290 },
  { name: 'Pokuase Interchange & Arterial', lat: 5.7067, lng: -0.2982 },
  { name: 'Pokuase / ACP Junction', lat: 5.6980, lng: -0.2850 },
  { name: 'Amasaman / Ga West Municipal', lat: 5.7250, lng: -0.3200 },
  { name: 'Amasaman / Medie / Sarpeiman', lat: 5.7400, lng: -0.3350 },
  { name: 'Mallam / Weija Barrier', lat: 5.5600, lng: -0.3000 },
  { name: 'Weija / SCC / Tetegu', lat: 5.5500, lng: -0.3350 },
  { name: 'Bortianor / Red Top Corridor', lat: 5.5200, lng: -0.3550 },
  { name: 'Kasoa Interchange Corridor', lat: 5.5350, lng: -0.4200 },
  { name: 'Kasoa / Iron City / CP', lat: 5.5420, lng: -0.4150 },
  { name: 'Kasoa / Nyanyano Road Junction', lat: 5.5250, lng: -0.4350 },
  { name: 'Airport City / Roman Ridge', lat: 5.5980, lng: -0.1790 },
  { name: 'East Legon / Shiashie', lat: 5.6350, lng: -0.1600 },
  { name: 'Legon / University of Ghana', lat: 5.6510, lng: -0.1870 },
  { name: 'Madina / Zongo Junction', lat: 5.6700, lng: -0.1650 },
  { name: 'Adenta Barrier & Corridor', lat: 5.7100, lng: -0.1550 },
  { name: 'Spintex Road / Batsonaa', lat: 5.6320, lng: -0.1080 },
  { name: 'Spintex Road / Coastal / Manet', lat: 5.6250, lng: -0.1250 },
  { name: 'Accra-Tema Motorway / Ashaiman', lat: 5.6880, lng: -0.0450 },
  { name: 'Ashaiman / Lebanon / Jericho', lat: 5.7000, lng: -0.0350 },
  { name: 'Tema Community 1 / Central', lat: 5.6420, lng: -0.0050 },
  { name: 'Tema Harbour & Industrial Zone', lat: 5.6300, lng: 0.0050 },
  { name: 'Kpone / Dawhenya Corridor', lat: 5.7000, lng: 0.0600 },
  { name: 'Kumasi Central / Kejetia', lat: 6.6900, lng: -1.6200 },
  { name: 'Takoradi Port & Commercial Hub', lat: 4.8900, lng: -1.7500 },
];

export const POPULAR_GHANA_TOWNS = [
  'Dansoman',
  'Kasoa',
  'Amasaman',
  'Spintex',
  'Pokuase',
  'Lapaz',
  'Adenta',
  'Madina',
  'Tema',
  'Ashaiman',
  'Weija',
  'Achimota',
  'Ministries (HQ)',
];

const GEO_CACHE = new Map<string, string>();

/**
 * Returns the nearest identifiable town name in Ghana
 */
export function getClosestTownName(lat: number, lng: number): string {
  let closest = KNOWN_LANDMARKS[0];
  let minDistance = Infinity;

  for (const landmark of KNOWN_LANDMARKS) {
    const dist = calculateDistanceMeters(lat, lng, landmark.lat, landmark.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = landmark;
    }
  }

  // Extract clean town from landmark name (e.g. "Dansoman / Exhibition" -> "Dansoman")
  const mainPart = closest.name.split('/')[0].split(',')[0].trim();
  return mainPart;
}

/**
 * Fast synchronous fallback resolving the nearest recognizable area/landmark
 */
export function getNearestLandmark(lat: number, lng: number): string {
  let closest = KNOWN_LANDMARKS[0];
  let minDistance = Infinity;

  for (const landmark of KNOWN_LANDMARKS) {
    const dist = calculateDistanceMeters(lat, lng, landmark.lat, landmark.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = landmark;
    }
  }

  const distKm = (minDistance / 1000).toFixed(1);

  if (minDistance <= 2500) {
    return closest.name;
  }
  if (minDistance <= 12000) {
    return `Near ${closest.name} (~${distKm}km)`;
  }

  return `${closest.name} Outskirts (~${distKm}km)`;
}

/**
 * Reverse geocodes coordinates to a human-friendly place name (street, suburb, or town)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (GEO_CACHE.has(cacheKey)) {
    return GEO_CACHE.get(cacheKey)!;
  }

  const fallback = getNearestLandmark(lat, lng);

  // Strategy 1: Try OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.highway;
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.town || addr.city;
      const city = addr.city || addr.town || addr.county || 'Accra';

      let readable = '';
      if (road && suburb && road !== suburb) {
        readable = `${road}, ${suburb}`;
      } else if (road) {
        readable = `${road}, ${city}`;
      } else if (suburb) {
        readable = `${suburb}, ${city}`;
      } else if (data.display_name) {
        readable = data.display_name.split(',').slice(0, 2).join(',').trim();
      }

      if (readable) {
        GEO_CACHE.set(cacheKey, readable);
        return readable;
      }
    }
  } catch (err) {
    // Nominatim timeout or offline, continue to fallback API
  }

  // Strategy 2: Fast Client Reverse Geocode API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.city || '';
      const suburb = data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name || '';
      const area = [locality, suburb].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      if (area) {
        GEO_CACHE.set(cacheKey, area);
        return area;
      }
    }
  } catch (err) {
    // Fall back to nearest landmark
  }

  GEO_CACHE.set(cacheKey, fallback);
  return fallback;
}
