import { formatPrice, getSupabase } from "./supabase-client.js";

const tabs = document.querySelector("#categoryTabs");
const content = document.querySelector("#menuContent");

init();

async function init() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("menu_categories")
      .select("id, slug, name_ko, name_en, description, menu_items(*)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "menu_items", ascending: true });

    if (error) throw error;

    const categories = (data ?? [])
      .map((category) => ({
        ...category,
        menu_items: (category.menu_items ?? []).filter((item) => item.is_published)
      }))
      .filter((category) => category.menu_items.length > 0);

    renderTabs(categories);
    renderMenu(categories);
  } catch (error) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderTabs(categories) {
  tabs.innerHTML = categories
    .map(
      (category) =>
        `<a href="#${category.slug}">${escapeHtml(category.name_en || category.name_ko)}</a>`
    )
    .join("");
}

function renderMenu(categories) {
  if (!categories.length) {
    content.innerHTML = '<div class="empty-state">현재 노출 중인 메뉴가 없습니다.</div>';
    return;
  }

  content.innerHTML = categories
    .map(
      (category) => `
        <section id="${escapeHtml(category.slug)}" class="menu-section">
          <div class="section-heading">
            <p class="eyebrow">${escapeHtml(category.name_en || "")}</p>
            <h2>${escapeHtml(category.name_ko)}</h2>
            ${category.description ? `<p>${escapeHtml(category.description)}</p>` : ""}
          </div>
          <div class="menu-list">
            ${category.menu_items.map(renderItem).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderItem(item) {
  const notes = Array.isArray(item.flavor_notes) ? item.flavor_notes : [];
  const meta = [
    ["REGION", item.origin],
    ["FARM", item.farm],
    ["ALTITUDE", item.altitude],
    ["VARIETY", item.variety],
    ["PROCESSING", item.processing]
  ].filter(([, value]) => value);

  return `
    <article class="menu-card">
      ${item.image_url ? `<img src="${escapeAttribute(item.image_url)}" alt="" loading="lazy" />` : ""}
      <div class="menu-card-body">
        <div class="menu-card-title">
          <div>
            <span class="menu-code">${escapeHtml(item.code || "")}</span>
            <h3>${escapeHtml(item.name_ko)}</h3>
            ${item.name_en ? `<p>${escapeHtml(item.name_en)}</p>` : ""}
          </div>
          <strong>${formatPrice(item.price)}</strong>
        </div>
        ${item.summary ? `<p class="summary">${escapeHtml(item.summary)}</p>` : ""}
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        ${notes.length ? `<div class="chips">${notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("")}</div>` : ""}
        ${item.roasting_point ? `<p class="roast">ROASTING POINT <b>${escapeHtml(item.roasting_point)}</b></p>` : ""}
        ${
          meta.length
            ? `<dl class="meta-list">${meta
                .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
                .join("")}</dl>`
            : ""
        }
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
