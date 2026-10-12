/* =========================================================
   Lesina Cosmetics — store logic
   لتعديل الأسعار أو الصور أو الروايح: عدّلي CONFIG و SCENTS و BUNDLE_ITEMS و PRODUCTS فقط
   ========================================================= */

const CONFIG = {
  currency: "د.أ",
  // رقم واتساب لاستقبال الطلبات بصيغة دولية بدون +
  whatsappNumber: "962790335444",
  // رسوم التوصيل بالدينار. null = تُحدَّد عند تأكيد الطلب، 0 = مجاني
  deliveryFee: 0,
};

// الروايح المتوفرة وألوان كل وحدة (deep/mid للخلفيات الغامقة، tint للخلفيات الفاتحة)
const SCENTS = {
  aster: { name: "Aster", numeral: "I", edition: "الإصدار الأحمر", deep: "#4f0c1d", mid: "#b51f3e", tint: "#f2dfdf" },
  lily: { name: "Lily", numeral: "II", edition: "الإصدار الذهبي", deep: "#4a3210", mid: "#b5862e", tint: "#f3e9d6" },
  camellia: { name: "Camellia", numeral: "III", edition: "الإصدار الأخضر", deep: "#223010", mid: "#5f7a2c", tint: "#e5ead9" },
};

// محتويات البكج بترتيب الاستعمال. الصورة لكل ريحة: images/<key>-<scent>.svg
const BUNDLE_ITEMS = [
  { key: "shower-gel", name: "شاور جل", en: "Shower Gel", desc: "رغوة ناعمة بترطّب البشرة وبتنعّمها، أول خطوة بالروتين.", tag: "فيتامين E و B5" },
  { key: "body-scrub", name: "سكرب الجسم", en: "Body Scrub", desc: "بيزيل الخلايا الميتة وبينقّي البشرة، وبيحضّرها لامتصاص أعمق للترطيب.", tag: "فيتامين E" },
  { key: "body-butter", name: "زبدة الجسم", en: "Body Butter", desc: "زبدة الشيا والكاكاو لترطيب عميق وطويل الأمد، ومرونة بتحسّيها.", tag: "زبدة الشيا والكاكاو" },
  { key: "body-splash", name: "بودي سبلاش", en: "Body Splash", desc: "رشّة أخيرة بتعطي انتعاش فوري، وبتحسّن مظهر البشرة وإشراقتها.", tag: "فيتامين E و B5" },
];
// زيدي الرقم لما تغيري الصور، عشان المتصفحات ما تعرض النسخة القديمة المحفوظة عندها
const ASSET_VERSION = 6;
const imageFor = (itemKey, scent) => `images/${itemKey}-${scent}.svg?v=${ASSET_VERSION}`;
// ترتيب المنتجات في العرض (الطوال بالنص)
const STAGE_ORDER = ["body-scrub", "body-splash", "shower-gel", "body-butter"];

// المنتجات القابلة للشراء
const PRODUCTS = {
  bundle: { id: "bundle", name: "بكج ليسينا الكامل", price: 25, coverItem: "body-splash" },
};

