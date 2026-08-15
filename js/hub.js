import { PLATFORM_LIST, CATEGORY_LABELS, SUGGESTED_TOOLS, SUITE_TOOLS } from "./platforms.js?v=2.4.0";

const platformGrid = document.getElementById("platformGrid");
const toolRoadmap = document.getElementById("toolRoadmap");
const suiteTools = document.getElementById("suiteTools");

if (suiteTools) {
  const heading = document.createElement("h2");
  heading.className = "section-title";
  heading.textContent = "Suite tools";
  suiteTools.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "suite-cards";

  for (const tool of SUITE_TOOLS) {
    const card = document.createElement("a");
    card.className = "suite-card";
    card.href = tool.href;
    card.style.setProperty("--card-accent", tool.accent);
    card.style.setProperty("--card-accent-rgb", tool.accentRgb);
    card.innerHTML = `
      <span class="suite-card__icon" aria-hidden="true">${tool.icon}</span>
      <span class="suite-card__body">
        <span class="suite-card__name">${tool.name}</span>
        <span class="suite-card__desc">${tool.description}</span>
      </span>
      <span class="suite-card__cta">Open →</span>
    `;
    grid.appendChild(card);
  }

  suiteTools.appendChild(grid);
}

const grouped = PLATFORM_LIST.reduce((acc, platform) => {
  const key = platform.category;
  if (!acc[key]) acc[key] = [];
  acc[key].push(platform);
  return acc;
}, {});

const categoryOrder = ["marketplace", "quickcommerce", "logistics", "dtc", "b2b", "utility"];

for (const category of categoryOrder) {
  const items = grouped[category];
  if (!items?.length) continue;

  const section = document.createElement("section");
  section.className = "platform-section";
  section.innerHTML = `<h2 class="section-title">${CATEGORY_LABELS[category] || category}</h2>`;

  const grid = document.createElement("div");
  grid.className = "platform-cards";

  for (const p of items) {
    const card = document.createElement("a");
    card.className = "platform-card";
    card.href = `crop.html?p=${encodeURIComponent(p.id)}`;
    card.style.setProperty("--card-accent", p.accent);
    card.style.setProperty("--card-accent-rgb", p.accentRgb);
    card.innerHTML = `
      <span class="platform-card__icon" aria-hidden="true">${p.icon}</span>
      <span class="platform-card__body">
        <span class="platform-card__name">${p.name}</span>
        <span class="platform-card__tagline">${p.tagline}</span>
      </span>
      <span class="platform-card__arrow" aria-hidden="true">→</span>
    `;
    grid.appendChild(card);
  }

  section.appendChild(grid);
  platformGrid.appendChild(section);
}

const roadmapCategories = {
  fulfillment: "Fulfillment",
  shipping: "Shipping",
  catalog: "Catalog",
  finance: "Finance",
};

for (const tool of SUGGESTED_TOOLS) {
  const card = document.createElement("article");
  card.className = "roadmap-card";
  card.innerHTML = `
    <span class="roadmap-card__badge">${roadmapCategories[tool.category] || tool.category}</span>
    <h3 class="roadmap-card__title">${tool.name}</h3>
    <p class="roadmap-card__desc">${tool.description}</p>
    <span class="roadmap-card__status">Coming soon</span>
  `;
  toolRoadmap.appendChild(card);
}
