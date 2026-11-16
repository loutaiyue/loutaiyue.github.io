// 在这里修改昵称与随笔；项目卡片和 GitHub 链接位于 index.html。
const profile = { name: "loutaiyue", title: "个人频道 / PERSONAL CHANNEL" };

const archive = {
  window: {
    type: "PERSONAL LOG / 001",
    category: "关于这里 · 示例随笔",
    title: "给互联网留一扇自己的窗",
    paragraphs: [
      "互联网上有很多地方可以说话，但还是想留一扇自己的窗。窗里面不一定有多么了不起的东西，也许只是最近做的小项目、读到的一句话，以及一些没有答案的想法。",
      "这里可以不那么整齐。文章不必每次都很完整，项目也不必等到无可挑剔才出现。看到一个想法一点点变成现实，和看到完成后的结果一样有意思。",
      "如果有人偶然路过，发现我们喜欢同一部作品，或被同一个问题吸引，那就是这扇窗带来的小小惊喜。",
      "先把窗打开。剩下的，慢慢来。",
    ],
    note: "以上是页面演示用的示例文章，可以在 app.js 中替换。",
  },
  making: {
    type: "PERSONAL LOG / 002",
    category: "折腾日常 · 示例随笔",
    title: "把灵感做成小东西",
    paragraphs: [
      "一个小工具的开头，通常只是一句「这件事能不能更方便一点」。它不一定新鲜，也不需要解决所有人的问题。能让自己少做一次重复操作，就足够开始。",
      "先把最小的一部分做出来。在真正使用的过程中，才会发现哪里别扭、哪里多余，以及接下来最想改的是什么。",
      "从「如果可以」到「已经可以」，中间的距离常常比想象中短。把第一步做小一点，今天就能走过去。",
    ],
    note: "以上是页面演示用的示例文章，可以在 app.js 中替换。",
  },
  slow: {
    type: "PERSONAL LOG / 003",
    category: "生活碎片 · 示例随笔",
    title: "最近，想慢一点",
    paragraphs: [
      "有时候，一个周末只想看完一部番，出去走走，再把喜欢的歌听一遍。没有学习计划，也没有必须交出的成果。",
      "这些时间不是空白。画面、声音和走过的路，会在某个意想不到的时刻，成为新的想法。",
      "给没有产出的时刻留个位置。好奇心也需要休息，然后再出发。",
    ],
    note: "以上是页面演示用的示例文章，可以在 app.js 中替换。",
  },
};

document.title = profile.title;
document.querySelectorAll('[data-profile="name"]').forEach((el) => {
  el.textContent = profile.name;
});
document.getElementById("year").textContent = new Date().getFullYear();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const boot = document.querySelector(".boot-screen");
const skipBoot = document.querySelector(".boot-skip");
const appRegions = [
  ...document.querySelectorAll(
    ".site-header, main, .site-footer, .section-rail",
  ),
];
let bootTimer;
let bootHideTimer;
let bootActive = false;
let bootIsReplay = false;
let bootCycle = 0;

function finishBoot() {
  if (!bootActive) return;
  bootActive = false;
  clearTimeout(window.bootSafetyTimer);
  clearTimeout(bootTimer);
  document.getElementById("boot-status").textContent = "频道已就绪。";
  boot.classList.add("is-leaving");
  document.documentElement.classList.remove("booting");
  appRegions.forEach((region) => {
    region.inert = false;
  });
  document.dispatchEvent(new Event("channel:bootchange"));
  const shouldRestoreFocus = boot.contains(document.activeElement);
  bootHideTimer = setTimeout(
    () => {
      boot.hidden = true;
      if (shouldRestoreFocus) {
        const focusTarget = bootIsReplay
          ? document.querySelector(".replay-button")
          : document.querySelector(".brand");
        focusTarget.focus({ preventScroll: true });
      }
    },
    reducedMotion.matches ? 0 : 760,
  );
}

