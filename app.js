/* =========================================================
   Revira Hair Care — store logic
   Edit prices, copy and images in CONFIG / PRODUCTS / INGREDIENTS only.
   ========================================================= */

const CONFIG = {
  currency: "JD",
  // WhatsApp number that receives orders, international format without "+"
  whatsappNumber: "962790335444",
  // Delivery fee in JD. null = confirmed on WhatsApp, 0 = free
  deliveryFee: 0,
};

// Bump when images change so browsers fetch the new files
const ASSET_VERSION = 11;
const asset = (path) => `${path}?v=${ASSET_VERSION}`;

// In ritual order: cleanse → condition → treat → finish
const PRODUCTS = {
  shampoo: {
    name: "Shampoo", size: "500 ml", price: 15, step: "Cleanse",
    image: "img/shampoo.webp", sheet: "img/sheet-shampoo.webp",
    tagline: "The first step to perfect care.",
    short: "Cleanses the scalp deeply without drying, and strengthens from the roots.",
    benefits: [
      "Deeply cleanses the scalp, removing dirt and excess oil without drying",
      "Strengthens hair from the roots for fuller-looking hair",
      "Hydrates and leaves hair naturally soft",
      "Helps protect against breakage and split ends",
    ],
    ingredients: ["Vitamin B5 (Panthenol)", "Vitamin E", "Hydrolyzed Wheat Protein", "Glycerin", "Natural extracts", "Plant-based cleansers"],
  },
  conditioner: {
    name: "Conditioner", size: "500 ml", price: 12, step: "Condition",
    image: "img/conditioner.webp", sheet: "img/sheet-conditioner.webp",
    tagline: "Lasting softness, renewed protection.",
    short: "Detangles with ease and leaves hair silky, soft and easy to style.",
    benefits: [
      "Detangles easily for softer, more manageable hair",
      "Deep hydration that lasts all day",
      "Improves strength and elasticity, reducing breakage",
      "Helps shield hair from heat and pollution",
    ],
    ingredients: ["Shea Butter", "Coconut Oil", "Polyglutamic Acid", "Hydrolyzed Wheat Protein", "Vitamin B5", "Vitamin E"],
  },
  "hair-mask": {
    name: "Hair Mask", size: "250 ml", price: 10, step: "Treat",
    image: "img/hair-mask.webp", sheet: "img/sheet-hair-mask.webp",
    tagline: "Intensive treatment, stunning results.",
    short: "A rich treatment for dry and damaged hair, for softness and shine.",
    benefits: [
      "Deep nourishment that revives every strand",
      "Repairs and strengthens damaged hair from root to tip",
      "Silky softness and a healthy shine",
      "Suits all hair types",
    ],
    ingredients: ["Olive Oil", "Shea Butter", "Argan Oil", "Coconut Oil", "Vitamin E"],
  },
  "hair-oil": {
    name: "Hair Oil", size: "250 ml", price: 20, step: "Finish",
    image: "img/hair-oil.webp", sheet: "img/sheet-hair-oil.webp",
    tagline: "A natural touch, exceptional benefits.",
    short: "A blend of eight natural oils that nourishes the roots and adds shine.",
    benefits: [
      "Nourishes and strengthens hair from the roots",
      "Cares for the scalp and supports healthy hair",
      "Moisturises and helps prevent split ends",
      "Natural shine and protection",
    ],
    ingredients: ["Sunflower Oil", "Almond Oil", "Coconut Oil", "Castor Oil", "Jojoba Oil", "Sesame Oil", "Lavender Oil", "Amla Oil", "Vitamin E"],
  },
};
const ORDER = Object.keys(PRODUCTS);

// The four products together at a set price
const SET = {
  id: "ritual-set", name: "The Complete Ritual", size: "Shampoo, Conditioner, Hair Mask, Hair Oil",
  price: 45, image: "img/lineup-wide.webp",
};
// Everything that can sit in the bag
const CATALOG = { ...PRODUCTS, [SET.id]: SET };
const BAG_ORDER = [...ORDER, SET.id];

