/* Shuyi Studio Art Gallery
   A work keeps one number. Each entry in `stages` is a date plus a photograph.
   The grid and the opened view show the newest date first, then older dates.
   A later entry with the same date counts as newer.
*/

const SITE = "Shuyi Studio Art Gallery";

const seriesFile = document.body.dataset.seriesFile || "";
if (document.body.dataset.page === "series" && !seriesFile) {
  location.replace("index.html");
} else if (seriesFile) {
  await init(seriesFile);
}

async function init(file) {
  const [works, series] = await Promise.all([
    fetch("works.json").then((response) => (response.ok ? response.json() : [])).catch(() => []),
    fetch(file).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  ]);

  const byId = new Map((Array.isArray(works) ? works : []).map((work) => [work.id, work]));
  const ordered = (Array.isArray(series?.workIds) ? series.workIds : [])
    .map((id) => byId.get(id))
    .filter((work) => work && stagesOf(work).length);

  const grid = document.getElementById("works");
  const intro = document.getElementById("series-intro");
  const heading = document.getElementById("series-title");
  if (heading && series?.title) heading.textContent = series.title;
  const en = document.querySelector(".series-en");
  if (en && series?.title_en) en.textContent = series.title_en;
  if (intro && series?.intro) intro.textContent = series.intro;

  if (grid && ordered.length) render(grid, ordered);
  else if (grid && !grid.children.length) {
    const note = document.createElement("p");
    note.textContent = "作品暫時無法載入，請重新整理頁面。";
    grid.replaceWith(note);
  }

  const groups = [];
  if (ordered.length) groups.push(ordered);
  for (const chapterWorks of chapterGroups(series, byId)) {
    if (chapterWorks.length) groups.push(chapterWorks);
  }
  wireLightbox(groups.length ? groups : [readStatic(grid)]);
}

// A series owns its works, then subcollections. One chapter is a single chapter;
// more than one chapter is multi-chapter. Each chapter lists work ids.
function chapterGroups(series, byId) {
  const subs = Array.isArray(series?.subcollections) ? series.subcollections : [];
  const groups = [];
  for (const sub of subs) {
    const chapters = Array.isArray(sub?.chapters) ? sub.chapters : [];
    const display = sub?.display || {};
    chapters.forEach((chapter) => {
      const ids = Array.isArray(chapter?.workIds) ? chapter.workIds : [];
      const works = ids.map((id) => byId.get(id)).filter((work) => work && stagesOf(work).length);
      const grid = chapter?.id ? document.querySelector(`[data-chapter="${chapter.id}"]`) : null;
      if (grid) {
        if (display.chapterNumber === false) grid.dataset.chapterNumber = "false";
        if (display.workDate === false) grid.dataset.workDate = "false";
        if (works.length) render(grid, works);
      }
      groups.push(works);
    });
  }
  return groups;
}

function dateParts(date) {
  const match = /^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?$/.exec(String(date).trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : 0];
}