function startBoot({ replay = false } = {}) {
  clearTimeout(bootTimer);
  clearTimeout(bootHideTimer);
  const currentCycle = ++bootCycle;
  bootIsReplay = replay;
  bootActive = true;
  boot.hidden = false;
  boot.classList.remove("is-leaving");
  document.documentElement.classList.add("booting");
  document.getElementById("boot-status").textContent = "正在接入个人频道…";
  appRegions.forEach((region) => {
    region.inert = true;
  });
  document.dispatchEvent(new Event("channel:bootchange"));
  if (replay) {
    window.scrollTo({ top: 0, behavior: "instant" });
    skipBoot.focus({ preventScroll: true });
  }
  const image = document.querySelector(".mascot img");
  const imageReady = image.decode
    ? image.decode().catch(() => {})
    : Promise.resolve();
  const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const earliestReveal = new Promise((resolve) =>
    setTimeout(resolve, reducedMotion.matches ? 0 : 850),
  );
  bootTimer = setTimeout(finishBoot, 4200);
  Promise.all([imageReady, fontReady, earliestReveal]).then(() => {
    if (bootActive && currentCycle === bootCycle) finishBoot();
  });
}
skipBoot.addEventListener("click", finishBoot);
document
  .querySelector(".replay-button")
  .addEventListener("click", () => startBoot({ replay: true }));
startBoot();

const sections = [...document.querySelectorAll("main > section[id]")];
const motionSections = [...document.querySelectorAll(".section")].map(
  (section) => ({ section, items: [...section.querySelectorAll(".reveal")] }),
);
const revealElements = [...document.querySelectorAll(".reveal")];
const desktopMotion = window.matchMedia(
  "(min-width: 901px) and (pointer: fine)",
);

// Each item enters independently, including rows below the fold on phones.
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -64px 0px" },
  );
  revealElements.forEach((el) => revealObserver.observe(el));
  document.documentElement.classList.add("motion-ready");
}

document.addEventListener("focusin", (event) => {
  const item = event.target.closest(".reveal");
  if (!item) return;
  item.classList.add("is-visible");
  item.closest(".section")?.classList.add("is-visible");
});

