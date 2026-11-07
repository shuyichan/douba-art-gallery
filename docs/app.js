/* 斗八 Douba Art Gallery: filters, grid, lightbox */

// works.json is the only copy of the work records. Series files name them by id.
const SERIES_SOURCES = [
  ["travel", "series.json", "series.html"],
  ["spring-walk", "series-spring-walk.json", "series-spring-walk.html"],
  ["bookcovers", "series-bookcovers.json", "series-bookcovers.html"],
  ["shoulder-fish", "series-shoulder-fish.json", "series-shoulder-fish.html"],
  ["orange", "series-orange.json", "series-orange.html"],
  ["green", "series-green.json", "series-green.html"],
  ["chopstick", "series-chopstick.json", "series-chopstick.html"],
  ["cosmetic", "series-cosmetic.json", "series-cosmetic.html"],
];
const [WORKS, ...seriesPayloads] = await Promise.all([
  fetch("works.json").then((response) => (response.ok ? response.json() : [])).catch(() => []),
  ...SERIES_SOURCES.map(([, file]) => fetch(file).then((response) => (response.ok ? response.json() : null)).catch(() => null)),
]);

const page = document.body.dataset.page === "series" ? "series" : "home";
const byId = new Map(WORKS.map((work) => [work.id, work]));

function resolveSeries(raw) {
  const workIds = Array.isArray(raw?.workIds) ? raw.workIds : [];
  const works = workIds.map((id) => byId.get(id));
  const ready = Boolean(raw)
    && typeof raw.title === "string"
    && typeof raw.intro === "string"
    && works.length > 0
    && works.every(Boolean)
    && new Set(workIds).size === workIds.length
    && workIds.includes(raw.coverId);
  return { raw, workIds, works, ready };
}

const catalogs = Object.fromEntries(SERIES_SOURCES.map(([key], index) => [key, resolveSeries(seriesPayloads[index])]));
const activeSeries = catalogs[document.body.dataset.series || "travel"];
const seriesReady = page !== "series" || Boolean(activeSeries?.ready);
const seriesWorks = page === "series" && activeSeries?.ready ? activeSeries.works : [];
const seriesLinkFor = new Map();
for (const [key, , href] of SERIES_SOURCES) {
  const state = catalogs[key];
  if (!state.ready) continue;
  for (const id of state.workIds) seriesLinkFor.set(id, href);
}

const CATEGORIES = [
  ["旅行包", "Travel Bags"],
  ["手提包", "Totes"],
  ["手拿包", "Clutches"],
  ["化妝包", "Cosmetic Pouches"],
  ["手機套", "Phone Sleeves"],
  ["杯套", "Cup Sleeves"],
  ["筷套", "Chopstick Sleeves"],
  ["束口袋", "Drawstring Bags"],
  ["拼布包", "Patchwork Bags"],
  ["斜背包", "Crossbody Bags"],
  ["收納包", "Storage Pouches"],
  ["布花鏡", "Fabric Mirrors"],
  ["書衣", "Book Covers"],
];
const CATEGORY_EN = Object.fromEntries(CATEGORIES);

const $ = (id) => document.getElementById(id);
const grid = $("works") ?? $("series-works");
const filters = $("filters");
const result = $("result");

const cover = (work) => work.images[0];
const altOf = (work) => `斗八作品《${work.title_zh}》，${work.category}`;

let activeCategory = null;
let visible = page === "series" ? seriesWorks : WORKS;

/* Works */

