import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
let host = "127.0.0.1";
let port = 4173;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--host" && args[i + 1] && !args[i + 1].startsWith("--")) {
    host = args[++i];
  } else if (args[i] === "--port" && /^\d+$/.test(args[i + 1] || "")) {
    port = Number(args[++i]);
  } else {
    console.error("用法: npm run dev -- [--host 127.0.0.1] [--port 4173]");
    process.exit(1);
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("端口必须是 1–65535 之间的整数。");
  process.exit(1);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
};

function isInsideRoot(candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function reject(res, status, message, head = false) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(head ? undefined : message);
}

const server = createServer(async (req, res) => {
  const head = req.method === "HEAD";
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && !head) {
    res.setHeader("Allow", "GET, HEAD");
    reject(res, 405, "Method not allowed");
    return;
  }

  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const segments = pathname.replaceAll("\\", "/").split("/");
    if (
      pathname.includes("\0") ||
      segments.some((segment) => segment.startsWith(".")) ||
      pathname.includes(":")
    ) {
      reject(res, 403, "Forbidden", head);
      return;
    }

    let target = path.resolve(root, `.${pathname}`);
    if (!isInsideRoot(target)) {
      reject(res, 403, "Forbidden", head);
      return;
    }
    if ((await stat(target)).isDirectory())
      target = path.join(target, "index.html");
    target = await realpath(target);
    if (!isInsideRoot(target)) {
      reject(res, 403, "Forbidden", head);
      return;
    }
    const file = await stat(target);
    if (!file.isFile()) {
      reject(res, 404, "Not found", head);
      return;
    }

    res.writeHead(200, {
      "Content-Type":
        mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": file.size,
      "Cache-Control": "no-cache",
    });
    if (head) {
      res.end();
      return;
    }
    const stream = createReadStream(target);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    if (error instanceof URIError || error.code === "ERR_INVALID_URL") {
      reject(res, 400, "Bad request", head);
    } else if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      reject(res, 404, "Not found", head);
    } else {
      reject(res, 500, "Server error", head);
    }
  }
});

server.on("error", (error) => {
  console.error(`预览服务启动失败: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const urlHost = host.includes(":") ? `[${host}]` : host;
  console.log(`预览已启动: http://${urlHost}:${port}`);
  console.log("按 Ctrl+C 停止服务。");
});