const navigationLinks = [
  ...document.querySelectorAll(".main-nav a, .section-rail a"),
];
let scrollFrame = null;
function updateSection() {
  scrollFrame = null;
  const viewportHeight = window.innerHeight;
  const marker = viewportHeight * 0.36;
  // Read all geometry before writing styles; transforms never move the sections.
  const rects = new Map(
    sections.map((section) => [section, section.getBoundingClientRect()]),
  );
  let current = sections[0].id;
  sections.forEach((section) => {
    if (rects.get(section).top <= marker) current = section.id;
  });
  motionSections.forEach(({ section, items }) => {
    const rect = rects.get(section);
    if (
      reducedMotion.matches ||
      (rect.top < viewportHeight * 0.92 && rect.bottom > 0)
    ) {
      section.classList.add("is-visible");
    } else if (
      section.classList.contains("is-visible") &&
      (rect.bottom < -160 || rect.top > viewportHeight + 160)
    ) {
      // Re-arm only after the whole chapter leaves, so tiny scrolls never flicker.
      section.classList.remove("is-visible");
      items.forEach((item) => {
        if (!item.contains(document.activeElement))
          item.classList.remove("is-visible");
      });
    }
    if (!reducedMotion.matches && desktopMotion.matches && !document.hidden) {
      const centerOffset =
        (viewportHeight / 2 - (rect.top + rect.height / 2)) * 0.045;
      const shift = Math.max(-18, Math.min(18, centerOffset));
      section.style.setProperty("--section-shift", `${shift.toFixed(1)}px`);
    } else {
      section.style.setProperty("--section-shift", "0px");
    }
  });
  navigationLinks.forEach((link) => {
    const active = link.hash === `#${current}`;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
function scheduleSectionUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateSection);
}
window.addEventListener("scroll", scheduleSectionUpdate, { passive: true });
window.addEventListener("resize", scheduleSectionUpdate);
reducedMotion.addEventListener("change", scheduleSectionUpdate);
desktopMotion.addEventListener("change", scheduleSectionUpdate);
document.addEventListener("channel:bootchange", scheduleSectionUpdate);
updateSection();

// Move only artwork layers; pointer movement never shifts links or text.
const favoriteStage = document.querySelector(".favorite-stage");
let favoriteFrame = null;
let favoritePoint = null;
function resetFavoriteParallax() {
  if (favoriteFrame !== null) cancelAnimationFrame(favoriteFrame);
  favoriteFrame = null;
  favoritePoint = null;
  favoriteStage.style.removeProperty("--favorite-x");
  favoriteStage.style.removeProperty("--favorite-y");
}
favoriteStage.addEventListener(
  "pointermove",
  (event) => {
    if (
      event.pointerType !== "mouse" ||
      !desktopMotion.matches ||
      reducedMotion.matches ||
      bootActive ||
      document.hidden
    )
      return;
    favoritePoint = { x: event.clientX, y: event.clientY };
    if (favoriteFrame !== null) return;
    favoriteFrame = requestAnimationFrame(() => {
      favoriteFrame = null;
      const bounds = favoriteStage.getBoundingClientRect();
      const x = Math.max(
        -1,
        Math.min(1, ((favoritePoint.x - bounds.left) / bounds.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((favoritePoint.y - bounds.top) / bounds.height) * 2 - 1),
      );
      favoriteStage.style.setProperty(
        "--favorite-x",
        `${(x * 10).toFixed(2)}px`,
      );
      favoriteStage.style.setProperty(
        "--favorite-y",
        `${(y * 7).toFixed(2)}px`,
      );
    });
  },
  { passive: true },
);
favoriteStage.addEventListener("pointerleave", resetFavoriteParallax);
favoriteStage.addEventListener("pointercancel", resetFavoriteParallax);
window.addEventListener("blur", resetFavoriteParallax);
window.addEventListener("scroll", resetFavoriteParallax, { passive: true });
document.addEventListener("visibilitychange", resetFavoriteParallax);
document.addEventListener("channel:bootchange", resetFavoriteParallax);
reducedMotion.addEventListener("change", resetFavoriteParallax);
desktopMotion.addEventListener("change", resetFavoriteParallax);

const mascot = document.querySelector(".mascot");
const speech = document.querySelector(".mascot-speech");
const mascotImage = mascot.querySelector("img");
const mascotHint = mascot.querySelector(".mascot-hint");
const greetings = [
  "嗯呢！欢迎来到你的频道。",
  "今天也要保持好奇！",
  "灵感正在路上，再等它一下。",
  "嗯呢嗯呢！一起做点好玩的。",
];
let greetingIndex = 0;
let speechTimeout;
let actionTimeout;
let napTimeout;
let mascotVisible = false;
let companionActive = false;
let lastPoke = 0;
let pokeCount = 0;

function setMascotMood(mood) {
  mascot.dataset.mood = mood;
  const asleep = mood === "sleep";
  mascotHint.textContent = asleep ? "戳戳，叫醒我 ☀" : "戳我一下 ↗";
  mascot.setAttribute(
    "aria-label",
    asleep ? "叫醒正在打盹的邦布" : "和邦布打个招呼",
  );
}

function scheduleNap() {
  clearTimeout(napTimeout);
  if (!companionActive || reducedMotion.matches) return;
  napTimeout = setTimeout(() => setMascotMood("sleep"), 14000);
}

function playMascotAction(mood, duration) {
  clearTimeout(actionTimeout);
  clearTimeout(napTimeout);
  // Keep the button still; restart only the image's motion on repeated taps.
  setMascotMood("idle");
  if (!reducedMotion.matches) {
    void mascotImage.offsetWidth;
    setMascotMood(mood);
  }
  actionTimeout = setTimeout(
    () => {
      setMascotMood("idle");
      scheduleNap();
    },
    reducedMotion.matches ? 0 : duration,
  );
}

function syncCompanionActivity() {
  companionActive =
    mascotVisible &&
    !document.hidden &&
    !bootActive &&
    !document.querySelector(".content-dialog[open]");
  mascot.dataset.paused = String(!companionActive);
  clearTimeout(actionTimeout);
  clearTimeout(napTimeout);
  clearTimeout(speechTimeout);
  speech.hidden = true;
  lastPoke = 0;
  pokeCount = 0;
  setMascotMood("idle");
  if (companionActive) scheduleNap();
}

function noticeVisitor() {
  if (
    !companionActive ||
    reducedMotion.matches ||
    mascot.dataset.mood !== "idle"
  )
    return;
  playMascotAction("curious", 1600);
}

mascot.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") noticeVisitor();
});
mascot.addEventListener("focusin", noticeVisitor);
mascot.addEventListener("click", () => {
  if (!companionActive) return;
  const asleep = mascot.dataset.mood === "sleep";
  const now = performance.now();
  pokeCount = now - lastPoke < 800 ? pokeCount + 1 : 1;
  lastPoke = now;
  const excited = pokeCount >= 3;
  const mood = asleep
    ? "wake"
    : excited
      ? "happy"
      : greetingIndex % 2
        ? "wiggle"
        : "hop";
  const message = asleep
    ? "嗯呢？！我醒着呢…只是闭目养神。"
    : excited
      ? "嗯呢嗯呢！电量满格，陪你玩！"
      : greetings[greetingIndex % greetings.length];
  greetingIndex += 1;
  playMascotAction(
    mood,
    { wake: 1000, happy: 1400, wiggle: 1100, hop: 850 }[mood],
  );
  clearTimeout(speechTimeout);
  speech.textContent = message;
  speech.hidden = false;
  speechTimeout = setTimeout(() => {
    speech.hidden = true;
  }, 3200);
});

