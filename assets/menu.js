import { formatPrice, getSupabase } from "./supabase-client.js";

const MENU_TYPES = ["coffee", "non-coffee", "dessert"];
const PAGE_LABELS = {
  coffee: "COFFEE",
  "non-coffee": "NON-COFFEE",
  dessert: "DESSERT"
};

const content = document.querySelector("#menuContent");
const detailDialog = document.querySelector("#itemDialog");
const detailTitle = document.querySelector("#detailTitle");
const detailBody = document.querySelector("#detailBody");
const detailCloseButton = document.querySelector("#detailCloseButton");
const mobileMenuButton = document.querySelector("#mobileMenuButton");
const mobileMenu = document.querySelector("#mobileMenu");

let currentItems = [];

init();

async function init() {
  const menuType = getMenuType();
  document.body.dataset.menuType = menuType;
  document.querySelectorAll("[data-menu-type-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.menuTypeLink === menuType);
  });

  mobileMenuButton.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
  detailCloseButton.addEventListener("click", () => closeDetail());
  detailDialog.addEventListener("click", (event) => {
    if (event.target === detailDialog) closeDetail();
  });
  detailDialog.addEventListener("close", () => document.body.classList.remove("no-scroll"));

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*, menu_items(*)")
      .eq("is_active", true)
      .eq("menu_type", menuType)
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "menu_items", ascending: true });

    if (error) throw error;

    const sections = (data ?? [])
      .map((section) => ({
        ...section,
        menu_items: (section.menu_items ?? []).filter((item) => item.is_published)
      }))
      .filter((section) => section.menu_items.length > 0);

    currentItems = sections.flatMap((section) => section.menu_items);
    renderMenu(menuType, sections);
  } catch (error) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function getMenuType() {
  const requested = new URLSearchParams(window.location.search).get("type");
  return MENU_TYPES.includes(requested) ? requested : "coffee";
}

function renderMenu(menuType, sections) {
  if (!sections.length) {
    content.innerHTML = '<div class="empty-state">현재 노출 중인 메뉴가 없습니다.</div>';
    return;
  }

  const first = sections[0];
  const pageTitle = first.page_title || PAGE_LABELS[menuType];
  const pageDescription = first.page_description || first.description || "";

  content.innerHTML = `
    <div class="${menuType === "coffee" ? "menu-stack" : "menu-split"}">
      <div class="menu-main-col">
        <section class="board-title">
          <h1>${escapeHtml(pageTitle)}</h1>
          ${pageDescription ? `<p>${escapeHtml(pageDescription)}</p>` : ""}
        </section>
        ${sections.map(renderSection).join("")}
      </div>
      ${menuType === "coffee" ? "" : renderBanners(sections)}
    </div>
  `;

  content.querySelectorAll("[data-item-id]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.itemId));
  });
}

