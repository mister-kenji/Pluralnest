/**
 * Standalone production server for Expo static builds.
 *
 * Routing priority:
 *  1. Expo Go requests  (expo-platform header)  → platform manifest JSON
 *  2. /sw.js            (any request)            → public/sw.js  (with SW headers)
 *  3. /manifest.json    (browser request)        → public/manifest.json
 *  4. Other /public/*   (icon.png, favicon.png…) → public/<file>
 *  5. Browser at /      (no expo-platform)       → dist/index.html  (PWA shell)
 *  6. dist/*            (js, css, assets…)       → static-build/ fall-through
 *  7. Fallback          (no dist yet)            → Expo Go landing page
 *
 * Mobile experience is completely unchanged — Expo Go requests still receive
 * the correct platform manifests and JS bundles.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT  = path.resolve(__dirname, "..", "static-build");
const DIST_ROOT    = path.resolve(__dirname, "..", "dist");
const PUBLIC_ROOT  = path.resolve(__dirname, "..", "public");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".map":  "application/json",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
};

function mime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function getAppName() {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "..", "app.json"), "utf-8")
    );
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

// ── Responders ───────────────────────────────────────────────────────────────

function serveFile(filePath, res, extraHeaders = {}) {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "content-type": mime(filePath),
    "cache-control": "public, max-age=3600",
    ...extraHeaders,
  });
  res.end(content);
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(fs.readFileSync(manifestPath, "utf-8"));
}

function serveLandingPage(req, res, template, appName) {
  const proto  = req.headers["x-forwarded-proto"] || "https";
  const host   = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${proto}://${host}`;

  const html = template
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, host)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not Found"); return;
  }
  serveFile(filePath, res);
}

// ── Setup ────────────────────────────────────────────────────────────────────

const landingPageTemplate = fs.existsSync(TEMPLATE_PATH)
  ? fs.readFileSync(TEMPLATE_PATH, "utf-8")
  : "<html><body><p>No landing page template found.</p></body></html>";

const appName = getAppName();

// ── Request handler ──────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // 1. Expo Go mobile requests — serve platform manifest (unchanged behaviour)
  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
  }

  // 2. Service worker — must be served with Service-Worker-Allowed header so it
  //    can claim the full origin scope.
  if (pathname === "/sw.js") {
    const swPath = path.join(PUBLIC_ROOT, "sw.js");
    if (fs.existsSync(swPath)) {
      const content = fs.readFileSync(swPath);
      res.writeHead(200, {
        "content-type": "application/javascript; charset=utf-8",
        "service-worker-allowed": "/",
        "cache-control": "no-cache, no-store, must-revalidate",
      });
      return res.end(content);
    }
    res.writeHead(404); return res.end("sw.js not found");
  }

  // 3. PWA manifest (browser)
  if (pathname === "/manifest.json" || pathname === "/manifest.webmanifest") {
    const manifestPath = path.join(PUBLIC_ROOT, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      return serveFile(manifestPath, res, {
        "cache-control": "public, max-age=86400",
      });
    }
  }

  // 4. Other public/ assets (icons, etc.)
  if (pathname !== "/") {
    const publicFile = path.join(PUBLIC_ROOT, path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, ""));
    if (
      publicFile.startsWith(PUBLIC_ROOT) &&
      fs.existsSync(publicFile) &&
      fs.statSync(publicFile).isFile()
    ) {
      return serveFile(publicFile, res);
    }
  }

  // 5. Browser navigation to root — serve the PWA shell (dist/index.html)
  //    when a web export exists.
  if (pathname === "/") {
    const distIndex = path.join(DIST_ROOT, "index.html");
    if (fs.existsSync(distIndex)) {
      const content = fs.readFileSync(distIndex, "utf-8");
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      });
      return res.end(content);
    }
    // No web export yet — show the Expo Go landing page
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  // 6. dist/ assets (JS bundles, CSS, images from web export)
  if (fs.existsSync(DIST_ROOT)) {
    const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    const distFile = path.join(DIST_ROOT, safePath);
    if (
      distFile.startsWith(DIST_ROOT) &&
      fs.existsSync(distFile) &&
      fs.statSync(distFile).isFile()
    ) {
      return serveFile(distFile, res);
    }
    // SPA fallback: return index.html for unrecognised paths so client-side
    // routing works after a hard refresh.
    const distIndex = path.join(DIST_ROOT, "index.html");
    if (fs.existsSync(distIndex)) {
      const content = fs.readFileSync(distIndex, "utf-8");
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      });
      return res.end(content);
    }
  }

  // 7. Fallback to static-build/ (Expo Go bundles & assets)
  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  const hasWebExport = fs.existsSync(path.join(DIST_ROOT, "index.html"));
  console.log(`PluralNest server listening on port ${port}`);
  console.log(`  Web PWA:  ${hasWebExport ? "✓ dist/index.html ready" : "✗ run 'pnpm export:web' to build"}`);
  console.log(`  Expo Go:  ✓ platform manifests served from static-build/`);
});
