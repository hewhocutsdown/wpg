const TIME_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "upcoming", label: "Upcoming" },
];

const INTEREST_OPTIONS = [...INTEREST_STATUSES, "unset"];

const timelineState = {
  data: null,
  activeMeta: new Set(),
  activeCategories: new Set(),
  activeTime: new Set(),
  activeAmenities: new Set(),
  activeInterest: new Set(),
};

function categoryOptionsForActiveMeta() {
  const metas = timelineState.activeMeta.size
    ? timelineState.data.metaCategories.filter((m) => timelineState.activeMeta.has(m.id))
    : timelineState.data.metaCategories;
  return [...new Set(metas.flatMap((m) => m.categories))];
}

function renderCategoryFilters() {
  const options = categoryOptionsForActiveMeta();
  for (const c of [...timelineState.activeCategories]) {
    if (!options.includes(c)) timelineState.activeCategories.delete(c);
  }
  renderFilterButtons(document.getElementById("category-filters"), options, timelineState.activeCategories, {
    onChange: render,
  });
}

function renderFilters(data) {
  const metaOptions = data.metaCategories.map((m) => ({ value: m.id, label: m.name }));
  renderFilterButtons(document.getElementById("metacategory-filters"), metaOptions, timelineState.activeMeta, {
    onChange: () => {
      renderCategoryFilters();
      render();
    },
  });

  renderCategoryFilters();

  renderFilterButtons(document.getElementById("time-filters"), TIME_OPTIONS, timelineState.activeTime, {
    multi: false,
    onChange: render,
  });

  renderFilterButtons(document.getElementById("amenity-filters"), data.amenities, timelineState.activeAmenities, {
    onChange: render,
  });

  renderFilterButtons(document.getElementById("interest-filters"), INTEREST_OPTIONS, timelineState.activeInterest, {
    onChange: render,
  });
}

function matchesFilters(entry) {
  if (!withinRadius(entry, timelineState.data.radiusKm)) return false;
  if (timelineState.activeMeta.size && !timelineState.activeMeta.has(entry.metaCategory)) return false;
  if (timelineState.activeCategories.size && !timelineState.activeCategories.has(entry.category)) return false;

  const timeScope = [...timelineState.activeTime][0] || null;
  if (!matchesTimeScope(entry, timeScope, new Date())) return false;

  if (timelineState.activeAmenities.size) {
    const has = [...timelineState.activeAmenities].every((a) => entry.amenities.includes(a));
    if (!has) return false;
  }

  if (timelineState.activeInterest.size) {
    const interest = getInterest(entry.id) || "unset";
    if (!timelineState.activeInterest.has(interest)) return false;
  }

  return true;
}

function formatDateHeading(date, today) {
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function render() {
  const container = document.getElementById("timeline");
  const count = document.getElementById("resource-count");
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const upcoming = timelineState.data.entries
    .filter(matchesFilters)
    .map((entry) => ({ entry, next: nextOccurrence(entry, today) }))
    .filter((x) => x.next !== null);

  count.textContent = `${upcoming.length} location${upcoming.length === 1 ? "" : "s"} ongoing or upcoming`;

  const ongoing = upcoming.filter((x) => x.next.ongoing);
  const dated = upcoming.filter((x) => !x.next.ongoing);

  const dateGroups = new Map();
  dated.forEach((x) => {
    const day = startOfDay(x.next.date);
    const key = day.toDateString();
    if (!dateGroups.has(key)) dateGroups.set(key, { date: day, items: [] });
    dateGroups.get(key).items.push(x.entry);
  });
  const sortedGroups = [...dateGroups.values()].sort((a, b) => a.date - b.date);

  let html = "";
  if (ongoing.length) {
    html += `
      <div class="timeline-group">
        <div class="timeline-group-heading ongoing">Ongoing now</div>
        <div class="resource-list">
          ${ongoing.map((x) => renderEntryCardHtml(x.entry, timelineState.data)).join("")}
        </div>
      </div>
    `;
  }
  sortedGroups.forEach((group) => {
    html += `
      <div class="timeline-group">
        <div class="timeline-group-heading">${formatDateHeading(group.date, today)}</div>
        <div class="resource-list">
          ${group.items.map((e) => renderEntryCardHtml(e, timelineState.data)).join("")}
        </div>
      </div>
    `;
  });

  container.innerHTML = html || "<p>Nothing matches those filters.</p>";
  bindInterestSelects(container);
}

bindInterestControls();
document.addEventListener("wpg-interests-changed", render);

loadEntries("data/entries.json")
  .then((data) => {
    timelineState.data = data;
    renderFilters(data);
    render();
  })
  .catch((err) => {
    document.getElementById("timeline").textContent = "Couldn't load resource data: " + err.message;
  });
