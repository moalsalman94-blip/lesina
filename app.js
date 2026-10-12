/* =========================================================
   LESINA Cosmetics — store logic
   لتعديل الأسعار أو الصور أو إضافة منتجات: عدّلي قسم CONFIG و PRODUCTS فقط
   ========================================================= */

const CONFIG = {
  currency: "د.أ",
  // رقم واتساب لاستقبال الطلبات بصيغة دولية بدون + (مثال: 962791234567)
  // إذا تُرك فارغاً، يتم عرض رسالة تأكيد فقط.
  whatsappNumber: "",
  // رسوم التوصيل بالدينار. null = تُحدَّد عند تأكيد الطلب
  deliveryFee: null,
};

// المنتجات الموجودة داخل البكج (لعرض المحتويات)
const BUNDLE_ITEMS = [
  { name: "شاور جل", en: "SHOWER GEL", image: "images/shower-gel.svg", desc: "رغوة ناعمة بتنظّف بلطف وبتترك ريحة منعشة على بشرتك." },
  { name: "سكرب الجسم", en: "BODY SCRUB", image: "images/scrub.svg", desc: "بيقشّر الخلايا الميتة وبيخلّي بشرتك ناعمة ومشرقة." },
  { name: "بودي سبلاش", en: "BODY SPLASH", image: "images/body-splash.svg", desc: "رشّة عطر خفيفة بتنعشك وبتدوم معك طول اليوم." },
  { name: "زبدة الجسم", en: "BODY BUTTER", image: "images/body-butter.svg", desc: "ترطيب غني وعميق بيحبس النعومة لساعات." },
];

// المنتجات القابلة للشراء
const PRODUCTS = {
  "lesina-bundle": {
    id: "lesina-bundle",
    name: "بكج ليسينا الكامل",
    price: 25,
    image: "images/shower-gel.svg",
    items: BUNDLE_ITEMS,
  },
};

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Number(n.toFixed(2))} ${CONFIG.currency}`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Cart state ---------- */
const STORAGE_KEY = "lesina_cart_v1";
let cart = loadCart();

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    // keep only known products with valid quantities
    return Object.fromEntries(Object.entries(data).filter(([id, q]) => PRODUCTS[id] && Number.isInteger(q) && q > 0));
  } catch {
    return {};
  }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
}

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartSubtotal = () => Object.entries(cart).reduce((sum, [id, q]) => sum + PRODUCTS[id].price * q, 0);
const cartTotal = () => cartSubtotal() + (CONFIG.deliveryFee || 0);

function addToCart(id, qty = 1) {
  if (!PRODUCTS[id]) return;
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  renderCart();
  const btn = $("#cartOpen");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  toast(`تمت إضافة ${PRODUCTS[id].name} للسلة 🛍️`);
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  saveCart();
  renderCart();
}

/* ---------- Rendering ---------- */
function renderBundle() {
  const p = PRODUCTS["lesina-bundle"];
  $("#bundleCard").innerHTML = `
    <div class="bundle__media">
      <span class="bundle__tag">4 منتجات</span>
      ${p.items.map((i) => `<img src="${i.image}" alt="${escapeHTML(i.name)}" loading="lazy">`).join("")}
    </div>
    <div class="bundle__info">
      <h3>${escapeHTML(p.name)}</h3>
      <p class="muted">روتين عناية متكامل بأربع خطوات، مثالي إلك أو كهدية لحدا بتحبيه.</p>
      <ul class="bundle__list">${p.items.map((i) => `<li>${escapeHTML(i.name)}</li>`).join("")}</ul>
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
    addToCart(p.id, qty);
    qty = 1; qtyEl.textContent = 1;
  });
}

function renderSteps() {
  $("#steps").innerHTML = BUNDLE_ITEMS.map((i, n) => `
    <article class="step reveal">
      <div class="step__img">
        <img src="${i.image}" alt="${escapeHTML(i.name)}" loading="lazy">
        <span class="step__num">${n + 1}</span>
      </div>
      <div class="step__body">
        <span class="en">${i.en}</span>
        <h3>${escapeHTML(i.name)}</h3>
        <p>${escapeHTML(i.desc)}</p>
      </div>
    </article>`).join("");
}

function deliveryLabel() {
  if (CONFIG.deliveryFee === null) return "يُحدَّد عند التأكيد";
  return CONFIG.deliveryFee === 0 ? "مجاني" : money(CONFIG.deliveryFee);
}

function renderCart() {
  $("#cartCount").textContent = cartCount();
  const ids = Object.keys(cart);
  const body = $("#cartItems");

  if (!ids.length) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🛍️</div>
        <p>سلتك فاضية لسا</p>
        <button class="btn btn--primary" data-add="lesina-bundle">أضيفي البكج</button>
      </div>`;
    $("#cartFoot").hidden = true;
    return;
  }

  $("#cartFoot").hidden = false;
  body.innerHTML = ids.map((id) => {
    const p = PRODUCTS[id];
    return `
      <div class="cart-item" data-id="${id}">
        <img src="${p.image}" alt="">
        <div>
          <h4>${escapeHTML(p.name)}</h4>
          <div class="price-sm">${money(p.price)}</div>
          <div class="qty qty--sm">
            <button type="button" data-cart-step="1" aria-label="زيادة">+</button>
            <span>${cart[id]}</span>
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

function renderSummary() {
  const lines = Object.entries(cart).map(([id, q]) =>
    `<div class="row"><span>${escapeHTML(PRODUCTS[id].name)} × ${q}</span><span>${money(PRODUCTS[id].price * q)}</span></div>`
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
  if (!valid) { toast("تأكدي من تعبئة كل الحقول بشكل صحيح"); return; }

  const lines = Object.entries(cart).map(([id, q]) => `• ${PRODUCTS[id].name} × ${q} = ${money(PRODUCTS[id].price * q)}`);
  const message = [
    "طلب جديد من متجر LESINA 🌸",
    "",
    ...lines,
    `التوصيل: ${deliveryLabel()}`,
    `الإجمالي: ${money(cartTotal())}`,
    "",
    `الاسم: ${data.name}`,
    `الهاتف: ${data.phone}`,
    `المدينة: ${data.city}`,
    `العنوان: ${data.address}`,
    data.notes ? `ملاحظات: ${data.notes}` : "",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");

  if (CONFIG.whatsappNumber) {
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

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
  renderBundle();
  renderSteps();
  renderCart();
  $("#year").textContent = new Date().getFullYear();

  // global "add to cart" buttons
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) addToCart(add.dataset.add);
  });

  // cart item controls
  $("#cartItems").addEventListener("click", (e) => {
    const item = e.target.closest(".cart-item");
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest("[data-remove]")) return setQty(id, 0);
    const step = Number(e.target.dataset.cartStep);
    if (step) setQty(id, Math.min(20, cart[id] + step));
  });

  $("#cartOpen").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", openModal);
  $("#modalClose").addEventListener("click", closeModal);
  $("#successClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#checkoutForm").addEventListener("submit", handleCheckout);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeCart(); } });

  // mobile menu
  const menuBtn = $("#menuBtn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => { nav.classList.toggle("is-open"); menuBtn.classList.toggle("is-open"); });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => { nav.classList.remove("is-open"); menuBtn.classList.remove("is-open"); }));

  // header shadow on scroll
  const header = $(".header");
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));
}

init();