function compareDates(a, b) {
  const pa = dateParts(a);
  const pb = dateParts(b);
  if (pa && pb) {
    for (let i = 0; i < pa.length; i += 1) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  }
  if (pa) return 1;
  if (pb) return -1;
  const left = String(a);
  const right = String(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// Newest date first. The same date keeps JSON order, with the later entry newer.
function stagesOf(work) {
  if (!Array.isArray(work?.stages)) return [];
  return work.stages
    .map((stage, index) => ({ stage, index }))
    .filter(({ stage }) => stage && stage.src && stage.date)
    .sort((a, b) => {
      const byDate = compareDates(b.stage.date, a.stage.date);
      if (byDate !== 0) return byDate;
      return b.index - a.index;
    })
    .map(({ stage }) => stage);
}

function latest(work) {
  return stagesOf(work)[0] || null;
}

function altOf(work, stage) {
  if (work.alt) return work.alt;
  return `${SITE}，${work.title_zh}，${stage.date}`;
}

function render(grid, works) {
  const existing = new Map(
    [...grid.querySelectorAll("[data-id]")].map((node) => [node.dataset.id, node.closest(".work")]),
  );
  const fragment = document.createDocumentFragment();
  works.forEach((work, index) => {
    fragment.append(existing.get(work.id) || createTile(work, index));
    const tile = fragment.lastChild;
    syncTile(tile, work, index);
  });
  grid.replaceChildren(fragment);
}

function createTile(work, index) {
  const stage = latest(work);
  const li = document.createElement("li");
  li.className = "work";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "work-open";
  button.dataset.id = work.id;

  const frame = document.createElement("span");
  frame.className = "work-frame";
  const picture = document.createElement("picture");
  const source = document.createElement("source");
  source.type = "image/webp";
  const img = document.createElement("img");
  img.decoding = "async";
  picture.append(source, img);
  frame.append(picture);

  const label = document.createElement("span");
  label.className = "work-label";
  const title = document.createElement("span");
  title.className = "work-title";
  const date = document.createElement("span");
  date.className = "work-date";
  label.append(title, date);
  button.append(frame, label);
  li.append(button);
  syncTile(li, work, index);
  return li;
}

function syncTile(tile, work, index) {
  const stage = latest(work);
  const button = tile.querySelector(".work-open");
  button.dataset.id = work.id;
  const source = tile.querySelector("source");
  const img = tile.querySelector("img");
  if (source.getAttribute("srcset") !== stage.src_webp) source.srcset = stage.src_webp;
  if (img.getAttribute("src") !== stage.src) img.src = stage.src;
  img.width = stage.w;
  img.height = stage.h;
  img.alt = altOf(work, stage);
  if (index === 0) img.setAttribute("fetchpriority", "high");
  else img.loading = "lazy";
  tile.querySelector(".work-title").textContent = work.title_zh;
  tile.querySelector(".work-date").textContent = stage.date;
  button.setAttribute("aria-label", `${work.title_zh}，${stage.date}`);
}

function readStatic(grid) {
  if (!grid) return [];
  return [...grid.querySelectorAll(".work-open")].map((button) => {
    const img = button.querySelector("img");
    const source = button.querySelector("source");
    return {
      id: button.dataset.id,
      title_zh: button.querySelector(".work-title")?.textContent || "",
      stages: [{
        date: button.querySelector(".work-date")?.textContent || "",
        src: img?.getAttribute("src") || "",
        src_webp: source?.getAttribute("srcset") || "",
        w: Number(img?.getAttribute("width")) || 1,
        h: Number(img?.getAttribute("height")) || 1,
      }],
    };
  }).filter((work) => work.stages[0].src);
}

function wireLightbox(groups) {
  const lists = (Array.isArray(groups) ? groups : []).filter((list) => list?.length);
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbSource = document.getElementById("lb-source");
  if (!lightbox || !lists.length) return;

  let works = lists[0];
  let current = 0;
  let stageIndex = 0;
  let opener = null;

  function show(workIndex, nextStage) {
    current = (workIndex + works.length) % works.length;
    const work = works[current];
    const stages = stagesOf(work);
    stageIndex = nextStage == null ? 0 : (nextStage + stages.length) % stages.length;
    const stage = stages[stageIndex];

    lbSource.srcset = stage.src_webp || "";
    lbImg.src = stage.src;
    lbImg.alt = altOf(work, stage);
    document.getElementById("lb-count").textContent = `${current + 1} / ${works.length}`;
    document.getElementById("lb-title").textContent = work.title_zh;
    document.getElementById("lb-date").textContent = stage.date;

    const dates = document.getElementById("lb-dates");
    dates.replaceChildren();
    if (stages.length > 1) {
      dates.hidden = false;
      stages.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.date;
        button.setAttribute("aria-pressed", String(index === stageIndex));
        button.setAttribute("aria-label", item.date);
        button.addEventListener("click", () => show(current, index));
        dates.append(button);
      });
    } else {
      dates.hidden = true;
    }

    const single = works.length < 2;
    document.getElementById("lb-prev").hidden = single;
    document.getElementById("lb-next").hidden = single;
  }

  function open(id, trigger) {
    works = lists.find((list) => list.some((work) => work.id === id)) || lists[0];
    const index = works.findIndex((work) => work.id === id);
    if (index < 0) return;
    opener = trigger;
    show(index);
    lightbox.showModal();
    document.documentElement.style.overflow = "hidden";
  }

  document.querySelector("main")?.addEventListener("click", (event) => {
    const button = event.target.closest("button.work-open");
    if (!button) return;
    open(button.dataset.id, button);
  });

  function close() {
    if (lightbox.open) lightbox.close();
  }

  lightbox.addEventListener("close", () => {
    document.documentElement.style.overflow = "";
    opener?.focus({ preventScroll: true });
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("button, img, picture, .lb-caption")) return;
    close();
  });
  document.getElementById("lb-close").addEventListener("click", close);
  document.getElementById("lb-prev").addEventListener("click", () => show(current - 1));
  document.getElementById("lb-next").addEventListener("click", () => show(current + 1));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(current + 1);
    }
  });

  let touchX = null;
  lightbox.addEventListener("touchstart", (event) => {
    touchX = event.touches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (event) => {
    if (touchX == null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 48) show(current + (dx < 0 ? 1 : -1));
  });
}
