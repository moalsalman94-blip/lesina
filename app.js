/* =========================================================
   Lesina Cosmetics — store logic
   لتعديل الأسعار أو الصور أو الروايح: عدّلي CONFIG و SCENTS و BUNDLE_ITEMS و PRODUCTS فقط
   ========================================================= */

const CONFIG = {
  currency: "د.أ",
  // رقم واتساب لاستقبال الطلبات بصيغة دولية بدون +
  whatsappNumber: "962790335444",
  // رسوم التوصيل بالدينار. null = تُحدَّد عند تأكيد الطلب، 0 = مجاني
  deliveryFee: null,
};

// الروايح المتوفرة. swatch = لون الدائرة بجانب اسم الريحة
const SCENTS = {
  aster: { name: "Aster", swatch: "#b51f3e" },
  lily: { name: "Lily", swatch: "#c99a3b" },
  camellia: { name: "Camellia", swatch: "#5f7a2c" },
};

// محتويات البكج بترتيب الاستعمال. الصورة لكل ريحة: images/<image>-<scent>.svg
// لما توصل الصور الحقيقية، حطيها بنفس الأسماء (أو غيّري الامتداد هون)
const BUNDLE_ITEMS = [
  { key: "shower-gel", name: "شاور جل", en: "Shower Gel", desc: "رغوة ناعمة بترطّب البشرة وبتنعّمها من أول خطوة.", tag: "فيتامين E و B5" },
  { key: "body-scrub", name: "سكرب الجسم", en: "Body Scrub", desc: "بيزيل الخلايا الميتة وبينقّي البشرة، وبيحسّن امتصاص منتجات العناية.", tag: "فيتامين E" },
  { key: "body-butter", name: "زبدة الجسم", en: "Body Butter", desc: "زبدة الشيا وزبدة الكاكاو لترطيب عميق وطويل الأمد ومرونة للجلد.", tag: "فيتامين E و B5" },
  { key: "body-splash", name: "بودي سبلاش", en: "Body Splash", desc: "رشّة بتعطي راحة وانتعاش فوري، وبتحسّن مظهر البشرة وإشراقتها.", tag: "فيتامين E و B5" },
];
const imageFor = (itemKey, scent) => `images/${itemKey}-${scent}.svg`;

