import { PLATFORM_LIST, CATEGORY_LABELS, SUGGESTED_TOOLS } from "./platforms.js";

const platformGrid = document.getElementById("platformGrid");
const toolRoadmap = document.getElementById("toolRoadmap");

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
    card.href = `cropper.html?p=${encodeURIComponent(p.id)}`;
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
