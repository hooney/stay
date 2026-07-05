import { getSupabase, joinNotes, splitNotes } from "./supabase-client.js";

let supabase;
const state = {
  categories: [],
  items: [],
  selectedCategoryId: null,
  editingItemId: null
};

const loginPanel = document.querySelector("#loginPanel");
const cmsPanel = document.querySelector("#cmsPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const categoryList = document.querySelector("#categoryList");
const itemList = document.querySelector("#itemList");
const itemsTitle = document.querySelector("#itemsTitle");
const itemCount = document.querySelector("#itemCount");
const addCategoryButton = document.querySelector("#addCategoryButton");
const newItemButton = document.querySelector("#newItemButton");
const itemDialog = document.querySelector("#itemDialog");
const itemForm = document.querySelector("#itemForm");
const deleteItemButton = document.querySelector("#deleteItemButton");

init();

async function init() {
  try {
    supabase = getSupabase();
  } catch (error) {
    loginMessage.textContent = error.message;
    loginForm.querySelectorAll("input, button").forEach((field) => {
      field.disabled = true;
    });
    return;
  }

  bindEvents();
  const { data } = await supabase.auth.getSession();
  updateAuthUI(Boolean(data.session));
  if (data.session) await loadAll();

  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(Boolean(session));
    if (session) loadAll();
  });
}

function bindEvents() {
  loginForm.addEventListener("submit", onLogin);
  logoutButton.addEventListener("click", () => supabase.auth.signOut());
  addCategoryButton.addEventListener("click", onAddCategory);
  newItemButton.addEventListener("click", () => openItemDialog());
  itemForm.addEventListener("submit", onSaveItem);
  deleteItemButton.addEventListener("click", onDeleteItem);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => itemDialog.close());
  });
}

async function onLogin(event) {
  event.preventDefault();
  loginMessage.textContent = "";
  const formData = new FormData(loginForm);
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  loginForm.reset();
}

function updateAuthUI(isSignedIn) {
  loginPanel.classList.toggle("hidden", isSignedIn);
  cmsPanel.classList.toggle("hidden", !isSignedIn);
  logoutButton.classList.toggle("hidden", !isSignedIn);
}

async function loadAll() {
  const [categoriesResult, itemsResult] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order", { ascending: true }),
    supabase.from("menu_items").select("*").order("sort_order", { ascending: true })
  ]);

  if (categoriesResult.error) return showError(categoriesResult.error);
  if (itemsResult.error) return showError(itemsResult.error);

  state.categories = categoriesResult.data ?? [];
  state.items = itemsResult.data ?? [];
  state.selectedCategoryId ||= state.categories[0]?.id ?? null;
  renderCategories();
  renderItems();
}

function renderCategories() {
  categoryList.innerHTML = state.categories
    .map((category) => {
      const active = category.id === state.selectedCategoryId ? "active" : "";
      return `
        <button class="category-row ${active}" type="button" data-category-id="${category.id}">
          <span>
            <strong>${escapeHtml(category.name_ko)}</strong>
            <small>${escapeHtml(category.name_en || category.slug)}</small>
          </span>
          <em>${category.is_active ? "노출" : "숨김"}</em>
        </button>
      `;
    })
    .join("");

  categoryList.querySelectorAll("[data-category-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCategoryId = button.dataset.categoryId;
      renderCategories();
      renderItems();
    });
  });
}

function renderItems() {
  const category = state.categories.find((entry) => entry.id === state.selectedCategoryId);
  const items = state.items.filter((item) => item.category_id === state.selectedCategoryId);
  itemsTitle.textContent = category ? category.name_ko : "메뉴";
  itemCount.textContent = `${items.length}개`;

  itemList.innerHTML = items.length
    ? items.map(renderItemRow).join("")
    : '<div class="empty-state">이 카테고리에 등록된 메뉴가 없습니다.</div>';

  itemList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openItemDialog(button.dataset.edit));
  });

  itemList.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => updateItem(button.dataset.toggle, { is_published: button.dataset.value !== "true" }));
  });

  itemList.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => moveItem(button.dataset.move, Number(button.dataset.direction)));
  });
}

