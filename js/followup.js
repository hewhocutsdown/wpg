function render(data) {
  const list = document.getElementById("resource-list");
  const count = document.getElementById("resource-count");

  const flagged = data.entries
    .filter((e) => e.followUp)
    .sort((a, b) => a.metaCategory.localeCompare(b.metaCategory) || a.name.localeCompare(b.name));

  count.textContent = flagged.length
    ? `${flagged.length} of ${data.entries.length} entries need follow-up`
    : `All ${data.entries.length} entries are complete — nothing to follow up on`;

  list.innerHTML = flagged.map((e) => renderEntryCardHtml(e, data)).join("");
  bindInterestSelects(list);
}

bindInterestControls();

loadEntries("data/entries.json")
  .then((data) => {
    document.addEventListener("wpg-interests-changed", () => render(data));
    render(data);
  })
  .catch((err) => {
    document.getElementById("resource-list").textContent =
      "Couldn't load resource data: " + err.message;
  });
