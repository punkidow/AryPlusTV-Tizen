const fs = require('fs');

const css = fs.readFileSync('css/style.css', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const player = fs.readFileSync('js/player.js', 'utf8');
const fallbackCategories = fs.readFileSync('js/fallback_categories.js', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ARY Plus TV</title>
    <!-- Load Tizen webapis if available on Samsung TV -->
    <script type="text/javascript" src="$WEBAPIS/webapis/webapis.js" onerror="console.log('webapis fallback')"></script>
    <style>
${css}
    </style>
</head>
<body>
    <div id="app">
        <!-- Sidebar Navigation -->
        <aside id="sidebar">
            <div class="brand-container">
                <img src="icons/aryplus_logo.png" alt="ARY Plus" class="brand-logo" onerror="this.src='icon.png'">
                <span class="brand-badge">TV 6.0</span>
            </div>
            <nav class="nav-list" id="nav-list">
                <!-- Dynamically populated: Dramas, Telefilms, Shows, Streams -->
            </nav>
            <div class="sidebar-footer">
                <span>[▲/▼] Navigate<br>[ENTER/►] Select<br>[◄/BACK] Sidebar</span>
            </div>
        </aside>

        <!-- Main Viewport Area -->
        <main id="main-view">
            <!-- Header bar with category title and pagination HUD -->
            <div class="header-bar">
                <div class="category-heading">
                    <h1 id="section-title">Dramas</h1>
                    <span id="section-count">(Loading...)</span>
                </div>
                <div id="pagination-bar" style="display: none;">
                    <button class="page-btn disabled" id="page-prev-btn">&laquo; Prev</button>
                    <span id="page-indicator">Page 1 of 1</span>
                    <button class="page-btn" id="page-next-btn">Next &raquo;</button>
                </div>
            </div>

            <!-- Poster Wall Viewport -->
            <div id="poster-wall-viewport">
                <div id="poster-wall"></div>
            </div>
        </main>
    </div>

    <!-- Episodes Drawer View (for Dramas and Shows) -->
    <div id="episodes-view">
        <div class="episodes-header">
            <div class="episodes-title-group">
                <h1 id="episodes-title">Series Title</h1>
                <p id="episodes-desc">Series description goes here...</p>
                <div class="episodes-meta-badges">
                    <span id="episodes-badge">0 Episodes</span>
                    <span class="episodes-nav-hint">[▲/▼/◄/►] Select &bull; [ENTER] Play &bull; [BACK] Return to Wall</span>
                </div>
            </div>
            <div id="episodes-pagination-bar" style="display: none;">
                <button class="page-btn disabled" id="ep-page-prev-btn">&laquo; Prev</button>
                <span id="episodes-page-indicator" style="font-size: 13px; font-weight: 600; color: #c9ced8;">Page 1 of 1</span>
                <button class="page-btn" id="ep-page-next-btn">Next &raquo;</button>
            </div>
        </div>
        <div id="episodes-viewport">
            <div id="episodes-grid"></div>
        </div>
    </div>

    <!-- Fullscreen AVPlay Hardware Video Player Layer -->
    <div id="player-container">
        <video id="html5-player" style="width: 100%; height: 100%; object-fit: contain;"></video>
        
        <!-- Video HUD / Controls overlay -->
        <div id="player-hud">
            <div class="hud-top">
                <h2 id="hud-title">Title</h2>
                <div id="hud-status">PLAYING</div>
            </div>
            <div class="hud-bottom">
                <div id="hud-progress-bar">
                    <div id="hud-progress-fill"></div>
                </div>
                <div id="hud-controls">
                    <span id="hud-time">00:00 / 00:00</span>
                    <span id="hud-hint">Press [Back / Return] to exit</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Spinner -->
    <div id="spinner"></div>

    <script>
${fallbackCategories}
${player}
${app}
    </script>
</body>
</html>`;

fs.writeFileSync('index.html', html, 'utf8');
console.log('Clean optimized index.html rebuilt successfully! Size:', html.length);