function createTile(work, index) {
  const li = document.createElement("li");
  li.className = "work";
  li.dataset.id = work.id;
  li.dataset.category = work.category;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "work-open";
  button.addEventListener("click", () => openLightbox(work, button));

  const frame = document.createElement("span");
  frame.className = "work-frame";

  const picture = document.createElement("picture");
  const source = document.createElement("source");
  const photo = cover(work);
  source.srcset = photo.src_webp;
  source.type = "image/webp";

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = altOf(work);
  img.width = photo.w;
  img.height = photo.h;
  img.decoding = "async";
  if (index > 2) img.loading = "lazy";
  if (img.complete) img.classList.add("is-loaded");
  else img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });

  picture.append(source, img);
  frame.append(picture);

  if (work.images.length > 1) {
    const hint = document.createElement("span");
    hint.className = "work-photos";
    hint.textContent = `${work.images.length} 張 `;
    const en = document.createElement("i");
    en.lang = "en";
    en.textContent = "photos";
    hint.append(en);
    frame.append(hint);
  }

  const label = document.createElement("span");
  label.className = "work-label";
  const title = document.createElement("span");
  title.className = "work-title";
  title.textContent = work.title_zh;
  label.append(title);
  if (work.year) {
    const year = document.createElement("span");
    year.className = "work-year";
    year.textContent = work.year;
    label.append(year);
  }
  if (work.title_en) {
    const en = document.createElement("span");
    en.className = "work-en";
    en.lang = "en";
    en.textContent = work.title_en;
    label.append(en);
  }

  button.append(frame, label);
  li.append(button);

  const seriesHref = seriesLinkFor.get(work.id);
  if (page === "home" && seriesHref) {
    const seriesLink = document.createElement("a");
    seriesLink.className = "work-series";
    seriesLink.href = seriesHref;
    seriesLink.textContent = "系列作品";
    li.append(seriesLink);
  }
  return li;
}

const listed = page === "series" ? visible : WORKS;
let tiles = [];
if (grid) {
  if (page === "series" && document.body.dataset.series === "bookcovers") {
    let lastYear = "";
    listed.forEach((work, index) => {
      if (work.year && work.year !== lastYear) {
        const mark = document.createElement("li");
        mark.className = "year-mark";
        mark.textContent = work.year;
        grid.append(mark);
        lastYear = work.year;
      }
      const tile = createTile(work, index);
      tiles.push(tile);
      grid.append(tile);
    });
  } else {
    tiles = listed.map(createTile);
    grid.append(...tiles);
  }
}

for (const card of document.querySelectorAll(".series-card[data-series]")) {
  const state = catalogs[card.dataset.series];
  if (!state?.ready) continue;
  card.querySelector(".series-card-name")?.replaceChildren(document.createTextNode(state.raw.title));
  const count = card.querySelector(".series-card-count");
  if (count) count.textContent = `${state.works.length} 件作品`;
  const coverWork = byId.get(state.raw.coverId);
  const coverPhoto = state.raw.coverImage || cover(coverWork);
  const coverImg = card.querySelector("img");
  if (coverImg && coverPhoto) {
    coverImg.src = coverPhoto.src;
    coverImg.width = coverPhoto.w;
    coverImg.height = coverPhoto.h;
    coverImg.alt = coverPhoto.alt || coverWork.title_zh;
    const coverSource = card.querySelector("source");
    if (coverSource) coverSource.srcset = coverPhoto.src_webp;
  }
}

if (page === "series" && activeSeries?.ready) {
  const seriesHeading = $("series-heading");
  const seriesIntro = $("series-intro");
  if (seriesHeading) seriesHeading.textContent = activeSeries.raw.title;
  if (seriesIntro) seriesIntro.textContent = activeSeries.raw.intro;
  document.title = `${activeSeries.raw.title} — 斗八 Douba Art Gallery`;
  const gallery = activeSeries.raw.gallery;
  const grid = $("series-works");
  if (gallery?.length && grid) {
    const block = document.createElement("div");
    block.className = "series-gallery-block";
    const label = document.createElement("p");
    label.className = "series-kicker";
    label.textContent = "系列照片";
    const list = document.createElement("ul");
    list.className = "series-gallery";
    gallery.forEach((photo, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", photo.alt || activeSeries.raw.title);
      const picture = document.createElement("picture");
      if (photo.src_webp) {
        const source = document.createElement("source");
        source.type = "image/webp";
        source.srcset = photo.src_webp;
        picture.append(source);
      }
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.alt || "";
      img.width = photo.w;
      img.height = photo.h;
      img.decoding = "async";
      picture.append(img);
      button.append(picture);
      button.addEventListener("click", () => openGallery(index, button));
      item.append(button);
      list.append(item);
    });
    block.append(label, list);
    grid.before(block);
  }
}

