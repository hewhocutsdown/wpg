const mapState = {
  data: null,
  markers: [],
  activeCategories: new Set(),
  activeAmenities: new Set(),
};

let leafletMap;

function initMap(center) {
  leafletMap = L.map("map").setView([center.lat, center.lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(leafletMap);

  L.marker([center.lat, center.lng])
    .addTo(leafletMap)
    .bindPopup(`<div class="popup-title">${center.name}</div>${center.address || ""}`);
}

function drawRadius(center, radiusKm) {
  L.circle([center.lat, center.lng], {
    radius: radiusKm * 1000,
    color: "#4fb0ff",
    weight: 1,
    fillOpacity: 0.05,
  }).addTo(leafletMap);
}

function renderFilters(data) {
  const catWrap = document.getElementById("category-filters");
  data.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      toggle(mapState.activeCategories, cat);
      btn.classList.toggle("active");
      renderMarkers();
    });
    catWrap.appendChild(btn);
  });

  const amenWrap = document.getElementById("amenity-filters");
  data.amenities.forEach((am) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = am;
    btn.addEventListener("click", () => {
      toggle(mapState.activeAmenities, am);
      btn.classList.toggle("active");
      renderMarkers();
    });
    amenWrap.appendChild(btn);
  });
}

function toggle(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function matchesFilters(resource) {
  if (!withinRadius(resource, mapState.data.radiusKm)) return false;
  if (mapState.activeCategories.size && !mapState.activeCategories.has(resource.category)) {
    return false;
  }
  if (mapState.activeAmenities.size) {
    const has = [...mapState.activeAmenities].every((a) => resource.amenities.includes(a));
    if (!has) return false;
  }
  return true;
}

function renderMarkers() {
  mapState.markers.forEach((m) => leafletMap.removeLayer(m));
  mapState.markers = [];

  const visible = mapState.data.resources.filter(matchesFilters);
  document.getElementById("resource-count").textContent =
    `${visible.length} location${visible.length === 1 ? "" : "s"} shown`;

  visible.forEach((r) => {
    const marker = L.marker([r.lat, r.lng]).addTo(leafletMap);
    marker.bindPopup(`
      <div class="popup-title">${r.name}</div>
      ${r.category} · ${r.distanceKm.toFixed(1)}km away<br>
      ${r.address}<br>
      ${r.cost || ""} ${r.hours ? "· " + r.hours : ""}
    `);
    mapState.markers.push(marker);
  });
}

loadResources("../data/resources.json")
  .then((data) => {
    mapState.data = data;
    initMap(data.center);
    drawRadius(data.center, data.radiusKm);
    renderFilters(data);
    renderMarkers();
  })
  .catch((err) => {
    document.getElementById("map").textContent = "Couldn't load resource data: " + err.message;
  });
