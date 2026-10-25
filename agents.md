# AGENTS.md - ARY Plus Tizen TV Project Guide

This guide documents the architecture, remote key bindings, build toolchains, and operating invariants for AI agents and developers working on this codebase.

---

## 1. Project Overview & Environment

- **Target Device**: Samsung Smart TV (Tizen 6.0+, tested on QA65Q60AAUSMZ)
- **App ID**: `tL8G1A0X4A.AryPlusTV`
- **Resolution**: 1920×1080 (Full HD 1080p canvas)
- **Technology Stack**: Vanilla HTML5/CSS3/JavaScript (ES6+) with Tizen WebAPIs & `webapis.avplay` hardware underlay decoding.
- **Brand Colors**:
  - Primary Accent: `#6bfe12` (signature ARY Plus vibrant neon green)
  - Secondary / Hover: `#a7ca11` / `#1a2216`
  - Background Base: `#0a0c10` (Dark webview plane)
  - Surface Containers: `#141720` / `#0d1016`

---

## 2. Directory Structure

```text
ary/
├── .vscode/               # Launch & settings configurations
├── css/
│   └── style.css          # 1080p TV UI styles, high-contrast borders & layouts
├── icons/
│   ├── aryplus_logo.png   # Official brand logo
│   ├── favicon.ico        # Site favicon
│   └── icon.png           # 117x117 launcher icon
├── js/
│   ├── app.js             # D-pad navigation, state management & API coordinator
│   ├── player.js          # AVPlay hardware video engine & HTML5 fallback
│   ├── fallback_categories.js # Instant offline boot catalog (20 items/page)
│   └── fallback_data.js   # Offline catalog fallback
├── build.ps1              # Packages unsigned AryPlusTV.wgt
├── config.xml             # Tizen W3C widget configuration (<tizen:profile name="tv"/>)
├── icon.png               # Root launcher icon (117x117px)
├── index.html             # Bundled single-page app shell for Tizen execution
├── profiles.xml           # Tizen developer signature profile
└── rebuild_index.js       # Inlines CSS and JS into single-file index.html
```

---

## 3. Core Architecture & Rules

### A. AVPlay Video Engine & Hardware Underlay
Samsung Tizen renders video behind the HTML web view:
- **Starting Playback**:
  - Hide all opaque DOM trees: `document.getElementById('app').style.display = 'none'`.
  - Set `document.documentElement` and `document.body` backgrounds to `transparent`.
  - Display `#player-container` with transparent background and overlay HUD.
- **Stopping Playback**:
  - Always guard with an `isClosing` lock to avoid race conditions.
  - Check player state via `avplay.getState()`: if `PLAYING` or `PAUSED`, call `avplay.stop()` before `avplay.close()`.
  - Restore UI background (`#0a0c10`) and restore the appropriate DOM view (`restoreEpisodesView()` or `restoreMainCatalog()`).

### B. Remote Key Control (D-pad & Tizen Input Device)
Registered via `tizen.tvinputdevice.registerKey`:
- `38` (Up), `40` (Down), `37` (Left), `39` (Right)
- `13` (Enter / Select)
- `10009` / `27` (Tizen Return / Back button / ESC)
- `10252` / `415` / `19` (Play / Pause / MediaPlayPause)
- `412` / `417` (Rewind / FastForward seek 10s)

### C. Poster Aspect Ratios & Content Rules
- **Poster Ratio**: 280×400 (strict ARY Plus poster ratio). Card container is `290px × 480px` (`400px` image height).
- **Episode Thumbnail Ratio**: 16:9 broadcast ratio (`419px × 236px`).
- **Pagination**: 20 items per page. Always track page state client-side (`requestedPage`) because the CDN envelope statically echoes `"currentPage": 1`.

---

## 4. Build, Packaging & Deployment Toolchain

Always use the installed Tizen CLI (`tz.exe`) and SDB (`sdb.exe`):

```powershell
# 1. Rebuild bundled index.html
node rebuild_index.js

# 2. Package unsigned WGT
powershell -ExecutionPolicy Bypass -File build.ps1

# 3. Sign package using developer profile
$tz = "C:\Users\Irfan\.tizen-extension-platform\server\sdktools\data\tools\tizen-core\tz.exe"
& $tz pack -t wgt -s DevProfile -p .\profiles.xml -b .\AryPlusTV.wgt -o .\AryPlusTV_signed.wgt

# 4. Install signed package to TV
& $tz install -e 192.168.1.109:26101 -p .\AryPlusTV_signed.wgt

# 5. Launch application on TV
$sdb = "C:\Users\Irfan\.tizen-extension-platform\server\sdktools\data\tools\sdb.exe"
& $sdb -s 192.168.1.109:26101 shell 0 was_execute tL8G1A0X4A.AryPlusTV
```

---

## 5. TV Performance Invariants

- **No CSS `box-shadow` or `transform: scale()` on focused elements**: Heavy filter operations cause frame drops and stuttering on TV chipsets. Use solid `border: 3px solid #6bfe12` and background color shifts instead.
- **Single-page inlining**: Scripts and styles are inlined in `index.html` via `rebuild_index.js` to eliminate relative path sandbox failures (`net::ERR_<unknown>`) under Tizen's `file:///` scheme.