/* Even columns. A short category keeps the usual tile width and sits centered. */

const wide = matchMedia("(min-width: 900px)");  // same breakpoint as styles.css

function layout() {
  const base = wide.matches ? 3 : 2;
  const cols = Math.min(base, visible.length);
  const container = grid.parentElement;
  const styles = getComputedStyle(container);
  const inner = container.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const tileWidth = (inner - gap * (base - 1)) / base;
  grid.style.setProperty("--cols", cols);
  grid.style.maxWidth = cols < base ? `${tileWidth * cols + gap * (cols - 1)}px` : "";
  for (const tile of tiles) {
    tile.style.gridColumn = "";
    tile.style.gridRow = "";
  }
}

if (grid) {
  new ResizeObserver(layout).observe(grid.parentElement);
  document.fonts?.ready.then(layout);
}

/* Filters */

function chip(label, count, category) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  const sup = document.createElement("sup");
  sup.textContent = count;
  button.append(sup);
  button.setAttribute("aria-label", `${label} ${count} 件`);
  button.setAttribute("aria-pressed", String(category === activeCategory));
  button.addEventListener("click", () => setCategory(category));
  return button;
}

function renderResult() {
  const en = activeCategory ? CATEGORY_EN[activeCategory] : "All works";
  const zh = activeCategory ?? "全部作品";
  result.innerHTML = "";
  const i = document.createElement("i");
  i.lang = "en";
  i.textContent = en;
  result.append(`${zh} ${visible.length} 件 `, i);
}

function applyCategory() {
  visible = activeCategory ? WORKS.filter((w) => w.category === activeCategory) : WORKS;
  tiles.forEach((tile) => {
    tile.hidden = activeCategory !== null && tile.dataset.category !== activeCategory;
  });
  renderResult();
  layout();
}

let filterTimer;

function setCategory(category) {
  if (category === activeCategory) return;
  activeCategory = category;
  for (const button of filters.children) {
    const pressed = button.dataset.category === (category ?? "");
    button.setAttribute("aria-pressed", String(pressed));
  }
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  clearTimeout(filterTimer);
  grid.classList.add("is-changing");
  filterTimer = setTimeout(() => {
    applyCategory();
    grid.classList.remove("is-changing");
  }, still ? 0 : 220);
}

if (page === "home" && filters) {
  const allChip = chip("全部", WORKS.length, null);
  allChip.dataset.category = "";
  filters.append(allChip);
  for (const [category] of CATEGORIES) {
    const count = WORKS.filter((w) => w.category === category).length;
    if (!count) continue;
    const button = chip(category, count, category);
    button.dataset.category = category;
    filters.append(button);
  }
  applyCategory();
  if (!WORKS.length) {
    result.textContent = "作品暫時無法載入，請重新整理頁面。";
    filters.hidden = true;
    const facts = $("facts");
    if (facts) facts.hidden = true;
  }
} else if (page === "series") {
  if (!seriesReady && result) result.textContent = "系列暫時無法載入，請重新整理頁面。";
  else if (result) result.textContent = `${visible.length} 件作品`;
  layout();
}

/* About facts come from the data, so they cannot drift from it */

const factsList = $("facts");
if (factsList) {
  const facts = [
    ["作品 Works", WORKS.length],
    ["類別 Categories", new Set(WORKS.map((w) => w.category)).size],
  ];
  for (const [term, value] of facts) {
    const div = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    div.append(dt, dd);
    factsList.append(div);
  }
}

/* Lightbox */

const lightbox = $("lightbox");
const lbImg = $("lb-img");
const lbSource = $("lb-source");

let current = 0;
let photoIndex = 0;
let sequence = visible;
let opener = null;

function ratioOf(photo) {
  return `${photo.w} / ${photo.h}`;
}

