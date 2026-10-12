/* =========================================================
   Lesina — motion layer
   Intro curtain, smooth scroll, scroll choreography, cursor.
   Everything here is optional: if GSAP/Lenis fail to load,
   the store still works and simply animates less.
   ========================================================= */
(() => {
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  /* ---------- Intro curtain ---------- */
  function runLoader() {
    const loader = $("#loader");
    const bar = $("#loaderBar");
    if (!loader) return root.classList.add("is-loaded");

    let seen = false;
    try { seen = sessionStorage.getItem("lesina_intro") === "1"; } catch { /* storage blocked */ }
    const minTime = reduced ? 0 : seen ? 500 : 1900;
    const start = performance.now();
    let pageLoaded = document.readyState === "complete";
    let done = false;

    const tick = () => {
      if (done) return;
      const t = Math.min(1, (performance.now() - start) / Math.max(minTime, 1));
      const target = pageLoaded ? 1 : 0.6;
      if (bar) bar.style.transform = `scaleX(${Math.min(t, target)})`;
      requestAnimationFrame(tick);
    };
    tick();

    const finish = () => {
      if (done) return;
      done = true;
      if (bar) bar.style.transform = "scaleX(1)";
      try { sessionStorage.setItem("lesina_intro", "1"); } catch { /* storage blocked */ }
      setTimeout(() => {
        loader.classList.add("is-done");
        root.classList.add("is-loaded");
        setTimeout(() => loader.remove(), 1200);
      }, reduced ? 0 : 250);
    };
    const maybeFinish = () => {
      const wait = Math.max(0, minTime - (performance.now() - start));
      if (pageLoaded) setTimeout(finish, wait);
    };

    addEventListener("load", () => { pageLoaded = true; maybeFinish(); });
    // never hold the page hostage on a slow connection
    setTimeout(() => { pageLoaded = true; finish(); }, seen ? 2500 : 4200);
    maybeFinish();
  }
  runLoader();

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true });
    if (hasGsap) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // in-page links glide, landing below the sticky header
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: id === "#top" ? 0 : -70 });
    });
    // freeze page scroll while the bag or checkout is open
    const lockers = [$("#drawer"), $("#modal")].filter(Boolean);
    const sync = () => (lockers.some((el) => el.classList.contains("is-open")) ? lenis.stop() : lenis.start());
    lockers.forEach((el) => new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ["class"] }));
  }

  /* ---------- Custom cursor + magnetic buttons ---------- */
  if (finePointer && !reduced) {
    const cursor = $("#cursor");
    const label = $("#cursorLabel");
    root.classList.add("has-cursor");
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("is-on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-on"));
    const move = () => {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(move);
    };
    move();
    document.addEventListener("pointerover", (e) => {
      const labelled = e.target.closest("[data-cursor]");
      const hot = e.target.closest("a, button, summary, select, input, textarea, [data-scent]");
      cursor.classList.toggle("is-label", !!labelled && !hot);
      cursor.classList.toggle("is-hot", !!hot);
      label.textContent = labelled && !hot ? labelled.dataset.cursor : "";
    });

    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  if (!hasGsap || reduced) return;

  /* ---------- Scroll choreography ---------- */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("has-gsap");

  // headings rise word by word
  $$("[data-split]").forEach((el) => {
    splitWords(el, "w");
    gsap.from($$(".w > span", el), {
      yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // manifesto lights up word by word as you read
  $$("[data-scrub-words]").forEach((el) => {
    splitWords(el, "sw");
    gsap.fromTo($$(".sw", el), { opacity: 0.14 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
    });
  });

  // figures count up
  $$("#stats dd").forEach((dd) => {
    const end = Number(dd.textContent);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.8, ease: "power3.out",
      scrollTrigger: { trigger: dd, start: "top 90%" },
      onUpdate: () => { dd.textContent = Math.round(obj.v); },
    });
  });

  // the arch floats against the page
  gsap.fromTo(".arch__stage", { yPercent: 8 }, {
    yPercent: -6, ease: "none",
    scrollTrigger: { trigger: ".collection", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.from(".arch", {
    clipPath: "inset(100% 0% 0% 0% round 999px 999px 4px 4px)", duration: 1.6, ease: "expo.inOut",
    scrollTrigger: { trigger: ".arch", start: "top 80%" },
  });

  // ritual: a horizontal gallery on large screens
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1025px)", () => {
    const section = $(".ritual");
    const track = $("#ritualList");
    section.classList.add("is-h");
    const distance = () => track.scrollWidth - track.clientWidth;
    const tween = gsap.to(track, {
      x: () => distance(), // RTL: content continues to the left, so move right
      ease: "none",
      scrollTrigger: {
        trigger: section, start: "top top", end: () => `+=${distance()}`,
        pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
      },
    });
    return () => { tween.scrollTrigger?.kill(); section.classList.remove("is-h"); };
  });

  // ingredient icons draw themselves
  $$(".ingredient svg").forEach((svg) => {
    const parts = $$("path, ellipse", svg);
    parts.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 300;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    gsap.to(parts, {
      strokeDashoffset: 0, duration: 2, ease: "power2.inOut", stagger: 0.15,
      scrollTrigger: { trigger: svg, start: "top 85%" },
    });
  });

  // gift script breathes in
  gsap.fromTo("#giftScript", { scale: 0.86, letterSpacing: "0.04em" }, {
    scale: 1, letterSpacing: "-0.02em", ease: "none",
    scrollTrigger: { trigger: ".gift", start: "top bottom", end: "center center", scrub: true },
  });

  // footer wordmark letters rise from the floor
  gsap.from("#footerWord span", {
    yPercent: 70, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.07,
    scrollTrigger: { trigger: "#footerWord", start: "top 95%" },
  });

  // marquee leans with scroll speed
  if (lenis) {
    const track = $(".marquee__track");
    const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
    lenis.on("scroll", ({ velocity }) => skew(Math.max(-12, Math.min(12, velocity * -0.6))));
  }

  // fonts change line breaks; re-measure once they land
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  function splitWords(el, cls) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(part);
            const w = document.createElement("span");
            w.className = cls;
            if (cls === "w") { const inner = document.createElement("span"); inner.textContent = part; w.append(inner); }
            else w.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  }
})();
