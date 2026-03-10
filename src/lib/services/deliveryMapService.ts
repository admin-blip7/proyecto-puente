export type GeocodeResult = {
  latitude: number;
  longitude: number;
  normalizedAddress: string;
};

export type RoutePoint = {
  id: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  stopSequence?: number;
};

const MAPBOX_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;

const geocodeWithMapbox = async (address: string): Promise<GeocodeResult | null> => {
  if (!MAPBOX_ACCESS_TOKEN) return null;

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&country=mx`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const json = await response.json();
    const first = json?.features?.[0];
    const center = first?.center;
    if (!center || center.length < 2) return null;

    return {
      latitude: Number(center[1]),
      longitude: Number(center[0]),
      normalizedAddress: first.place_name || address,
    };
  } catch {
    return null;
  }
};

const distanceWithMapbox = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<{ distanceKm: number; durationMinutes: number } | null> => {
  if (!MAPBOX_ACCESS_TOKEN) return null;
  try {
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const endpoint = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=false`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const json = await response.json();
    const route = json?.routes?.[0];
    if (!route) return null;

    const distanceKm = Number(route.distance || 0) / 1000;
    const durationMinutes = Math.ceil(Number(route.duration || 0) / 60);
    return { distanceKm, durationMinutes };
  } catch {
    return null;
  }
};

// Geocoding determinístico local (fallback) para no bloquear operaciones sin API externa.
export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  const mapboxResult = await geocodeWithMapbox(address);
  if (mapboxResult) return mapboxResult;

  const cleaned = address.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash << 5) - hash + cleaned.charCodeAt(i);
    hash |= 0;
  }

  const baseLat = 19.4326; // CDMX como centro operativo por defecto
  const baseLng = -99.1332;
  const latitude = baseLat + ((hash % 1000) / 100000);
  const longitude = baseLng + (((hash / 1000) % 1000) / 100000);

  return {
    latitude,
    longitude,
    normalizedAddress: address.trim(),
  };
};

export const getRouteDistance = (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): number => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getEstimatedTime = (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  avgSpeedKmH = 30
): number => {
  const distance = getRouteDistance(origin, destination);
  return Math.ceil((distance / avgSpeedKmH) * 60);
};

export const getDistanceAndTime = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  avgSpeedKmH = 30
) => {
  const mapbox = await distanceWithMapbox(origin, destination);
  if (mapbox) return mapbox;
  const distanceKm = getRouteDistance(origin, destination);
  const durationMinutes = Math.ceil((distanceKm / avgSpeedKmH) * 60);
  return { distanceKm, durationMinutes };
};

const optimizeWithMapbox = async (stops: RoutePoint[]): Promise<RoutePoint[] | null> => {
  if (!MAPBOX_ACCESS_TOKEN || stops.length < 2) return null;
  const allWithCoords = stops.every((s) => s.latitude != null && s.longitude != null);
  if (!allWithCoords) return null;

  try {
    const coordinates = stops
      .map((s) => `${s.longitude},${s.latitude}`)
      .join(";");

    const endpoint =
      `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}` +
      `?access_token=${MAPBOX_ACCESS_TOKEN}&source=first&destination=last&roundtrip=false&overview=false`;

    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const json = await response.json();
    const waypoints = json?.waypoints;
    if (!Array.isArray(waypoints) || !waypoints.length) return null;

    const reordered = [...stops].sort((a, b) => {
      const aIndex = waypoints.find((w: any) => w.name === a.address)?.waypoint_index ?? 999;
      const bIndex = waypoints.find((w: any) => w.name === b.address)?.waypoint_index ?? 999;
      return aIndex - bIndex;
    });

    return reordered.map((stop, index) => ({
      ...stop,
      stopSequence: index + 1,
    }));
  } catch {
    return null;
  }
};

export const optimizeRoute = async (stops: RoutePoint[]): Promise<RoutePoint[]> => {
  if (stops.length <= 2) return stops;

  const withCoords = await Promise.all(
    stops.map(async (stop) => {
      if (stop.latitude != null && stop.longitude != null) return stop;
      const geo = await geocodeAddress(stop.address);
      return {
        ...stop,
        latitude: geo.latitude,
        longitude: geo.longitude,
      };
    })
  );

  const optimizedByMapbox = await optimizeWithMapbox(withCoords);
  if (optimizedByMapbox) return optimizedByMapbox;

  const [start, ...rest] = withCoords;
  const sorted = rest.sort((a, b) => {
    const da = getRouteDistance(
      { latitude: start.latitude!, longitude: start.longitude! },
      { latitude: a.latitude!, longitude: a.longitude! }
    );
    const db = getRouteDistance(
      { latitude: start.latitude!, longitude: start.longitude! },
      { latitude: b.latitude!, longitude: b.longitude! }
    );
    return da - db;
  });

  return [start, ...sorted].map((stop, index) => ({
    ...stop,
    stopSequence: index + 1,
  }));
};