const RITUAL_COPY = {
  shampoo: "Massage into wet hair and scalp, then rinse. A gentle, plant-based lather that cleans without stripping natural oils.",
  conditioner: "Smooth through the lengths and ends, leave for a moment, then rinse. Detangles and seals in moisture.",
  "hair-mask": "When hair needs more, apply after cleansing, leave to work, then rinse for intensive nourishment.",
  "hair-oil": "Warm a few drops between your palms and work through the ends, or massage into the scalp.",
};

const INGREDIENTS = [
  { name: "Vitamin B5", note: "Panthenol", desc: "Hydrates, strengthens and improves elasticity.", in: ["shampoo", "conditioner"] },
  { name: "Vitamin E", note: "Antioxidant", desc: "Protects and nourishes hair.", in: ["shampoo", "conditioner", "hair-mask", "hair-oil"] },
  { name: "Wheat Protein", note: "Hydrolyzed", desc: "Strengthens hair fibres and reduces breakage.", in: ["shampoo", "conditioner"] },
  { name: "Shea Butter", note: "Butter", desc: "Deep nourishment for dry lengths.", in: ["conditioner", "hair-mask"] },
  { name: "Coconut Oil", note: "Oil", desc: "Moisture and natural shine.", in: ["conditioner", "hair-mask", "hair-oil"] },
  { name: "Argan Oil", note: "Oil", desc: "Natural nourishment for stronger, healthier hair.", in: ["hair-mask"] },
  { name: "Olive Oil", note: "Oil", desc: "Softens and nourishes, straight from the grove.", in: ["hair-mask"] },
  { name: "Jojoba Oil", note: "Oil", desc: "Moisturises and balances the scalp's natural oils.", in: ["hair-oil"] },
];

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `${Number(n.toFixed(2))} ${CONFIG.currency}`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n) => String(n).padStart(2, "0");
const setFullPrice = () => ORDER.reduce((sum, id) => sum + PRODUCTS[id].price, 0);

/* ---------- Bag state ---------- */
const STORAGE_KEY = "revira_bag_v1";
let cart = loadCart();

function loadCart() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return Object.fromEntries(Object.entries(data).filter(([id, q]) => CATALOG[id] && Number.isInteger(q) && q > 0));
  } catch {
    return {};
  }
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* storage unavailable */ }
}

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartSubtotal = () => Object.entries(cart).reduce((sum, [id, q]) => sum + CATALOG[id].price * q, 0);
const cartTotal = () => cartSubtotal() + (CONFIG.deliveryFee || 0);

function addToCart(id, qty = 1, { quiet = false } = {}) {
  if (!CATALOG[id]) return;
  cart[id] = Math.min(20, (cart[id] || 0) + qty);
  saveCart();
  renderCart();
  const btn = $("#cartOpen");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  if (!quiet) toast(`${CATALOG[id].name} added to your bag`);
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = Math.min(20, qty);
  saveCart();
  renderCart();
}

/* ---------- Rendering ---------- */
function renderProducts() {
  $("#products").innerHTML = ORDER.map((id, n) => {
    const p = PRODUCTS[id];
    return `
      <article class="product reveal" data-id="${id}">
        <button class="product__media" type="button" data-details="${id}" data-cursor="View" aria-label="View ${escapeHTML(p.name)} details">
          <img src="${asset(p.image)}" alt="Revira ${escapeHTML(p.name)}" loading="lazy" width="760" height="760">
          <span class="product__step">${pad(n + 1)} · ${p.step}</span>
        </button>
        <div class="product__body">
          <div class="product__row">
            <h3>${escapeHTML(p.name)}</h3>
            <p class="product__price">${p.price} <span>${CONFIG.currency}</span></p>
          </div>
          <p class="product__size">${p.size}</p>
          <p class="product__short">${escapeHTML(p.short)}</p>
          <div class="product__actions">
            <button class="btn btn--forest" type="button" data-add="${id}">Add to bag</button>
            <button class="link-btn" type="button" data-details="${id}">Details</button>
          </div>
        </div>
      </article>`;
  }).join("");
  $("#setPrice").textContent = SET.price;
  $("#setWas").textContent = `${setFullPrice()} ${CONFIG.currency}`;
  $("#setSave").textContent = `Save ${setFullPrice() - SET.price} ${CONFIG.currency}`;
}

