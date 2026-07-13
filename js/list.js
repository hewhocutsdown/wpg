const TIME_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "upcoming", label: "Upcoming" },
];

const INTEREST_OPTIONS = [...INTEREST_STATUSES, "unset"];

const state = {
  data: null,
  activeMeta: new Set(),
  activeCategories: new Set(),
  activeTime: new Set(),
  activeAmenities: new Set(),
  activeInterest: new Set(),
};

function categoryOptionsForActiveMeta() {
  const metas = state.activeMeta.size
    ? state.data.metaCategories.filter((m) => state.activeMeta.has(m.id))
    : state.data.metaCategories;
  return [...new Set(metas.flatMap((m) => m.categories))];
}

function renderCategoryFilters() {
  const options = categoryOptionsForActiveMeta();
  for (const c of [...state.activeCategories]) {
    if (!options.includes(c)) state.activeCategories.delete(c);
  }
  renderFilterButtons(document.getElementById("category-filters"), options, state.activeCategories, {
    onChange: render,
  });
}

function renderFilters(data) {
  const metaOptions = data.metaCategories.map((m) => ({ value: m.id, label: m.name }));
  renderFilterButtons(document.getElementById("metacategory-filters"), metaOptions, state.activeMeta, {
    onChange: () => {
      renderCategoryFilters();
      render();
    },
  });

  renderCategoryFilters();

  renderFilterButtons(document.getElementById("time-filters"), TIME_OPTIONS, state.activeTime, {
    multi: false,
    onChange: render,
  });

  renderFilterButtons(document.getElementById("amenity-filters"), data.amenities, state.activeAmenities, {
    onChange: render,
  });

  renderFilterButtons(document.getElementById("interest-filters"), INTEREST_OPTIONS, state.activeInterest, {
    onChange: render,
  });
}

function matchesFilters(entry) {
  if (!withinRadius(entry, state.data.radiusKm)) return false;
  if (state.activeMeta.size && !state.activeMeta.has(entry.metaCategory)) return false;
  if (state.activeCategories.size && !state.activeCategories.has(entry.category)) return false;

  const timeScope = [...state.activeTime][0] || null;
  if (!matchesTimeScope(entry, timeScope, new Date())) return false;

  if (state.activeAmenities.size) {
    const has = [...state.activeAmenities].every((a) => entry.amenities.includes(a));
    if (!has) return false;
  }

  if (state.activeInterest.size) {
    const interest = getInterest(entry.id) || "unset";
    if (!state.activeInterest.has(interest)) return false;
  }

  return true;
}

function render() {
  const list = document.getElementById("resource-list");
  const count = document.getElementById("resource-count");

  const visible = state.data.entries.filter(matchesFilters);
  count.textContent = `${visible.length} location${visible.length === 1 ? "" : "s"} within ${state.data.radiusKm}km of the ${state.data.center.name}`;

  list.innerHTML = visible.map((e) => renderEntryCardHtml(e, state.data)).join("");
  bindInterestSelects(list);
}

bindInterestControls();
document.addEventListener("wpg-interests-changed", render);

loadEntries("data/entries.json")
  .then((data) => {
    state.data = data;
    renderFilters(data);
    render();
  })
  .catch((err) => {
    document.getElementById("resource-list").textContent =
      "Couldn't load resource data: " + err.message;
  });