// المنتجات القابلة للشراء
const PRODUCTS = {
  bundle: { id: "bundle", name: "بكج ليسينا الكامل", price: 25, coverItem: "body-splash" },
};

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Number(n.toFixed(2))} ${CONFIG.currency}`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- State ---------- */
// cart lines are keyed "<productId>:<scent>"
const STORAGE_KEY = "lesina_cart_v2";
let currentScent = "aster";
let cart = loadCart();

const parseKey = (key) => { const [id, scent] = key.split(":"); return { id, scent, product: PRODUCTS[id] }; };

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return Object.fromEntries(Object.entries(data).filter(([key, q]) => {
      const { product, scent } = parseKey(key);
      return product && SCENTS[scent] && Number.isInteger(q) && q > 0;
    }));
  } catch {
    return {};
  }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
}

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartSubtotal = () => Object.entries(cart).reduce((sum, [key, q]) => sum + parseKey(key).product.price * q, 0);
const cartTotal = () => cartSubtotal() + (CONFIG.deliveryFee || 0);

function addToCart(id, scent, qty = 1) {
  if (!PRODUCTS[id] || !SCENTS[scent]) return;
  const key = `${id}:${scent}`;
  cart[key] = Math.min(20, (cart[key] || 0) + qty);
  saveCart();
  renderCart();
  const btn = $("#cartOpen");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  toast(`انضاف ${PRODUCTS[id].name} (${SCENTS[scent].name}) للسلة`);
}
function setQty(key, qty) {
  if (qty <= 0) delete cart[key];
  else cart[key] = Math.min(20, qty);
  saveCart();
  renderCart();
}

/* ---------- Rendering ---------- */
function scentButtons() {
  return Object.entries(SCENTS).map(([key, s]) => `
    <button type="button" class="scent" data-scent="${key}" aria-pressed="${key === currentScent}" style="--swatch:${s.swatch}">
      <span class="scent__dot"></span>${s.name}
    </button>`).join("");
}

function setScent(scent) {
  if (!SCENTS[scent] || scent === currentScent) return;
  currentScent = scent;
  $$("[data-scent]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.scent === scent));
  $$("[data-item-img]").forEach((img) => { img.src = imageFor(img.dataset.itemImg, scent); });
  $("#bundleScentName").textContent = SCENTS[scent].name;
}

function renderHero() {
  // order chosen for the composition: tall pieces first
  const order = ["shower-gel", "body-splash", "body-scrub", "body-butter"];
  $("#heroCluster").innerHTML = order.map((k) => {
    const item = BUNDLE_ITEMS.find((i) => i.key === k);
    return `<img data-item-img="${k}" src="${imageFor(k, currentScent)}" alt="${escapeHTML(item.name)}">`;
  }).join("");
}

function renderBundle() {
  const p = PRODUCTS.bundle;
  $("#bundleCard").innerHTML = `
    <div class="bundle__media">
      ${BUNDLE_ITEMS.map((i) => `<img data-item-img="${i.key}" src="${imageFor(i.key, currentScent)}" alt="${escapeHTML(i.name)}" loading="lazy">`).join("")}
    </div>
    <div class="bundle__info">
      <h3>${escapeHTML(p.name)}</h3>
      <ul class="bundle__list">${BUNDLE_ITEMS.map((i) => `<li>${escapeHTML(i.name)}</li>`).join("")}</ul>
      <div>
        <p class="bundle__scent-label">الريحة: <span id="bundleScentName" dir="ltr">${SCENTS[currentScent].name}</span></p>
      </div>
      <div class="scent-picker" data-scent-picker></div>
      <div class="price">${p.price} <small>${CONFIG.currency}</small></div>
      <div class="bundle__buy">
        <div class="qty" id="bundleQty">
          <button type="button" data-step="1" aria-label="زيادة">+</button>
          <span>1</span>
          <button type="button" data-step="-1" aria-label="إنقاص">−</button>
        </div>
        <button class="btn btn--primary" id="bundleAdd">أضيفي للسلة</button>
      </div>
    </div>`;

  let qty = 1;
  const qtyEl = $("#bundleQty span");
  $("#bundleQty").addEventListener("click", (e) => {
    const step = Number(e.target.dataset.step);
    if (!step) return;
    qty = Math.max(1, Math.min(20, qty + step));
    qtyEl.textContent = qty;
  });
  $("#bundleAdd").addEventListener("click", () => {
    addToCart(p.id, currentScent, qty);
    qty = 1; qtyEl.textContent = 1;
  });
}

function renderSteps() {
  $("#steps").innerHTML = BUNDLE_ITEMS.map((i, n) => `
    <article class="step">
      <div class="step__img">
        <img data-item-img="${i.key}" src="${imageFor(i.key, currentScent)}" alt="${escapeHTML(i.name)}" loading="lazy">
        <span class="step__num">${n + 1}</span>
      </div>
      <div class="step__body">
        <span class="en">${i.en}</span>
        <h3>${escapeHTML(i.name)}</h3>
        <p>${escapeHTML(i.desc)}</p>
        <span class="step__tag">${escapeHTML(i.tag)}</span>
      </div>
    </article>`).join("");
}

function deliveryLabel() {
  if (CONFIG.deliveryFee === null) return "يُحدَّد عند التأكيد";
  return CONFIG.deliveryFee === 0 ? "مجاني" : money(CONFIG.deliveryFee);
}

function renderCart() {
  $("#cartCount").textContent = cartCount();
  const keys = Object.keys(cart);
  const body = $("#cartItems");

  if (!keys.length) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty__logo">Lesina</div>
        <p>سلتك فاضية لسا</p>
        <button class="btn btn--primary" data-add-current>أضيفي البكج</button>
      </div>`;
    $("#cartFoot").hidden = true;
    return;
  }

  $("#cartFoot").hidden = false;
  body.innerHTML = keys.map((key) => {
    const { product, scent } = parseKey(key);
    return `
      <div class="cart-item" data-key="${key}">
        <img src="${imageFor(product.coverItem, scent)}" alt="">
        <div>
          <h4>${escapeHTML(product.name)}</h4>
          <div class="meta">الريحة: <b dir="ltr">${SCENTS[scent].name}</b> · ${money(product.price)}</div>
          <div class="qty qty--sm">
            <button type="button" data-cart-step="1" aria-label="زيادة">+</button>
            <span>${cart[key]}</span>
            <button type="button" data-cart-step="-1" aria-label="إنقاص">−</button>
          </div>
        </div>
        <button class="remove" type="button" data-remove>حذف</button>
      </div>`;
  }).join("");

  $("#cartSubtotal").textContent = money(cartSubtotal());
  $("#cartDelivery").textContent = deliveryLabel();
  $("#cartTotal").textContent = money(cartTotal());
}