function renderRitual() {
  $("#ritualList").innerHTML = ORDER.map((id, n) => {
    const p = PRODUCTS[id];
    return `
      <article class="step reveal">
        <div class="step__figure">
          <img src="${asset(p.image)}" alt="Revira ${escapeHTML(p.name)}" loading="lazy" width="760" height="760">
        </div>
        <div class="step__text">
          <span class="step__num">${pad(n + 1)}</span>
          <span class="step__en">${p.step}</span>
          <h3>${escapeHTML(p.name)}</h3>
          <p>${escapeHTML(RITUAL_COPY[id])}</p>
          <button class="step__tag" type="button" data-add="${id}">Add · ${p.price} ${CONFIG.currency}</button>
        </div>
      </article>`;
  }).join("");
}

function renderIngredients() {
  $("#ingredientList").innerHTML = INGREDIENTS.map((ing, n) => `
    <article class="ingredient reveal">
      <span class="ingredient__n">${pad(n + 1)}</span>
      <p class="ingredient__note">${escapeHTML(ing.note)}</p>
      <h3>${escapeHTML(ing.name)}</h3>
      <p class="ingredient__desc">${escapeHTML(ing.desc)}</p>
      <p class="ingredient__in">In ${ing.in.map((id) => PRODUCTS[id].name).join(", ")}</p>
    </article>`).join("");
}

function deliveryLabel() {
  if (CONFIG.deliveryFee === null) return "Confirmed on WhatsApp";
  return CONFIG.deliveryFee === 0 ? "Free" : money(CONFIG.deliveryFee);
}

function renderCart() {
  const count = cartCount();
  $("#cartCount").textContent = count;
  $("#drawerCount").textContent = count ? `(${count})` : "";
  const ids = BAG_ORDER.filter((id) => cart[id]);
  const body = $("#cartItems");

  if (!ids.length) {
    body.innerHTML = `
      <div class="empty">
        <p class="empty__word">revira</p>
        <p>Your bag is empty</p>
        <a class="btn btn--forest" href="#shop" data-close-bag>Shop the collection</a>
      </div>`;
    $("#cartFoot").hidden = true;
    return;
  }

  $("#cartFoot").hidden = false;
  body.innerHTML = ids.map((id) => {
    const p = CATALOG[id];
    return `
      <div class="cart-item" data-key="${id}">
        <div class="cart-item__img"><img src="${asset(p.image)}" alt=""></div>
        <div>
          <h4>${escapeHTML(p.name)}</h4>
          <div class="meta">${p.size} · ${money(p.price)}</div>
          <div class="qty qty--sm">
            <button type="button" data-cart-step="-1" aria-label="Decrease">−</button>
            <span>${cart[id]}</span>
            <button type="button" data-cart-step="1" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="remove" type="button" data-remove>Remove</button>
      </div>`;
  }).join("");

  $("#cartSubtotal").textContent = money(cartSubtotal());
  $("#cartDelivery").textContent = deliveryLabel();
  $("#cartTotal").textContent = money(cartTotal());
}

function renderSummary() {
  const lines = BAG_ORDER.filter((id) => cart[id]).map((id) =>
    `<div class="row"><span>${escapeHTML(CATALOG[id].name)} × ${cart[id]}</span><span>${money(CATALOG[id].price * cart[id])}</span></div>`
  ).join("");
  $("#orderSummary").innerHTML = `${lines}
    <div class="row total"><span>Total</span><span>${money(cartTotal())}</span></div>`;
}