function renderItemRow(item, index) {
  const notes = Array.isArray(item.flavor_notes) ? item.flavor_notes.join(" / ") : "";
  return `
    <article class="admin-item">
      <button type="button" class="drag-button" data-move="${item.id}" data-direction="-1" title="위로" aria-label="위로" ${index === 0 ? "disabled" : ""}>↑</button>
      <button type="button" class="drag-button" data-move="${item.id}" data-direction="1" title="아래로" aria-label="아래로">↓</button>
      <div>
        <strong>${escapeHtml([item.code, item.name_ko].filter(Boolean).join(". "))}</strong>
        <p>${escapeHtml(notes || item.summary || "")}</p>
      </div>
      <span>${Number(item.price).toFixed(1)}</span>
      <button type="button" class="small-button" data-toggle="${item.id}" data-value="${item.is_published}">
        ${item.is_published ? "노출" : "숨김"}
      </button>
      <button type="button" data-edit="${item.id}">편집</button>
    </article>
  `;
}

async function onAddCategory() {
  const name = window.prompt("카테고리 이름을 입력하세요. 예: COFFEE");
  if (!name) return;

  const slug = name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
  const { error } = await supabase.from("menu_categories").insert({
    slug,
    name_ko: name,
    name_en: name.toUpperCase(),
    sort_order: state.categories.length + 1
  });

  if (error) return showError(error);
  await loadAll();
}

function openItemDialog(itemId = null) {
  const item = state.items.find((entry) => entry.id === itemId);
  state.editingItemId = itemId;
  itemForm.reset();
  itemForm.elements.category_id.innerHTML = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name_ko)}</option>`)
    .join("");

  if (item) {
    for (const [key, value] of Object.entries(item)) {
      if (!itemForm.elements[key]) continue;
      if (key === "flavor_notes") itemForm.elements[key].value = joinNotes(value);
      else if (itemForm.elements[key].type === "checkbox") itemForm.elements[key].checked = Boolean(value);
      else itemForm.elements[key].value = value ?? "";
    }
  } else {
    itemForm.elements.category_id.value = state.selectedCategoryId ?? state.categories[0]?.id ?? "";
    itemForm.elements.is_published.checked = true;
  }

  deleteItemButton.classList.toggle("hidden", !item);
  itemDialog.showModal();
}

async function onSaveItem(event) {
  event.preventDefault();
  const formData = new FormData(itemForm);
  const values = Object.fromEntries(formData.entries());
  const payload = {
    category_id: values.category_id,
    code: nullable(values.code),
    name_ko: values.name_ko,
    name_en: nullable(values.name_en),
    price: Number(values.price),
    roasting_point: nullable(values.roasting_point),
    summary: nullable(values.summary),
    description: nullable(values.description),
    origin: nullable(values.origin),
    farm: nullable(values.farm),
    altitude: nullable(values.altitude),
    variety: nullable(values.variety),
    processing: nullable(values.processing),
    image_url: nullable(values.image_url),
    flavor_notes: splitNotes(values.flavor_notes),
    is_published: itemForm.elements.is_published.checked
  };

  let result;
  if (state.editingItemId) {
    result = await supabase.from("menu_items").update(payload).eq("id", state.editingItemId);
  } else {
    const currentItems = state.items.filter((item) => item.category_id === payload.category_id);
    result = await supabase.from("menu_items").insert({ ...payload, sort_order: currentItems.length + 1 });
  }

  if (result.error) return showError(result.error);
  itemDialog.close();
  state.selectedCategoryId = payload.category_id;
  await loadAll();
}

async function onDeleteItem() {
  if (!state.editingItemId || !window.confirm("이 메뉴를 삭제할까요?")) return;
  const { error } = await supabase.from("menu_items").delete().eq("id", state.editingItemId);
  if (error) return showError(error);
  itemDialog.close();
  await loadAll();
}

async function updateItem(id, payload) {
  const { error } = await supabase.from("menu_items").update(payload).eq("id", id);
  if (error) return showError(error);
  await loadAll();
}

async function moveItem(id, direction) {
  const items = state.items.filter((item) => item.category_id === state.selectedCategoryId);
  const index = items.findIndex((item) => item.id === id);
  const target = items[index + direction];
  if (!target) return;

  const current = items[index];
  const [currentResult, targetResult] = await Promise.all([
    supabase.from("menu_items").update({ sort_order: target.sort_order }).eq("id", current.id),
    supabase.from("menu_items").update({ sort_order: current.sort_order }).eq("id", target.id)
  ]);
  if (currentResult.error) return showError(currentResult.error);
  if (targetResult.error) return showError(targetResult.error);
  await loadAll();
}

function showError(error) {
  window.alert(error.message ?? String(error));
}

function nullable(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