const lineLabel = (key) => { const { product, scent } = parseKey(key); return `${product.name} (${SCENTS[scent].name})`; };

function renderSummary() {
  const lines = Object.entries(cart).map(([key, q]) =>
    `<div class="row"><span>${escapeHTML(lineLabel(key))} × ${q}</span><span>${money(parseKey(key).product.price * q)}</span></div>`
  ).join("");
  $("#orderSummary").innerHTML = `${lines}
    <div class="row muted"><span>التوصيل</span><span>${deliveryLabel()}</span></div>
    <div class="row total"><span>الإجمالي</span><span>${money(cartTotal())}</span></div>`;
}

/* ---------- Drawer / modal ---------- */
function openCart() {
  $("#drawer").classList.add("is-open");
  $("#overlay").classList.add("is-open");
  $("#drawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#drawer").classList.remove("is-open");
  $("#overlay").classList.remove("is-open");
  $("#drawer").setAttribute("aria-hidden", "true");
}
function openModal() {
  if (!cartCount()) return;
  renderSummary();
  $("#checkoutView").hidden = false;
  $("#successView").hidden = true;
  $("#modal").classList.add("is-open");
  $("#modal").setAttribute("aria-hidden", "false");
}
function closeModal() {
  $("#modal").classList.remove("is-open");
  $("#modal").setAttribute("aria-hidden", "true");
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2400);
}

/* ---------- Checkout ---------- */
function handleCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  let valid = true;

  $$("[required]", form).forEach((f) => {
    const ok = f.name === "phone"
      ? /^(\+?962|0)7[789]\d{7}$/.test(f.value.replace(/[\s-]/g, ""))
      : f.value.trim() !== "";
    f.classList.toggle("invalid", !ok);
    if (!ok) valid = false;
  });
  if (!valid) { toast("عبّي الحقول المعلّمة، ورقم الهاتف بصيغة 07XXXXXXXX"); return; }

  const lines = Object.entries(cart).map(([key, q]) => `• ${lineLabel(key)} × ${q} = ${money(parseKey(key).product.price * q)}`);
  const message = [
    "طلب جديد من متجر Lesina",
    "",
    ...lines,
    `التوصيل: ${deliveryLabel()}`,
    `الإجمالي: ${money(cartTotal())}`,
    "",
    `الاسم: ${data.name}`,
    `الهاتف: ${data.phone}`,
    `المدينة: ${data.city}`,
    `العنوان: ${data.address}`,
    data.notes ? `ملاحظات: ${data.notes}` : null,
  ].filter((l) => l !== null).join("\n");

  $("#whatsappLink").href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;

  cart = {};
  saveCart();
  renderCart();
  form.reset();
  closeCart();
  $("#checkoutView").hidden = true;
  $("#successView").hidden = false;
}

/* ---------- Init ---------- */
function init() {
  renderHero();
  renderBundle();
  renderSteps();
  renderCart();
  $$("[data-scent-picker]").forEach((el) => { el.innerHTML = scentButtons(); });
  $("#year").textContent = new Date().getFullYear();

  document.addEventListener("click", (e) => {
    const scentBtn = e.target.closest("[data-scent]");
    if (scentBtn) return setScent(scentBtn.dataset.scent);
    if (e.target.closest("[data-add-current]")) addToCart("bundle", currentScent);
  });

  $("#cartItems").addEventListener("click", (e) => {
    const item = e.target.closest(".cart-item");
    if (!item) return;
    const key = item.dataset.key;
    if (e.target.closest("[data-remove]")) return setQty(key, 0);
    const step = Number(e.target.dataset.cartStep);
    if (step) setQty(key, cart[key] + step);
  });

  $("#cartOpen").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", openModal);
  $("#modalClose").addEventListener("click", closeModal);
  $("#successClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#checkoutForm").addEventListener("submit", handleCheckout);
  $("#checkoutForm").addEventListener("input", (e) => e.target.classList.remove("invalid"));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeCart(); } });

  const menuBtn = $("#menuBtn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => { nav.classList.toggle("is-open"); menuBtn.classList.toggle("is-open"); });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => { nav.classList.remove("is-open"); menuBtn.classList.remove("is-open"); }));
}

init();