// shared with bottle.js / fx.js
window.LESINA = { SCENTS, get scent() { return currentScent; } };

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Number(n.toFixed(2))} ${CONFIG.currency}`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");

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
  toast(`انضاف ${PRODUCTS[id].name} · ${SCENTS[scent].name} للحقيبة`);
}
function setQty(key, qty) {
  if (qty <= 0) delete cart[key];
  else cart[key] = Math.min(20, qty);
  saveCart();
  renderCart();
}

/* ---------- Scent ---------- */
function applyScentTheme(scent) {
  const s = SCENTS[scent];
  const root = document.documentElement.style;
  root.setProperty("--s-deep", s.deep);
  root.setProperty("--s-mid", s.mid);
  root.setProperty("--s-tint", s.tint);
}

function stageImages(scent) {
  return STAGE_ORDER.map((k) => {
    const item = BUNDLE_ITEMS.find((i) => i.key === k);
    return `<img data-item-img="${k}" src="${imageFor(k, scent)}" alt="${escapeHTML(item.name)}">`;
  }).join("");
}

function setScent(scent) {
  if (!SCENTS[scent] || scent === currentScent) return;
  currentScent = scent;
  applyScentTheme(scent);

  $$("[data-scent]").forEach((b) => {
    const on = b.dataset.scent === scent;
    b.setAttribute("aria-selected", on);
    if (b.classList.contains("tab")) b.tabIndex = on ? 0 : -1;
  });
  // the 3D bottle (bottle.js) listens for this
  document.dispatchEvent(new CustomEvent("lesina:scent", { detail: { scent, ...SCENTS[scent] } }));
  $("#scentName").textContent = SCENTS[scent].name;
  $("#scentCaption").textContent = caption(scent);

  // the arch cross-fades; everything else swaps in place
  const stage = $("#archStage");
  stage.classList.add("is-swapping");
  setTimeout(() => {
    $$("img", stage).forEach((img) => { img.src = imageFor(img.dataset.itemImg, scent); });
    stage.classList.remove("is-swapping");
  }, reducedMotion ? 0 : 380);
  $$("[data-item-img]").forEach((img) => { if (!stage.contains(img)) img.src = imageFor(img.dataset.itemImg, scent); });
}

const caption = (scent) => `The ${SCENTS[scent].name} Edition · ${SCENTS[scent].edition}`;

/* ---------- Rendering ---------- */
function renderCollection() {
  $("#heroStage").innerHTML = stageImages(currentScent);
  $("#archStage").innerHTML = stageImages(currentScent);
  $("#scentCaption").textContent = caption(currentScent);

  $("#scentTabs").innerHTML = Object.entries(SCENTS).map(([key, s]) => `
    <button type="button" role="tab" class="tab" data-scent="${key}" aria-selected="${key === currentScent}"
      tabindex="${key === currentScent ? 0 : -1}" style="--swatch:${s.mid}"><small>${s.numeral}.</small>${s.name}</button>`).join("");

  $("#bundleContents").innerHTML = BUNDLE_ITEMS.map((i, n) => `
    <li><span class="n">${pad(n + 1)}</span><span class="ar">${escapeHTML(i.name)}</span><span class="en">${i.en}</span></li>`).join("");

  let qty = 1;
  const qtyEl = $("#bundleQty span");
  $("#bundleQty").addEventListener("click", (e) => {
    const step = Number(e.target.dataset.step);
    if (!step) return;
    qty = Math.max(1, Math.min(20, qty + step));
    qtyEl.textContent = qty;
  });
  $("#bundleAdd").addEventListener("click", () => {
    addToCart("bundle", currentScent, qty);
    qty = 1; qtyEl.textContent = 1;
  });

  // arrow keys move between scent tabs
  $("#scentTabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const keys = Object.keys(SCENTS);
    const i = keys.indexOf(currentScent);
    const next = keys[(i + (e.key === "ArrowRight" ? 1 : -1) + keys.length) % keys.length];
    setScent(next);
    $(`[data-scent="${next}"]`).focus();
  });
}

function renderRitual() {
  $("#ritualList").innerHTML = BUNDLE_ITEMS.map((i, n) => `
    <article class="step reveal">
      <div class="step__figure">
        <img data-item-img="${i.key}" src="${imageFor(i.key, currentScent)}" alt="${escapeHTML(i.name)}" loading="lazy">
      </div>
      <div class="step__text">
        <span class="step__num">${pad(n + 1)}</span>
        <span class="step__en">${i.en}</span>
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
  const count = cartCount();
  $("#cartCount").textContent = count;
  $("#drawerCount").textContent = count ? `(${count})` : "";
  const keys = Object.keys(cart);
  const body = $("#cartItems");

  if (!keys.length) {
    body.innerHTML = `
      <div class="empty">
        <p class="empty__word" dir="ltr">Lesina</p>
        <p>حقيبتك فاضية لسا</p>
        <button class="btn btn--wine" data-add-current>أضيفي البكج</button>
      </div>`;
    $("#cartFoot").hidden = true;
    return;
  }

  $("#cartFoot").hidden = false;
  body.innerHTML = keys.map((key) => {
    const { product, scent } = parseKey(key);
    return `
      <div class="cart-item" data-key="${key}">
        <div class="cart-item__img" style="--tint:${SCENTS[scent].tint}"><img src="${imageFor(product.coverItem, scent)}" alt=""></div>
        <div>
          <h4>${escapeHTML(product.name)}</h4>
          <div class="meta"><b dir="ltr">${SCENTS[scent].name}</b> · ${money(product.price)}</div>
          <div class="qty qty--sm">
            <button type="button" data-cart-step="1" aria-label="زيادة">+</button>
            <span>${cart[key]}</span>
            <button type="button" data-cart-step="-1" aria-label="إنقاص">−</button>
          </div>
        </div>
        <button class="remove" type="button" data-remove>إزالة</button>
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
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
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

/* ---------- Hero: drifting silk, like the brand's abstract red posts ---------- */
function startSilk() {
  const canvas = $("#heroCanvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const blobs = [
    { c: [181, 31, 62], r: .62, x: .78, y: .22, sx: .00011, sy: .00017, a: .9 },
    { c: [122, 26, 54], r: .7, x: .18, y: .78, sx: .00013, sy: .00009, a: .95 },
    { c: [224, 74, 99], r: .38, x: .62, y: .62, sx: .00019, sy: .00014, a: .55 },
    { c: [94, 17, 41], r: .55, x: .3, y: .2, sx: .00008, sy: .00012, a: .9 },
    { c: [233, 201, 204], r: .22, x: .5, y: .38, sx: .00016, sy: .0001, a: .18 },
  ];
  let w, h, running = true, raf;
  const scale = .5; // draw at half resolution; the blur hides it

  function resize() {
    w = canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    h = canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
  }
  function draw(t) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#2a0711";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    const m = Math.max(w, h);
    for (const b of blobs) {
      const x = (b.x + Math.sin(t * b.sx * 6.283) * .14) * w;
      const y = (b.y + Math.cos(t * b.sy * 6.283) * .12) * h;
      const r = b.r * m * (1 + Math.sin(t * .0003 + b.x * 9) * .06);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${b.c},${b.a})`);
      g.addColorStop(.55, `rgba(${b.c},${b.a * .35})`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  function loop(t) { if (running) { draw(t); raf = requestAnimationFrame(loop); } }

  resize();
  addEventListener("resize", () => { resize(); draw(performance.now()); });
  if (reducedMotion) return draw(0);

  new IntersectionObserver(([en]) => {
    running = en.isIntersecting;
    cancelAnimationFrame(raf);
    if (running) raf = requestAnimationFrame(loop);
  }).observe(canvas);
}

/* ---------- Top bar: one message at a time ---------- */
function rotateTopbar() {
  const items = $$("#topbarTrack p");
  if (items.length < 2 || reducedMotion) return;
  let i = 0;
  setInterval(() => {
    const prev = items[i];
    i = (i + 1) % items.length;
    prev.classList.remove("is-active");
    prev.classList.add("is-leaving");
    items[i].classList.remove("is-leaving");
    items[i].classList.add("is-active");
    setTimeout(() => prev.classList.remove("is-leaving"), 700);
  }, 3600);
}

/* ---------- Init ---------- */
function init() {
  applyScentTheme(currentScent);
  renderCollection();
  renderRitual();
  renderCart();
  $("#year").textContent = new Date().getFullYear();
  startSilk();
  rotateTopbar();
  // fx.js lifts the intro; this only matters if it failed to load
  setTimeout(() => { document.documentElement.classList.add("is-loaded"); $("#loader")?.classList.add("is-done"); }, 6000);

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

  // mobile menu
  const menuBtn = $("#menuBtn"), mobileNav = $("#mobileNav");
  const setMenu = (open) => { mobileNav.classList.toggle("is-open", open); menuBtn.setAttribute("aria-expanded", open); };
  menuBtn.addEventListener("click", () => setMenu(!mobileNav.classList.contains("is-open")));
  $$("a", mobileNav).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // header turns solid once it leaves the hero
  const header = $("#header");
  const hero = $(".hero");
  const onScroll = () => {
    const solid = hero.getBoundingClientRect().bottom <= header.offsetHeight + 1 || mobileNav.classList.contains("is-open");
    header.classList.toggle("is-solid", solid);
  };
  addEventListener("scroll", onScroll, { passive: true });
  menuBtn.addEventListener("click", onScroll);
  onScroll();

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: .15, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
}

init();
