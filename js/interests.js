// Personal interest overlay. Entirely client-side (localStorage) — nothing
// here is ever sent anywhere or committed to the repo. Export/import lets
// someone carry their marks between devices as a plain JSON file.

const INTEREST_KEY = "wpg-interests";
const INTEREST_STATUSES = ["committed", "considering", "interested", "ignore"];

function getAllInterests() {
  try {
    return JSON.parse(localStorage.getItem(INTEREST_KEY) || "{}");
  } catch {
    return {};
  }
}

function getInterest(id) {
  return getAllInterests()[id] || null;
}

function setInterest(id, status) {
  const all = getAllInterests();
  if (status) {
    all[id] = status;
  } else {
    delete all[id];
  }
  localStorage.setItem(INTEREST_KEY, JSON.stringify(all));
  document.dispatchEvent(new CustomEvent("wpg-interests-changed"));
}

function exportInterests() {
  const blob = new Blob([JSON.stringify(getAllInterests(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wpg-interests.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** mode: "merge" (default) keeps existing marks not present in the imported
 *  file; "replace" discards them first. */
function importInterests(jsonText, mode = "merge") {
  const incoming = JSON.parse(jsonText);
  const validEntries = Object.entries(incoming).filter(([, status]) =>
    INTEREST_STATUSES.includes(status)
  );
  const next = mode === "replace" ? {} : getAllInterests();
  validEntries.forEach(([id, status]) => {
    next[id] = status;
  });
  localStorage.setItem(INTEREST_KEY, JSON.stringify(next));
  document.dispatchEvent(new CustomEvent("wpg-interests-changed"));
  return validEntries.length;
}

function bindInterestControls() {
  const exportBtn = document.getElementById("export-interests");
  const importInput = document.getElementById("import-interests");
  if (exportBtn) exportBtn.addEventListener("click", exportInterests);
  if (importInput) {
    importInput.addEventListener("change", async () => {
      const file = importInput.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const count = importInterests(text, "merge");
        alert(`Imported ${count} interest mark${count === 1 ? "" : "s"}.`);
      } catch (err) {
        alert("Couldn't import that file: " + err.message);
      }
      importInput.value = "";
    });
  }
}

function interestSelectHtml(entryId) {
  const current = getInterest(entryId) || "";
  const options = ["", ...INTEREST_STATUSES]
    .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s || "—"}</option>`)
    .join("");
  return `<select class="interest-select" data-entry-id="${entryId}">${options}</select>`;
}

function bindInterestSelects(container) {
  container.querySelectorAll(".interest-select").forEach((select) => {
    select.addEventListener("change", () => {
      setInterest(select.dataset.entryId, select.value || null);
      select.closest(".resource-card")?.classList.toggle("has-interest", !!select.value);
    });
  });
}
