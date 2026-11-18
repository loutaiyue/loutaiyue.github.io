// Browser commands read local page content; no server is needed.
(() => {
  const terminal = document.querySelector(".terminal-demo");
  const output = terminal?.querySelector(".terminal-transcript");
  const form = terminal?.querySelector(".terminal-form");
  if (!form || !output) return;

  const input = form.querySelector(".terminal-input");
  const submit = form.querySelector(".terminal-submit");
  const status = terminal.querySelector(".terminal-status");
  const reset = document.querySelector(".monitor-power");
  const expand = document.querySelector(".terminal-expand");
  const dialog = document.querySelector(".terminal-dialog");
  const mount = dialog.querySelector(".terminal-mount");
  const home = terminal.parentNode;
  const nextSibling = terminal.nextSibling;
  const fallback = [...output.children].map((node) => node.cloneNode(true));
  const introText = fallback.map(
    (line) => line.querySelector(".terminal-text").textContent,
  );
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 600px)");
  const history = [];
  let historyIndex = 0;
  let draft = "";
  let composing = false;
  let introFrames = [];
  let queue = [];
  let timer = null;
  let visible = false;
  let activeCommand = "";
  let resultCount = 0;
  let booting = document.documentElement.classList.contains("booting");
  let previousOverflow = "";
  let dialogScroll = { top: 0, bottom: true };

  function captureScroll() {
    return {
      top: output.scrollTop,
      bottom: output.scrollHeight - output.scrollTop - output.clientHeight < 28,
    };
  }

  function restoreScroll(position) {
    output.scrollTop = position.bottom ? output.scrollHeight : position.top;
  }

  const cleanText = (node) =>
    node?.textContent.replace(/\s+/g, " ").trim() || "";
  const projects = [...document.querySelectorAll(".project-card")].map(
    (card) => ({
      name: cleanText(card.querySelector("h3")),
      description: cleanText(card.querySelector(".project-caption p")),
      stack: cleanText(card.querySelector(".project-category")),
      url: card.href,
    }),
  );
  const notes = [...document.querySelectorAll(".archive-card")].map((note) => ({
    title: cleanText(note.querySelector(".archive-copy > strong")),
    description: cleanText(note.querySelector(".archive-copy > small")),
  }));
  const row = (text, kind = "", href = "") => ({ text, kind, href });
  const directory = (text) => row(text, "directory");
  const muted = (text) => row(text, "muted");
  const error = (text) => row(text, "error");
  const success = (text) => row(text, "success");

  function appendLine(item) {
    const atBottom =
      output.scrollHeight - output.scrollTop - output.clientHeight < 28;
    const top = output.scrollTop;
    const line = document.createElement("div");
    line.className = `terminal-line terminal-output${item.kind ? ` terminal-${item.kind}` : ""}`;
    if (item.kind === "command") {
      line.className = "terminal-line";
      const prompt = document.createElement("span");
      prompt.className = "terminal-prompt";
      prompt.setAttribute("aria-hidden", "true");
      prompt.textContent = "~ $";
      line.append(prompt);
    }
    const text = document.createElement(item.href ? "a" : "span");
    text.textContent = item.text || "\u00a0";
    if (item.href) {
      text.href = item.href;
      text.target = "_blank";
      text.rel = "noopener noreferrer";
      text.setAttribute("aria-label", `${item.text}（在新标签页打开）`);
    }
    line.append(text);
    output.append(line);
    let removedHeight = 0;
    while (output.children.length > 200) {
      removedHeight += output.firstElementChild.offsetHeight;
      output.firstElementChild.remove();
    }
    output.scrollTop = atBottom
      ? output.scrollHeight
      : Math.max(0, top - removedHeight);
  }

  function setRunning(running) {
    input.readOnly = running;
    submit.textContent = running ? "■" : "↵";
    const label = running ? "停止输出" : "执行命令";
    submit.setAttribute("aria-label", label);
    submit.title = label;
    output.setAttribute("aria-busy", String(running));
    terminal.dataset.state = running ? "running" : "idle";
  }

  function finish() {
    setRunning(false);
    status.textContent = `${activeCommand} 执行完成，输出 ${resultCount} 行。可在终端输出区域查看。`;
  }

  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function sync() {
    stopTimer();
    const active =
      (visible || dialog.open) &&
      !document.hidden &&
      !document.documentElement.classList.contains("booting") &&
      !document.querySelector(".content-dialog[open]");
    terminal.dataset.paused = String(!active);
    if (introFrames.length && motion.matches) {
      while (introFrames.length) applyIntroFrame(introFrames.shift());
      finishIntro();
      return;
    }
    if (introFrames.length) {
      terminal.dataset.state = active ? "intro" : "paused";
      if (!active) return;
      timer = setTimeout(() => {
        timer = null;
        applyIntroFrame(introFrames.shift());
        if (introFrames.length) sync();
        else finishIntro();
      }, introFrames[0].delay);
      return;
    }
    if (!queue.length) return;
    terminal.dataset.state = active ? "running" : "paused";
    if (!active) return;
    if (motion.matches) {
      queue.splice(0).forEach(appendLine);
      finish();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      appendLine(queue.shift());
      if (queue.length) sync();
      else finish();
    }, 95);
  }

  function interrupt() {
    if (!queue.length && !introFrames.length) return;
    const interruptingIntro = introFrames.length > 0;
    stopTimer();
    queue = [];
    introFrames = [];
    if (interruptingIntro) {
      output.querySelectorAll(".terminal-line").forEach((line, index) => {
        line.classList.remove("is-pending", "is-typing");
        line.querySelector(".terminal-text").textContent = introText[index];
      });
    }
    appendLine(muted("^C · 已停止输出"));
    setRunning(false);
    status.textContent = "已停止输出，可以输入下一条命令。";
  }

  const normalizePath = (value = "") =>
    value
      .replace(/^~\/?/, "")
      .replace(/^\.\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

  function projectRows() {
    return [
      success("SELECTED PROJECTS / 02"),
      muted("────────────────────────"),
      ...projects.flatMap((project, index) => [
        directory(`[0${index + 1}] ${project.name}`),
        row(project.description),
        muted(project.stack),
        row("GitHub ↗", "", project.url),
        row(""),
      ]),
      success("更多想法，慢慢实现。"),
    ];
  }

  function listFiles(path) {
    if (!path || path === "." || path === "/home/loutaiyue") {
      return [
        row("about.txt"),
        row("readme.txt"),
        directory("projects/"),
        directory("notes/"),
        directory("favorites/"),
      ];
    }
    if (path === "projects")
      return projects.map((project) => directory(`${project.name}/`));
    if (path === "notes") return notes.map((note) => row(`${note.title}.txt`));
    if (path === "favorites")
      return [row("蕾米埃尔·丹.txt"), muted("试试 favorites 查看这份偏爱。")];
    return [error(`ls: 找不到目录 ${path}`), muted("试试 ls 或 ls projects/")];
  }

  function favoritesRows() {
    return [
      success("FAVORITE / 001"),
      row("蕾米埃尔·丹 / REMIELLE DAN"),
      muted("Zenless Zone Zero · 绝区零"),
      row("“这么说来，我们是…「共犯」？”"),
      row("“这听起来要比「舞伴」更让人心跳加速呢~”"),
      row("关于这份偏爱：理由以后慢慢写。"),
      row("角色官网 ↗", "", "https://zzz.mihoyo.com/character?id=164847"),
      muted("角色与美术 © HoYoverse"),
    ];
  }

  function readFile(path) {
    if (path === "about.txt") {
      return [
        success("ABOUT / LOUTAIYUE"),
        row("一位持续探索中的玩家。"),
        row("写一点代码，收藏一些灵感。"),
        row("这里是我的作品、日常，和还没完成的想法。"),
        row("喜欢二次元，也喜欢把灵感做成小东西。"),
        row("GitHub / @loutaiyue ↗", "", "https://github.com/loutaiyue"),
      ];
    }
    if (path === "readme.txt") {
      return [
        success("WELCOME TO MY FREQUENCY"),
        row("这是一台属于个人频道的小终端。"),
        row("输入 help 查看命令。"),
        row("输入 projects 了解项目。"),
        row("输入 neofetch 看看频道名片。"),
        row("长输出可以向上滚动查看。"),
        row("用 ↑ ↓ 找回历史命令，Ctrl+C 停止输出。"),
        muted("STAY CURIOUS."),
      ];
    }
    const note = notes.find(
      (entry) => normalizePath(`notes/${entry.title}.txt`) === path,
    );
    if (note)
      return [
        success(note.title),
        row(note.description),
        muted("示例随笔 · 完整内容可在页面的随笔区阅读。"),
      ];
    if (path === "favorites/蕾米埃尔·丹.txt") return favoritesRows();
    return [
      error(`cat: 找不到文件 ${path || "（未指定）"}`),
      muted("试试 cat about.txt 或 cat readme.txt"),
    ];
  }

  function commandRows(command, args) {
    switch (command) {
      case "help":
        return [
          success("PERSONAL TERMINAL / COMMANDS"),
          muted("────────────────────────"),
          row("help       查看命令"),
          row("whoami     我是谁"),
          row("ls [目录]  看看这里有什么"),
          row("cat <文件> 读一份小文件"),
          row("tree       展开整个频道目录"),
          row("projects   我的两个项目"),
          row("notes      随笔目录"),
          row("favorites  关于喜欢的角色"),
          row("neofetch   频道名片"),
          row("date       此刻的时间"),
          row("pwd        当前的位置"),
          row("echo <文字> 回声"),
          row("history    本次输入记录"),
          row("clear      清空屏幕"),
          muted("────────────────────────"),
          row("↑ ↓ 历史命令 / Ctrl+L 清屏"),
          row("Ctrl+C 或 ■ 停止输出"),
          muted("试试 tree、projects 或 neofetch。"),
        ];
      case "whoami":
        return [
          success("loutaiyue"),
          row("PLAYER / CREATOR"),
          row("保持好奇，继续探索。"),
        ];
      case "pwd":
        return [row("/home/loutaiyue")];
      case "ls":
        return listFiles(normalizePath(args.join(" ")));
      case "cat":
        return readFile(normalizePath(args.join(" ")));
      case "projects":
        return projectRows();
      case "notes":
        return [
          success("PERSONAL LOG / 示例随笔"),
          ...notes.flatMap((note, index) => [
            directory(`0${index + 1} / ${note.title}`),
            row(note.description),
            row(""),
          ]),
          muted("完整内容可以在页面的随笔区阅读。"),
        ];
      case "favorites":
        return favoritesRows();
      case "tree":
        return [
          directory("/home/loutaiyue"),
          row("├── about.txt"),
          row("├── readme.txt"),
          directory("├── projects/"),
          ...projects.map((project, index) =>
            directory(
              `│   ${index === projects.length - 1 ? "└" : "├"}── ${project.name}/`,
            ),
          ),
          directory("├── notes/"),
          ...notes.map((note, index) =>
            row(
              `│   ${index === notes.length - 1 ? "└" : "├"}── ${note.title}.txt`,
            ),
          ),
          directory("└── favorites/"),
          row("    └── 蕾米埃尔·丹.txt"),
          row(""),
          success(
            `3 个目录 / ${projects.length} 个项目 / ${notes.length} 篇示例随笔`,
          ),
          muted("试试 cat about.txt，读一份文件。"),
        ];
      case "neofetch":
        return [
          success("   /\\      /\\"),
          success("  /  \\____/  \\"),
          success(" |   ●    ●   |"),
          success(" |     __     |"),
          success("  \\__________/"),
          row(""),
          success("loutaiyue@personal-channel"),
          muted("────────────────────────"),
          row("频道 / MY FREQUENCY"),
          row("坐标 / /home/loutaiyue"),
          row("身份 / PLAYER & CREATOR"),
          row("配色 / 荧光黄绿 × CRT"),
          row("小伙伴 / 邦布"),
          row("偏爱 / 蕾米埃尔·丹"),
          row(`项目 / ${projects.length} 个持续探索的小实验`),
          row(`随笔 / ${notes.length} 篇示例，等待新的记录`),
          row("主机 / GitHub Pages"),
          row(
            `外观 / ${document.documentElement.dataset.theme === "dark" ? "深色" : "浅色"}`,
          ),
          row(""),
          success("  ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰"),
          muted("NO PERFECT PLAN. JUST CURIOSITY."),
        ];
      case "date":
        return [
          row(
            new Intl.DateTimeFormat("zh-CN", {
              dateStyle: "full",
              timeStyle: "long",
            }).format(new Date()),
          ),
        ];
      case "echo":
        return [row(args.join(" "))];
      case "history":
        return history.map((entry, index) =>
          row(`${String(index + 1).padStart(2, " ")}  ${entry}`),
        );
      default:
        return [
          error(`找不到命令：${command}`),
          muted("输入 help 查看可用命令。"),
        ];
    }
  }

  function clear() {
    stopTimer();
    queue = [];
    introFrames = [];
    output.replaceChildren();
    setRunning(false);
  }

  function restart() {
    clear();
    const lines = fallback.map((node) => node.cloneNode(true));
    output.append(...lines);
    lines.forEach((line, index) => {
      line.classList.add("is-pending");
      line.querySelector(".terminal-text").textContent = "";
      if (line.hasAttribute("data-command")) {
        introFrames.push({
          row: index,
          text: "",
          delay: index === 0 ? 650 : 260,
        });
        [...introText[index]].forEach((_, charIndex) => {
          introFrames.push({
            row: index,
            text: introText[index].slice(0, charIndex + 1),
            delay: 65,
          });
        });
      } else {
        introFrames.push({ row: index, text: introText[index], delay: 400 });
      }
    });
    input.value = "";
    historyIndex = history.length;
    draft = "";
    status.textContent = "正在播放终端入场演示。";
    setRunning(true);
    output.scrollTop = output.scrollHeight;
    sync();
  }

  function applyIntroFrame(frame) {
    const line = output.children[frame.row];
    output.querySelector(".is-typing")?.classList.remove("is-typing");
    line.classList.toggle("is-typing", line.hasAttribute("data-command"));
    line.classList.remove("is-pending");
    line.querySelector(".terminal-text").textContent = frame.text;
    output.scrollTop = output.scrollHeight;
  }

  function finishIntro() {
    output.querySelector(".is-typing")?.classList.remove("is-typing");
    setRunning(false);
    status.textContent = "入场演示已完成，可以输入 help 查看命令。";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing) return;
    if (queue.length || introFrames.length) {
      interrupt();
      input.focus({ preventScroll: true });
      return;
    }
    const raw = input.value.trim().slice(0, 160);
    if (!raw) return;
    input.value = "";
    if (history.at(-1) !== raw) history.push(raw);
    if (history.length > 30) history.shift();
    historyIndex = history.length;
    draft = "";
    const [command, ...args] = raw.split(/\s+/);
    activeCommand = command.toLowerCase();
    if (activeCommand === "clear") {
      clear();
      status.textContent = "屏幕已清空。";
      return;
    }
    appendLine(row(raw, "command"));
    output.scrollTop = output.scrollHeight;
    queue = commandRows(activeCommand, args);
    resultCount = queue.length;
    status.textContent = `${activeCommand} 正在输出。`;
    setRunning(true);
    input.focus({ preventScroll: true });
    sync();
  });

  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
  });
  input.addEventListener("keydown", (event) => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    } else if (
      !queue.length &&
      !introFrames.length &&
      ["ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(
        0,
        Math.min(
          history.length,
          historyIndex + (event.key === "ArrowUp" ? -1 : 1),
        ),
      );
      input.value =
        historyIndex === history.length ? draft : history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  terminal.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.isComposing) return;
    const key = event.key.toLowerCase();
    if (
      key === "c" &&
      !window.getSelection()?.toString() &&
      input.selectionStart === input.selectionEnd
    ) {
      event.preventDefault();
      interrupt();
    } else if (key === "l") {
      event.preventDefault();
      clear();
      status.textContent = "屏幕已清空。";
    }
  });

  function expandTerminal() {
    if (dialog.open) return;
    const position = captureScroll();
    previousOverflow = document.body.style.overflow;
    mount.append(terminal);
    dialog.showModal();
    document.body.style.overflow = "hidden";
    restoreScroll(position);
    input.focus({ preventScroll: true });
    sync();
  }

  expand.addEventListener("click", expandTerminal);
  input.addEventListener("focus", () => {
    if (compact.matches && !dialog.open) expandTerminal();
  });
  dialog.querySelector(".terminal-close").addEventListener("click", () => {
    dialogScroll = captureScroll();
    dialog.close();
  });
  dialog.addEventListener("cancel", () => {
    dialogScroll = captureScroll();
  });
  dialog.addEventListener("close", () => {
    home.insertBefore(terminal, nextSibling);
    document.body.style.overflow = previousOverflow;
    restoreScroll(dialogScroll);
    expand.focus({ preventScroll: true });
    sync();
  });
  dialog.querySelector(".terminal-reset").addEventListener("click", () => {
    restart();
    input.focus({ preventScroll: true });
  });
  reset.addEventListener("click", restart);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        sync();
      },
      { threshold: [0, 0.25] },
    ).observe(document.querySelector(".monitor"));
  } else visible = true;
  const articleDialog = document.querySelector(".content-dialog");
  if (articleDialog)
    new MutationObserver(sync).observe(articleDialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("channel:bootchange", () => {
    const nextBooting = document.documentElement.classList.contains("booting");
    const starting = nextBooting && !booting;
    booting = nextBooting;
    if (starting) restart();
    else sync();
  });
  motion.addEventListener("change", sync);
  form.hidden = false;
  expand.hidden = false;
  reset.disabled = false;
  restart();
})();
