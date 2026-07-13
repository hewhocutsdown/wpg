const state = {
  data: null,
  activeCategories: new Set(),
  activeAmenities: new Set(),
};

function renderFilters(data) {
  const catWrap = document.getElementById("category-filters");
  data.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener("click", () => {
      toggle(state.activeCategories, cat);
      btn.classList.toggle("active");
      render();
    });
    catWrap.appendChild(btn);
  });

  const amenWrap = document.getElementById("amenity-filters");
  data.amenities.forEach((am) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = am;
    btn.dataset.amenity = am;
    btn.addEventListener("click", () => {
      toggle(state.activeAmenities, am);
      btn.classList.toggle("active");
      render();
    });
    amenWrap.appendChild(btn);
  });
}

function toggle(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function matchesFilters(resource) {
  if (!withinRadius(resource, state.data.radiusKm)) return false;
  if (state.activeCategories.size && !state.activeCategories.has(resource.category)) {
    return false;
  }
  if (state.activeAmenities.size) {
    const has = [...state.activeAmenities].every((a) => resource.amenities.includes(a));
    if (!has) return false;
  }
  return true;
}

function render() {
  const list = document.getElementById("resource-list");
  const count = document.getElementById("resource-count");
  list.innerHTML = "";

  const visible = state.data.resources.filter(matchesFilters);
  count.textContent = `${visible.length} location${visible.length === 1 ? "" : "s"} within ${state.data.radiusKm}km of the ${state.data.center.name}`;

  visible.forEach((r) => {
    const card = document.createElement("article");
    card.className = "resource-card";
    card.innerHTML = `
      <h3>${r.name}</h3>
      <div class="resource-meta">
        ${r.category} · ${r.distanceKm.toFixed(1)}km away · ${r.cost || "Cost unknown"}
      </div>
      <div>${r.address}</div>
      ${r.hours ? `<div class="resource-meta">${r.hours}</div>` : ""}
      ${r.notes ? `<p>${r.notes}</p>` : ""}
      <div class="resource-tags">
        ${r.amenities.map((a) => `<span class="tag">${a}</span>`).join("")}
        ${r.verified ? "" : '<span class="tag unverified">Unverified</span>'}
      </div>
    `;
    list.appendChild(card);
  });
}

loadResources("data/resources.json")
  .then((data) => {
    state.data = data;
    renderFilters(data);
    render();
  })
  .catch((err) => {
    document.getElementById("resource-list").textContent =
      "Couldn't load resource data: " + err.message;
  });