// Stop background work when the companion cannot be seen or interacted with.
if ("IntersectionObserver" in window) {
  const companionObserver = new IntersectionObserver(
    ([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      if (mascotVisible === visible) return;
      mascotVisible = visible;
      syncCompanionActivity();
    },
    { threshold: [0, 0.25] },
  );
  companionObserver.observe(mascot);
} else {
  mascotVisible = true;
}
document.addEventListener("visibilitychange", syncCompanionActivity);
document.addEventListener("channel:bootchange", syncCompanionActivity);
reducedMotion.addEventListener("change", syncCompanionActivity);
syncCompanionActivity();

const terminalGreetings = [
  "欢迎接入我的小世界。",
  "小想法，也值得被认真对待。",
  "今天想做点什么？",
  "频道在线，好奇心也在线。",
];
let terminalIndex = 0;
document.querySelector(".monitor-power").addEventListener("click", () => {
  document.querySelector(".monitor-screen > p").textContent =
    terminalGreetings[++terminalIndex % terminalGreetings.length];
});

const dialog = document.querySelector(".content-dialog");
let dialogOpener = null;
document.querySelectorAll("[data-content]").forEach((button) => {
  button.addEventListener("click", () => {
    const content = archive[button.dataset.content];
    if (!content) return;
    dialogOpener = button;
    document.getElementById("dialog-label").textContent = content.type;
    document.getElementById("dialog-kicker").textContent = content.category;
    document.getElementById("dialog-title").textContent = content.title;
    const body = document.getElementById("dialog-body");
    body.replaceChildren();
    content.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      body.appendChild(p);
    });
    const note = document.createElement("p");
    note.className = "sample-note";
    note.textContent = content.note;
    body.appendChild(note);
    dialog.showModal();
    syncCompanionActivity();
    dialog.scrollTop = 0;
    document.body.style.overflow = "hidden";
  });
});
document
  .querySelectorAll(".dialog-close")
  .forEach((button) => button.addEventListener("click", () => dialog.close()));
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => {
  document.body.style.overflow = "";
  syncCompanionActivity();
  dialogOpener?.focus({ preventScroll: true });
});
