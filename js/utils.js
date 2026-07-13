// Shared helpers used by the list, map, and timeline pages.

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

/** Fetch data/entries.json (path relative to caller) and annotate each
 *  entry with its distance in km from the configured center point. */
async function loadEntries(dataPath) {
  const res = await fetch(dataPath);
  if (!res.ok) throw new Error(`Failed to load ${dataPath}: ${res.status}`);
  const data = await res.json();
  const { lat: cLat, lng: cLng } = data.center;
  data.entries.forEach((e) => {
    e.distanceKm = haversineKm(cLat, cLng, e.lat, e.lng);
  });
  data.entries.sort((a, b) => a.distanceKm - b.distanceKm);
  return data;
}

function withinRadius(entry, radiusKm) {
  return entry.distanceKm <= radiusKm;
}

function metaCategoryName(data, id) {
  return data.metaCategories.find((m) => m.id === id)?.name || id;
}

/** Render a row of filter buttons into `container`, keeping `activeSet` in
 *  sync. `multi: false` makes the row single-select (click again to clear).
 *  options: array of strings, or {value, label} objects. */
function renderFilterButtons(container, options, activeSet, { multi = true, onChange } = {}) {
  container.innerHTML = "";
  options.forEach((opt) => {
    const value = typeof opt === "string" ? opt : opt.value;
    const label = typeof opt === "string" ? opt : opt.label;
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeSet.has(value) ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (multi) {
        if (activeSet.has(value)) activeSet.delete(value);
        else activeSet.add(value);
      } else {
        const wasActive = activeSet.has(value);
        activeSet.clear();
        if (!wasActive) activeSet.add(value);
      }
      renderFilterButtons(container, options, activeSet, { multi, onChange });
      onChange && onChange();
    });
    container.appendChild(btn);
  });
}

/** Shared entry-card markup used by the list and timeline pages. */
function renderEntryCardHtml(entry, data) {
  const metaName = metaCategoryName(data, entry.metaCategory);
  return `
    <article class="resource-card ${getInterest(entry.id) ? "has-interest" : ""}">
      <h3>${entry.name}</h3>
      <div class="resource-meta">
        ${metaName} · ${entry.category} · ${entry.distanceKm.toFixed(1)}km away · ${entry.cost || "Cost unknown"}
      </div>
      <div>${entry.address}</div>
      <div class="resource-meta availability-text">${describeAvailability(entry)}</div>
      ${entry.notes ? `<p>${entry.notes}</p>` : ""}
      <div class="resource-tags">
        ${entry.amenities.map((a) => `<span class="tag">${a}</span>`).join("")}
        ${entry.verified ? "" : '<span class="tag unverified">Unverified</span>'}
      </div>
      <div class="card-controls">
        <label class="interest-label">My interest ${interestSelectHtml(entry.id)}</label>
      </div>
    </article>
  `;
}
