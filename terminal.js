// A short, scripted terminal scene; the complete transcript is the HTML fallback.
(() => {
  const demo = document.querySelector(".terminal-demo");
  const replay = document.querySelector(".monitor-power");
  const cursor = demo.querySelector(".terminal-cursor");
  const lines = [...demo.querySelectorAll(".terminal-line")];
  const textNodes = lines.map((line) => line.querySelector(".terminal-text"));
  const transcript = textNodes.map((node) => node.textContent);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const frames = [];
  let timer = null;
  let frameIndex = 0;
  let visible = false;
  let booting = document.documentElement.classList.contains("booting");

  lines.forEach((line, row) => {
    const command = line.hasAttribute("data-command");
    if (command) {
      frames.push({ row, text: "", delay: row === 0 ? 650 : 260 });
      [...transcript[row]].forEach((_, index) => {
        frames.push({
          row,
          text: transcript[row].slice(0, index + 1),
          delay: 65,
        });
      });
    } else {
      frames.push({ row, text: transcript[row], delay: 400 });
    }
  });

  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function showComplete() {
    stopTimer();
    lines.forEach((line, row) => {
      line.classList.remove("is-pending");
      textNodes[row].textContent = transcript[row];
    });
    lines.at(-1).append(cursor);
    cursor.hidden = false;
    frameIndex = frames.length;
    demo.dataset.state = "complete";
  }

  function sync() {
    stopTimer();
    const active =
      visible &&
      !document.hidden &&
      !document.documentElement.classList.contains("booting") &&
      !document.querySelector(".content-dialog[open]");
    demo.dataset.paused = String(!active || motion.matches);
    if (motion.matches) {
      showComplete();
      return;
    }
    if (frameIndex >= frames.length) return;
    demo.dataset.state = active ? "playing" : "paused";
    if (!active) return;
    const frame = frames[frameIndex];
    timer = setTimeout(() => {
      timer = null;
      const line = lines[frame.row];
      line.classList.remove("is-pending");
      textNodes[frame.row].textContent = frame.text;
      cursor.hidden = !line.hasAttribute("data-command");
      line.append(cursor);
      frameIndex += 1;
      if (frameIndex === frames.length) demo.dataset.state = "complete";
      sync();
    }, frame.delay);
  }

  function restart() {
    stopTimer();
    frameIndex = 0;
    lines.forEach((line, row) => {
      line.classList.toggle("is-pending", row !== 0);
      textNodes[row].textContent = "";
    });
    lines[0].append(cursor);
    cursor.hidden = false;
    sync();
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        sync();
      },
      { threshold: [0, 0.25] },
    ).observe(demo);
  } else {
    visible = true;
  }
  new MutationObserver(sync).observe(
    document.querySelector(".content-dialog"),
    {
      attributes: true,
      attributeFilter: ["open"],
    },
  );
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("channel:bootchange", () => {
    const nextBooting = document.documentElement.classList.contains("booting");
    const starting = nextBooting && !booting;
    booting = nextBooting;
    if (starting) restart();
    else sync();
  });
  motion.addEventListener("change", sync);
  replay.addEventListener("click", restart);
  replay.disabled = false;
  restart();
})();