function show(workIndex, photo = 0) {
  current = (workIndex + sequence.length) % sequence.length;
  const work = sequence[current];
  const total = work.images.length;
  photoIndex = (photo + total) % total;
  const image = work.images[photoIndex];

  lbImg.classList.add("is-loading");
  lbImg.style.setProperty("--r", ratioOf(image));
  lbSource.srcset = image.src_webp;
  lbImg.src = image.src;
  lbImg.alt = total > 1
    ? `${altOf(work)}，第 ${photoIndex + 1} 張，共 ${total} 張${image.view ? `：${image.view}` : ""}`
    : altOf(work);

  $("lb-count").textContent = `${current + 1} / ${sequence.length}`;
  const lbTitle = $("lb-title");
  lbTitle.replaceChildren(document.createTextNode(work.title_zh));
  if (work.year) {
    const year = document.createElement("span");
    year.className = "lb-year";
    year.textContent = work.year;
    lbTitle.append(year);
  }
  $("lb-en").textContent = work.title_en ?? "";
  $("lb-category").textContent = `${work.category} ${CATEGORY_EN[work.category]}`;

  // Hiding the focused arrow would drop focus out of the dialog, and the arrow keys with it
  if (total < 2 && $("lb-photos").contains(document.activeElement)) $("lb-close").focus();
  $("lb-photos").hidden = total < 2;
  $("lb-photo-count").textContent = `${photoIndex + 1} / ${total}`;

  const single = sequence.length < 2;
  $("lb-prev").hidden = single;
  $("lb-next").hidden = single;

  // Warm the cache for what comes next
  const neighbors = [
    work.images[(photoIndex + 1) % total],
    work.images[(photoIndex - 1 + total) % total],
    cover(sequence[(current + 1) % sequence.length]),
    cover(sequence[(current - 1 + sequence.length) % sequence.length]),
  ];
  for (const next of neighbors) new Image().src = next.src_webp;
}

// Keys and swipes walk through the photos of a work, then on to the next work
function step(direction) {
  const next = photoIndex + direction;
  const total = sequence[current].images.length;
  if (next >= 0 && next < total) return show(current, next);
  if (sequence.length < 2) return show(current, next);
  const work = current + direction;
  const size = sequence[(work + sequence.length) % sequence.length].images.length;
  show(work, direction < 0 ? size - 1 : 0);
}

lbImg.addEventListener("load", () => lbImg.classList.remove("is-loading"));

function openLightbox(work, trigger) {
  sequence = visible.includes(work) ? visible : WORKS;
  opener = trigger;
  show(sequence.indexOf(work));
  lightbox.showModal();
  document.documentElement.style.overflow = "hidden";
}

function openGallery(index, trigger) {
  const photos = activeSeries?.raw?.gallery || [];
  sequence = [{
    title_zh: "系列照片",
    category: "化妝包",
    year: "2021",
    images: photos,
  }];
  opener = trigger;
  show(0, index);
  lightbox.showModal();
  document.documentElement.style.overflow = "hidden";
}

lightbox.addEventListener("close", () => {
  document.documentElement.style.overflow = "";
  opener?.focus({ preventScroll: true });
});

$("lb-close").addEventListener("click", () => lightbox.close());
$("lb-prev").addEventListener("click", () => show(current - 1));
$("lb-next").addEventListener("click", () => show(current + 1));
$("lb-photo-prev").addEventListener("click", () => show(current, photoIndex - 1));
$("lb-photo-next").addEventListener("click", () => show(current, photoIndex + 1));

lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") step(-1);
  if (event.key === "ArrowRight") step(1);
});

let touchX = null;
$("lb-stage").addEventListener("touchstart", (event) => {
  touchX = event.touches[0].clientX;
}, { passive: true });
$("lb-stage").addEventListener("touchend", (event) => {
  if (touchX === null) return;
  const dx = event.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
});

document.querySelector(".hero-open")?.addEventListener("click", (event) => {
  const work = WORKS.find((w) => w.id === event.currentTarget.dataset.work);
  if (work) openLightbox(work, event.currentTarget);
});