function renderSection(section) {
  return `
    <section class="board-section">
      <h2>${escapeHtml(section.name_ko)}</h2>
      <div class="board-items" style="background-color: ${escapeAttribute(section.background_color || "#EFF4F5")}">
        <div class="board-columns">
          ${splitItems(section.menu_items).map((items) => `<ul>${items.map(renderMenuItem).join("")}</ul>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function splitItems(items) {
  if (items.length < 7) return [items];
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function renderMenuItem(item) {
  const title = [item.display_code ? item.code : "", item.name_ko].filter(Boolean).join(". ");
  const soldout = item.status === "soldout";
  const titleHtml = soldout ? `<del>${escapeHtml(title)}</del>` : escapeHtml(title);

  return `
    <li>
      <button class="board-item" type="button" data-item-id="${item.id}">
        <span class="flavor-bars" aria-hidden="true">
          <i style="background:${escapeAttribute(item.main_flavor_color || "#456D75")}"></i>
          <i style="background:${escapeAttribute(item.sub_flavor_color || item.main_flavor_color || "#78A9AC")}"></i>
        </span>
        <span class="item-copy">
          <strong>${titleHtml}${renderBadges(item)}</strong>
          ${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ""}
          ${item.summary ? `<em>${escapeHtml(item.summary)}</em>` : ""}
        </span>
        <span class="item-price">${formatPrice(item.price)}</span>
      </button>
    </li>
  `;
}

function renderBadges(item) {
  const badges = Array.isArray(item.badges) ? item.badges : [];
  const labels = {
    best: "BEST",
    limited: "LIMITED",
    signature: "SIGNATURE",
    onlyhot: "ONLY HOT",
    onlyice: "ONLY ICE"
  };
  const allBadges = [...badges];
  if (item.status === "soldout") allBadges.push("SOLD OUT");
  if (item.status === "coming") allBadges.push("COMING");

  return allBadges.length
    ? ` ${allBadges.map((badge) => `<b class="menu-badge">${escapeHtml(labels[badge] || badge)}</b>`).join("")}`
    : "";
}

function renderBanners(sections) {
  const banners = sections.filter((section) => section.banner_image_url);
  if (!banners.length) return "";

  return `
    <aside class="menu-banner-col">
      ${banners
        .map(
          (section) => `
            <figure>
              <img src="${escapeAttribute(section.banner_image_url)}" alt="${escapeAttribute(section.banner_image_alt || section.name_ko)}" loading="lazy" />
            </figure>
          `
        )
        .join("")}
    </aside>
  `;
}

function openDetail(itemId) {
  const item = currentItems.find((entry) => entry.id === itemId);
  if (!item) return;

  detailTitle.textContent = item.detail_title || [item.display_code ? item.code : "", item.name_ko].filter(Boolean).join(". ");
  detailBody.innerHTML = renderDetail(item);
  document.body.classList.add("no-scroll");
  detailDialog.showModal();
}

function closeDetail() {
  detailDialog.close();
  document.body.classList.remove("no-scroll");
}

function renderDetail(item) {
  const meta = [
    ["REGION 원산지", item.origin],
    ["FARM 농장/FARMER 농장주", item.farm],
    ["ALTITUDE 고도", item.altitude],
    ["VARIETY 품종", item.variety],
    ["PROCESSING 가공법", item.processing]
  ].filter(([, value]) => value);

  return `
    <article class="detail-content" style="--main-flavor:${escapeAttribute(item.main_flavor_color || "#456D75")}; --sub-flavor:${escapeAttribute(item.sub_flavor_color || "#78A9AC")}">
      ${item.detail_image_url || item.image_url ? `<img class="detail-hero" src="${escapeAttribute(item.detail_image_url || item.image_url)}" alt="" />` : ""}
      <div class="detail-text">
        ${item.description ? `<p>${escapeMultiline(item.description)}</p>` : ""}
        ${item.detail_body && item.detail_body !== item.description ? `<p>${escapeMultiline(item.detail_body)}</p>` : ""}
        ${item.detail_highlight ? `<strong class="color-txt">${escapeMultiline(item.detail_highlight)}</strong>` : ""}
      </div>
      ${
        meta.length
          ? `<ul class="detail-list detail-list-primary">${meta
              .map(([label, value]) => `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></li>`)
              .join("")}</ul>`
          : ""
      }
      <h3>SWC FLAVOR COLOR SYSTEM</h3>
      <div class="flavor-system">
        <div class="flavor-position" aria-hidden="true">
          <span></span>
          <span></span>
          <i></i>
        </div>
        <ul class="detail-list">
          ${item.roasting_point ? `<li><strong>ROASTING POINT 배전도</strong><span>${escapeHtml(item.roasting_point)}</span></li>` : ""}
          ${renderFlavorDetail(item)}
        </ul>
      </div>
    </article>
  `;
}

function renderFlavorDetail(item) {
  const ko = Array.isArray(item.flavor_notes) ? item.flavor_notes.join(", ") : "";
  const en = Array.isArray(item.flavor_notes_en) ? item.flavor_notes_en.join(", ") : "";
  if (!ko && !en) return "";

  return `
    <li>
      <strong>FLAVOR 향미</strong>
      <span>${escapeHtml(en)}${en && ko ? "<br />" : ""}${escapeHtml(ko)}</span>
    </li>
  `;
}

function escapeMultiline(value) {
  return escapeHtml(value).replaceAll("\n", "<br />");
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
