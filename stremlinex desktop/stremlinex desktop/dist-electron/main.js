import { app as l, ipcMain as r, desktopCapturer as m, BrowserWindow as a } from "electron";
import n from "node:path";
import { fileURLToPath as u } from "node:url";
const c = n.dirname(u(import.meta.url));
process.env.APP_ROOT = n.join(c, "..");
const p = process.env.VITE_DEV_SERVER_URL, v = n.join(process.env.APP_ROOT, "dist-electron"), d = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = p ? n.join(process.env.APP_ROOT, "public") : d;
let o, e, i;
function h() {
  o = new a({
    width: 600,
    height: 600,
    minHeight: 600,
    minWidth: 300,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    focusable: !1,
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      devTools: !0,
      preload: n.join(c, "preload.mjs")
    }
  }), e = new a({
    width: 400,
    height: 50,
    minHeight: 70,
    maxHeight: 400,
    minWidth: 300,
    maxWidth: 400,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    focusable: !1,
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      devTools: !0,
      preload: n.join(c, "preload.mjs")
    }
  }), i = new a({
    width: 400,
    height: 200,
    minHeight: 70,
    maxHeight: 400,
    minWidth: 300,
    maxWidth: 400,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    focusable: !1,
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      devTools: !0,
      preload: n.join(c, "preload.mjs")
    }
  }), o.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), o.setAlwaysOnTop(!0, "screen-saver", 1), e.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), e.setAlwaysOnTop(!0, "screen-saver", 1), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  }), p ? (o.loadURL(p), e.loadURL("http://localhost:5173/studio.html"), i.loadURL("http://localhost:5173/webcam.html")) : (o.loadFile(n.join(d, "index.html")), e.loadFile(n.join(d, "studio.html")), i.loadFile(n.join(d, "webcam.html")));
}
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), o = null, e = null, i = null);
});
r.on("closeApp", () => {
  process.platform !== "darwin" && (l.quit(), o = null, e = null, i = null);
});
r.handle("getSources", async () => await m.getSources({
  thumbnailSize: { height: 100, width: 150 },
  fetchWindowIcons: !0,
  types: ["window", "screen"]
}));
r.on("media-sources", (s, t) => {
  console.log(s), e == null || e.webContents.send("profile-recieved", t);
});
r.on("resize-studio", (s, t) => {
  console.log(s), t.shrink && (e == null || e.setSize(400, 100)), t.shrink || e == null || e.setSize(400, 250);
});
r.on("hide-plugin", (s, t) => {
  console.log(s), o == null || o.webContents.send("hide-plugin", t);
});
l.on("activate", () => {
  a.getAllWindows().length === 0 && h();
});
l.whenReady().then(h);
export {
  v as MAIN_DIST,
  d as RENDERER_DIST,
  p as VITE_DEV_SERVER_URL
};
