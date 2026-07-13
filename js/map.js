const TIME_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "upcoming", label: "Upcoming" },
];

const INTEREST_OPTIONS = [...INTEREST_STATUSES, "unset"];

const mapState = {
  data: null,
  markers: [],
  activeMeta: new Set(),
  activeCategories: new Set(),
  activeTime: new Set(),
  activeAmenities: new Set(),
  activeInterest: new Set(),
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

  leafletMap.on("popupopen", (e) => bindInterestSelects(e.popup.getElement()));
}

function drawRadius(center, radiusKm) {
  L.circle([center.lat, center.lng], {
    radius: radiusKm * 1000,
    color: "#4fb0ff",
    weight: 1,
    fillOpacity: 0.05,
  }).addTo(leafletMap);
}

function categoryOptionsForActiveMeta() {
  const metas = mapState.activeMeta.size
    ? mapState.data.metaCategories.filter((m) => mapState.activeMeta.has(m.id))
    : mapState.data.metaCategories;
  return [...new Set(metas.flatMap((m) => m.categories))];
}

function renderCategoryFilters() {
  const options = categoryOptionsForActiveMeta();
  for (const c of [...mapState.activeCategories]) {
    if (!options.includes(c)) mapState.activeCategories.delete(c);
  }
  renderFilterButtons(document.getElementById("category-filters"), options, mapState.activeCategories, {
    onChange: renderMarkers,
  });
}

function renderFilters(data) {
  const metaOptions = data.metaCategories.map((m) => ({ value: m.id, label: m.name }));
  renderFilterButtons(document.getElementById("metacategory-filters"), metaOptions, mapState.activeMeta, {
    onChange: () => {
      renderCategoryFilters();
      renderMarkers();
    },
  });

  renderCategoryFilters();

  renderFilterButtons(document.getElementById("time-filters"), TIME_OPTIONS, mapState.activeTime, {
    multi: false,
    onChange: renderMarkers,
  });

  renderFilterButtons(document.getElementById("amenity-filters"), data.amenities, mapState.activeAmenities, {
    onChange: renderMarkers,
  });

  renderFilterButtons(document.getElementById("interest-filters"), INTEREST_OPTIONS, mapState.activeInterest, {
    onChange: renderMarkers,
  });
}

function matchesFilters(entry) {
  if (!withinRadius(entry, mapState.data.radiusKm)) return false;
  if (mapState.activeMeta.size && !mapState.activeMeta.has(entry.metaCategory)) return false;
  if (mapState.activeCategories.size && !mapState.activeCategories.has(entry.category)) return false;

  const timeScope = [...mapState.activeTime][0] || null;
  if (!matchesTimeScope(entry, timeScope, new Date())) return false;

  if (mapState.activeAmenities.size) {
    const has = [...mapState.activeAmenities].every((a) => entry.amenities.includes(a));
    if (!has) return false;
  }

  if (mapState.activeInterest.size) {
    const interest = getInterest(entry.id) || "unset";
    if (!mapState.activeInterest.has(interest)) return false;
  }

  return true;
}

function renderMarkers() {
  mapState.markers.forEach((m) => leafletMap.removeLayer(m));
  mapState.markers = [];

  const visible = mapState.data.entries.filter(matchesFilters);
  document.getElementById("resource-count").textContent =
    `${visible.length} location${visible.length === 1 ? "" : "s"} shown`;

  visible.forEach((entry) => {
    const marker = entry.symbolicLocation
      ? L.circleMarker([entry.lat, entry.lng], {
          radius: 12,
          color: "#e0a34f",
          weight: 2,
          dashArray: "4 3",
          fillColor: "#e0a34f",
          fillOpacity: 0.15,
        }).addTo(leafletMap)
      : L.marker([entry.lat, entry.lng]).addTo(leafletMap);

    marker.bindPopup(`
      <div class="popup-title">${entry.name}</div>
      ${metaCategoryName(mapState.data, entry.metaCategory)} · ${entry.category} · ${entry.distanceKm.toFixed(1)}km away<br>
      ${entry.symbolicLocation ? '<span class="tag unverified">Approximate/placeholder location</span><br>' : ""}
      ${entry.address}<br>
      ${entry.cost || ""}<br>
      <span class="availability-text">${describeAvailability(entry)}</span>
      ${entry.followUp ? `<p class="followup-note">⚑ ${entry.followUp}</p>` : ""}
      <div class="card-controls">
        <label class="interest-label">My interest ${interestSelectHtml(entry.id)}</label>
      </div>
    `);
    mapState.markers.push(marker);
  });
}

bindInterestControls();
document.addEventListener("wpg-interests-changed", renderMarkers);

loadEntries("../data/entries.json")
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
