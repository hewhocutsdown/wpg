// Shared helpers used by both the list and map pages.

/** Great-circle distance between two lat/lng points, in kilometres. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Fetch data/resources.json (path relative to caller) and annotate each
 *  resource with its distance in km from the configured center point. */
async function loadResources(dataPath) {
  const res = await fetch(dataPath);
  if (!res.ok) throw new Error(`Failed to load ${dataPath}: ${res.status}`);
  const data = await res.json();
  const { lat: cLat, lng: cLng } = data.center;
  data.resources.forEach((r) => {
    r.distanceKm = haversineKm(cLat, cLng, r.lat, r.lng);
  });
  data.resources.sort((a, b) => a.distanceKm - b.distanceKm);
  return data;
}

function withinRadius(resource, radiusKm) {
  return resource.distanceKm <= radiusKm;
}