/* ---------- Overlays ---------- */
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
function openModal(el) {
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(el) {
  el.classList.remove("is-open");
  el.setAttribute("aria-hidden", "true");
}

let detailsId = null, detailsQty = 1;
function openDetails(id) {
  const p = PRODUCTS[id];
  if (!p) return;
  detailsId = id;
  detailsQty = 1;
  $("#detailsImg").src = asset(p.image);
  $("#detailsImg").alt = `Revira ${p.name}`;
  $("#detailsSize").textContent = `${p.step} · ${p.size}`;
  $("#detailsName").textContent = p.name;
  $("#detailsTagline").textContent = p.tagline;
  $("#detailsBenefits").innerHTML = p.benefits.map((b) => `<li>${escapeHTML(b)}</li>`).join("");
  $("#detailsIngredients").innerHTML = p.ingredients.map((i) => `<li>${escapeHTML(i)}</li>`).join("");
  $("#detailsPrice").textContent = p.price;
  $("#detailsQty span").textContent = 1;
  $("#detailsSheet").src = asset(p.sheet);
  $("#detailsSheet").alt = `What's inside Revira ${p.name}`;
  $("#details .modal__box").scrollTop = 0;
  openModal($("#details"));
}

function openCheckout() {
  if (!cartCount()) return;
  renderSummary();
  $("#checkoutView").hidden = false;
  $("#successView").hidden = true;
  openModal($("#modal"));
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
  if (!valid) { toast("Please fill in the highlighted fields. Phone format: 07XXXXXXXX"); return; }

  const lines = BAG_ORDER.filter((id) => cart[id]).map((id) => `• ${CATALOG[id].name} (${CATALOG[id].size}) × ${cart[id]} = ${money(CATALOG[id].price * cart[id])}`);
  const message = [
    "New order from the Revira website",
    "",
    ...lines,
    `Delivery: ${deliveryLabel()}`,
    `Total: ${money(cartTotal())}`,
    "",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `City: ${data.city}`,
    `Address: ${data.address}`,
    data.notes ? `Notes: ${data.notes}` : null,
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

/* ---------- Hero: dappled light through olive leaves ---------- */
function startLight() {
  const canvas = $("#heroCanvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const blobs = [
    { c: [92, 110, 58], r: .7, x: .2, y: .25, sx: .00011, sy: .00016, a: .9 },
    { c: [61, 74, 38], r: .75, x: .82, y: .7, sx: .00013, sy: .00009, a: .95 },
    { c: [184, 154, 90], r: .42, x: .7, y: .18, sx: .00018, sy: .00013, a: .45 },
    { c: [120, 136, 78], r: .5, x: .45, y: .6, sx: .00009, sy: .00012, a: .6 },
    { c: [243, 239, 228], r: .22, x: .3, y: .3, sx: .00016, sy: .0001, a: .14 },
  ];
  let w, h, running = true, raf;
  const scale = .5;

  function resize() {
    w = canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    h = canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
  }
  function draw(t) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#1f2a14";
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
  renderProducts();
  renderRitual();
  renderIngredients();
  renderCart();
  $("#year").textContent = new Date().getFullYear();
  startLight();
  rotateTopbar();
  // fx.js lifts the intro; this only matters if it failed to load
  setTimeout(() => { document.documentElement.classList.add("is-loaded"); $("#loader")?.classList.add("is-done"); }, 6000);

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) return addToCart(add.dataset.add);
    const details = e.target.closest("[data-details]");
    if (details) return openDetails(details.dataset.details);
    if (e.target.closest("[data-close-bag]")) closeCart();
  });

  $("#addSet").addEventListener("click", () => {
    addToCart(SET.id, 1, { quiet: true });
    toast(`The Complete Ritual is in your bag: ${SET.price} ${CONFIG.currency}`);
    openCart();
  });

  $("#cartItems").addEventListener("click", (e) => {
    const item = e.target.closest(".cart-item");
    if (!item) return;
    const id = item.dataset.key;
    if (e.target.closest("[data-remove]")) return setQty(id, 0);
    const step = Number(e.target.dataset.cartStep);
    if (step) setQty(id, cart[id] + step);
  });

  // details modal
  $("#detailsQty").addEventListener("click", (e) => {
    const step = Number(e.target.dataset.step);
    if (!step) return;
    detailsQty = Math.max(1, Math.min(20, detailsQty + step));
    $("#detailsQty span").textContent = detailsQty;
  });
  $("#detailsAdd").addEventListener("click", () => {
    addToCart(detailsId, detailsQty);
    closeModal($("#details"));
  });
  $$("#details [data-close]").forEach((b) => b.addEventListener("click", () => closeModal($("#details"))));

  $("#cartOpen").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);
  $("#checkoutBtn").addEventListener("click", openCheckout);
  $("#modalClose").addEventListener("click", () => closeModal($("#modal")));
  $("#successClose").addEventListener("click", () => closeModal($("#modal")));
  $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); }));
  $("#checkoutForm").addEventListener("submit", handleCheckout);
  $("#checkoutForm").addEventListener("input", (e) => e.target.classList.remove("invalid"));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    $$(".modal.is-open").forEach(closeModal);
    closeCart();
  });

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
  }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
}

init();
