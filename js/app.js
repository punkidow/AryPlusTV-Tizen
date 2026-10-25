/**
 * ARY Plus TV - Samsung Tizen 6.0 High Performance Web Application
 * Features:
 * - 4 Primary Sections: Dramas, Telefilms, Shows, Streams
 * - Full Poster Wall Grid (5 columns, 280x400 poster ratio)
 * - Pagination HUD when item count anywhere goes beyond 30
 * - Direct playback for Telefilms & Streams
 * - High-speed Episodes modal drawer for Dramas & Shows (with pagination)
 * - Solid TV focus indicators without layout re-flow / jitter
 * - Complete D-pad Remote Control (Up, Down, Left, Right, Enter, Back, Play/Pause, Seek)
 * - Crash-proof AVPlay Hardware acceleration
 */
const App = (function() {
    const API_BASE = 'https://be.aryplus.tv';
    const API_KEY = 'ak_37515186786306625012043079404171';
    const IMAGE_BASE = 'https://images.aryplus.tv/';
    const USER_COUNTRY = 'PK';
    const PAGE_SIZE = 30;

    // Sidebar navigation sections
    const SECTIONS = [
        {
            id: 'nav-dramas',
            key: 'dramas',
            title: 'Dramas',
            apiCategory: 'dramas',
            hasEpisodes: true,
            iconSvg: '<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>'
        },
        {
            id: 'nav-telefilms',
            key: 'telefilms',
            title: 'Telefilms',
            apiCategory: 'Telefilms',
            hasEpisodes: false, // direct play
            iconSvg: '<svg viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>'
        },
        {
            id: 'nav-shows',
            key: 'shows',
            title: 'Shows',
            apiCategory: 'tv shows',
            hasEpisodes: true,
            iconSvg: '<svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>'
        },
        {
            id: 'nav-streams',
            key: 'streams',
            title: 'Streams',
            apiCategory: 'live streaming',
            hasEpisodes: false, // direct play
            iconSvg: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>'
        }
    ];

    // Navigation and Focus state
    let activeSectionIndex = 0; // 0: Dramas, 1: Telefilms, 2: Shows, 3: Streams
    let focusArea = 'wall';      // 'sidebar', 'wall', 'pagination', 'episodes', 'episodes-pagination'
    let sidebarFocusIndex = 0;

    // Poster Wall state
    let currentCategoryItems = [];
    let currentCategoryPagination = { currentPage: 1, totalPages: 1, totalSeries: 0 };
    let currentCardIndex = 0;
    const GRID_COLUMNS = 5;

    // Episodes Drawer state
    let activeSeries = null;
    let episodesList = [];
    let currentEpisodeIndex = 0;
    let episodesPagination = { currentPage: 1, totalPages: 1, totalEpisodes: 0 };
    const EPISODES_GRID_COLUMNS = 4;
    const EPISODES_PAGE_SIZE = 30;

    // In-memory cache for instant switching
    const categoryCache = {};
    const episodesCache = {};

    function init() {
        console.log('[App] Initializing ARY Plus TV UI...');
        try {
            PlayerEngine.init();
        } catch (e) {
            console.error('[App] PlayerEngine init error:', e);
        }

        setupRemoteKeys();
        renderSidebar();

        if (typeof INITIAL_CATEGORIES !== 'undefined' && INITIAL_CATEGORIES) {
            if (INITIAL_CATEGORIES.dramas) categoryCache['dramas_1'] = INITIAL_CATEGORIES.dramas;
            if (INITIAL_CATEGORIES.telefilms) categoryCache['telefilms_1'] = INITIAL_CATEGORIES.telefilms;
            if (INITIAL_CATEGORIES.shows) categoryCache['shows_1'] = INITIAL_CATEGORIES.shows;
            if (INITIAL_CATEGORIES.streams) categoryCache['streams_1'] = INITIAL_CATEGORIES.streams;
        }

        switchSection(0);
    }

    function renderSidebar() {
        const navList = document.getElementById('nav-list');
        if (!navList) return;
        navList.innerHTML = '';

        SECTIONS.forEach((sec, idx) => {
            const item = document.createElement('div');
            item.className = 'nav-item' + (idx === activeSectionIndex ? ' active' : '');
            item.id = sec.id;
            item.innerHTML = `${sec.iconSvg}<span>${sec.title}</span>`;
            item.addEventListener('click', () => {
                sidebarFocusIndex = idx;
                switchSection(idx);
                focusArea = 'wall';
                currentCardIndex = 0;
                updateFocus();
            });
            navList.appendChild(item);
        });
    }

    function switchSection(index, page = 1) {
        activeSectionIndex = index;
        const currentSec = SECTIONS[activeSectionIndex];

        SECTIONS.forEach((sec, idx) => {
            const el = document.getElementById(sec.id);
            if (el) {
                if (idx === activeSectionIndex) el.classList.add('active');
                else el.classList.remove('active');
            }
        });

        const secTitle = document.getElementById('section-title');
        if (secTitle) secTitle.textContent = currentSec.title;

        loadCategoryData(currentSec.apiCategory, page);
    }

    async function loadCategoryData(apiCategory, page = 1) {
        const cacheKey = `${apiCategory}_${page}`;
        const spinner = document.getElementById('spinner');

        if (categoryCache[cacheKey]) {
            renderPosterWall(categoryCache[cacheKey]);
            return;
        }

        if (spinner) spinner.style.display = 'block';

        try {
            const url = `${API_BASE}/api/series/byCatID/status/pg/${encodeURIComponent(apiCategory)}/${USER_COUNTRY}?limit=${PAGE_SIZE}&page=${page}`;
            const resp = await fetch(url, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);
            const data = await resp.json();
            categoryCache[cacheKey] = data;
            renderPosterWall(data);
        } catch (err) {
            console.error('[App] Failed to fetch category:', apiCategory, err);
            renderPosterWall({ series: [], pagination: { currentPage: 1, totalPages: 1, totalSeries: 0 } });
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function renderPosterWall(data) {
        currentCategoryItems = (data && Array.isArray(data.series)) ? data.series : [];
        currentCategoryPagination = data && data.pagination ? data.pagination : {
            currentPage: 1,
            totalPages: Math.ceil(currentCategoryItems.length / PAGE_SIZE) || 1,
            totalSeries: currentCategoryItems.length
        };

        const secCount = document.getElementById('section-count');
        if (secCount) {
            const total = currentCategoryPagination.totalSeries || currentCategoryItems.length;
            secCount.textContent = `(${total} ${total === 1 ? 'item' : 'items'})`;
        }

        renderPaginationBar();

        const wall = document.getElementById('poster-wall');
        if (!wall) return;
        wall.innerHTML = '';
        wall.style.transform = 'translateY(0px)';

        if (currentCategoryItems.length === 0) {
            wall.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; font-size: 20px; color: #8c93a3;">No content available in this section.</div>';
            return;
        }

        const isStreamSec = SECTIONS[activeSectionIndex].key === 'streams';

        currentCategoryItems.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            card.id = `poster-card-${idx}`;

            // Image selection: prioritize 280x400 imagePoster for proper vertical poster aspect ratio
            const imgPath = item.imagePoster || item.imageCoverBig || item.imageCoverDesktop || '';
            const fullImg = imgPath ? (imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE}${imgPath}`) : 'icon.png';

            let badgeText = item.isLive ? '🔴 LIVE' : (item.seriesType === 'singleVideo' ? 'TELEFILM' : (item.episodeCount ? `${item.episodeCount} EPS` : 'HD'));
            if (isStreamSec) badgeText = '🔴 LIVE';

            card.innerHTML = `
                <div class="poster-img-container">
                    <img src="${fullImg}" alt="${escapeHtml(item.title || '')}" loading="lazy" onerror="this.src='icon.png'">
                    <span class="badge-overlay ${item.isLive ? 'live-badge' : ''}">${badgeText}</span>
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="card-subtitle">${escapeHtml(Array.isArray(item.genreId) ? item.genreId.join(' • ') : (item.duration || 'ARY Plus'))}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                focusArea = 'wall';
                currentCardIndex = idx;
                updateFocus();
                handleItemSelection(item);
            });

            wall.appendChild(card);
        });

        if (currentCardIndex >= currentCategoryItems.length) {
            currentCardIndex = 0;
        }
        updateFocus();
    }

    function renderPaginationBar() {
        const pagBar = document.getElementById('pagination-bar');
        if (!pagBar) return;

        const totalPages = currentCategoryPagination.totalPages || 1;
        const totalItems = currentCategoryPagination.totalSeries || currentCategoryItems.length;

        if (totalItems > PAGE_SIZE || totalPages > 1) {
            pagBar.style.display = 'flex';
            const pageIndicator = document.getElementById('page-indicator');
            if (pageIndicator) {
                pageIndicator.textContent = `Page ${currentCategoryPagination.currentPage} of ${totalPages}`;
            }

            const prevBtn = document.getElementById('page-prev-btn');
            const nextBtn = document.getElementById('page-next-btn');

            if (prevBtn) {
                if (currentCategoryPagination.currentPage <= 1) prevBtn.classList.add('disabled');
                else prevBtn.classList.remove('disabled');
            }
            if (nextBtn) {
                if (currentCategoryPagination.currentPage >= totalPages) nextBtn.classList.add('disabled');
                else nextBtn.classList.remove('disabled');
            }
        } else {
            pagBar.style.display = 'none';
        }
    }

    function handleItemSelection(item) {
        if (!item) return;
        const currentSec = SECTIONS[activeSectionIndex];

        // 1. Direct Play for Telefilms & Streams
        if (!currentSec.hasEpisodes || item.isLive || item.seriesType === 'singleVideo') {
            const streamUrl = item.seiresCDN || item.trailer;
            if (streamUrl) {
                PlayerEngine.playStream(streamUrl, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            } else {
                fetchAndPlayDirectItem(item);
            }
            return;
        }

        // 2. Dramas and Shows: Open Episodes Drawer
        openEpisodesDrawer(item, 1);
    }

    async function fetchAndPlayDirectItem(item) {
        const spinner = document.getElementById('spinner');
        if (spinner) spinner.style.display = 'block';

        try {
            const resp = await fetch(`${API_BASE}/api/cdn/${item._id}`, {
                headers: { 'x-api-key': API_KEY }
            });
            const data = await resp.json();
            const streamUrl = (data && data.episode && data.episode[0] && data.episode[0].videoSource) || item.seiresCDN || item.trailer;
            if (streamUrl) {
                PlayerEngine.playStream(streamUrl, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            } else {
                alert('No stream available for this title.');
            }
        } catch (e) {
            console.error('Error fetching stream:', e);
            if (item.seiresCDN || item.trailer) {
                PlayerEngine.playStream(item.seiresCDN || item.trailer, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            }
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function restoreMainCatalog() {
        const app = document.getElementById('app');
        if (app) app.style.display = 'flex';
        const episodesModal = document.getElementById('episodes-view');
        if (episodesModal) {
            episodesModal.classList.remove('active');
            episodesModal.style.display = 'none';
        }
        focusArea = 'wall';
        updateFocus();
    }

    function restoreEpisodesView() {
        const app = document.getElementById('app');
        if (app) app.style.display = 'none';
        const episodesModal = document.getElementById('episodes-view');
        if (episodesModal) {
            episodesModal.classList.add('active');
            episodesModal.style.display = 'flex';
        }
        focusArea = 'episodes';
        updateFocus();
    }

    // --- EPISODES DRAWER MANAGEMENT ---
    async function openEpisodesDrawer(seriesItem, page = 1) {
        activeSeries = seriesItem;
        const modal = document.getElementById('episodes-view');
        const spinner = document.getElementById('spinner');
        if (spinner) spinner.style.display = 'block';

        const titleEl = document.getElementById('episodes-title');
        const descEl = document.getElementById('episodes-desc');
        const badgeEl = document.getElementById('episodes-badge');

        if (titleEl) titleEl.textContent = seriesItem.title || 'Series Episodes';
        if (descEl) descEl.textContent = seriesItem.description || seriesItem.title || 'Select an episode to watch';
        if (badgeEl) badgeEl.textContent = `${seriesItem.episodeCount || 0} Episodes`;

        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        focusArea = 'episodes';
        currentEpisodeIndex = 0;

        await loadEpisodes(seriesItem._id, page);
    }

    async function loadEpisodes(seriesId, page = 1) {
        const cacheKey = `${seriesId}_${page}`;
        if (episodesCache[cacheKey]) {
            processEpisodesData(episodesCache[cacheKey], page);
            return;
        }

        const spinner = document.getElementById('spinner');
        if (spinner) spinner.style.display = 'block';

        try {
            const url = `${API_BASE}/api/cdn/${seriesId}?page=${page}&limit=${EPISODES_PAGE_SIZE}`;
            const resp = await fetch(url, {
                headers: { 'x-api-key': API_KEY }
            });
            const data = await resp.json();
            episodesCache[cacheKey] = data;
            processEpisodesData(data, page);
        } catch (e) {
            console.error('[App] Failed to load episodes:', e);
            episodesList = [];
            renderEpisodesGrid();
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function processEpisodesData(data, requestedPage) {
        episodesList = (data && Array.isArray(data.episode)) ? data.episode : [];
        episodesPagination = {
            currentPage: data.currentPage || requestedPage,
            totalPages: data.totalPages || (data.totalEpisodes ? Math.ceil(data.totalEpisodes / EPISODES_PAGE_SIZE) : 1),
            totalEpisodes: data.totalEpisodes || (activeSeries ? activeSeries.episodeCount : episodesList.length)
        };
        renderEpisodesGrid();
    }

    function renderEpisodesGrid() {
        const grid = document.getElementById('episodes-grid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.style.transform = 'translateY(0px)';

        renderEpisodesPaginationBar();

        if (episodesList.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; font-size: 20px; color: #8c93a3;">No episodes available.</div>';
            return;
        }

        episodesList.forEach((ep, idx) => {
            const epCard = document.createElement('div');
            epCard.className = 'episode-card';
            epCard.id = `ep-card-${idx}`;

            // Broadcast 16:9 thumbnail ratio
            const imgPath = ep.imagePath || ep.imagePathV2 || (activeSeries ? activeSeries.imageCoverBig : '');
            const fullImg = imgPath ? (imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE}${imgPath}`) : 'icon.png';

            const epTitle = ep.title || `Episode ${ep.videoEpNumber || (idx + 1)}`;
            const durationText = ep.videoLength ? formatDuration(ep.videoLength) : (ep.duration || 'Full Episode');

            epCard.innerHTML = `
                <img class="ep-thumb" src="${fullImg}" alt="${escapeHtml(epTitle)}" loading="lazy" onerror="this.src='icon.png'">
                <div class="ep-info">
                    <div class="ep-title">${escapeHtml(epTitle)}</div>
                    <div class="ep-duration">${escapeHtml(durationText)}</div>
                </div>
            `;

            epCard.addEventListener('click', () => {
                focusArea = 'episodes';
                currentEpisodeIndex = idx;
                updateFocus();
                playEpisode(ep);
            });

            grid.appendChild(epCard);
        });

        if (currentEpisodeIndex >= episodesList.length) {
            currentEpisodeIndex = 0;
        }
        updateFocus();
    }

    function renderEpisodesPaginationBar() {
        const pagBar = document.getElementById('episodes-pagination-bar');
        if (!pagBar) return;

        const totalPages = episodesPagination.totalPages || 1;
        const totalCount = episodesPagination.totalEpisodes || episodesList.length;

        if (totalCount > EPISODES_PAGE_SIZE || totalPages > 1) {
            pagBar.style.display = 'flex';
            const ind = document.getElementById('episodes-page-indicator');
            if (ind) ind.textContent = `Page ${episodesPagination.currentPage} of ${totalPages}`;

            const prevBtn = document.getElementById('ep-page-prev-btn');
            const nextBtn = document.getElementById('ep-page-next-btn');
            if (prevBtn) {
                if (episodesPagination.currentPage <= 1) prevBtn.classList.add('disabled');
                else prevBtn.classList.remove('disabled');
            }
            if (nextBtn) {
                if (episodesPagination.currentPage >= totalPages) nextBtn.classList.add('disabled');
                else nextBtn.classList.remove('disabled');
            }
        } else {
            pagBar.style.display = 'none';
        }
    }

    async function playEpisode(ep) {
        if (!ep) return;
        let streamUrl = ep.videoSource;

        if (!streamUrl && ep._id) {
            const spinner = document.getElementById('spinner');
            if (spinner) spinner.style.display = 'block';
            try {
                const resp = await fetch(`${API_BASE}/api/cdn/ep/${ep._id}`, {
                    headers: { 'x-api-key': API_KEY }
                });
                const d = await resp.json();
                if (d && d.episode && d.episode.videoSource) {
                    streamUrl = d.episode.videoSource;
                }
            } catch(e) {
                console.error('Failed to get episode detail:', e);
            } finally {
                if (spinner) spinner.style.display = 'none';
            }
        }

        if (streamUrl) {
            const seriesTitle = (activeSeries ? activeSeries.title + ' - ' : '') + (ep.title || 'Episode');
            PlayerEngine.playStream(streamUrl, seriesTitle, false, () => {
                // Safely restore Episodes View without freezing
                restoreEpisodesView();
            });
        } else {
            alert('Video stream not found for this episode.');
        }
    }

    function closeEpisodesDrawer() {
        const modal = document.getElementById('episodes-view');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        const app = document.getElementById('app');
        if (app) app.style.display = 'flex';
        focusArea = 'wall';
        updateFocus();
    }

    // --- FOCUS & SCROLL ENGINE ---
    function updateFocus() {
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));

        if (focusArea === 'sidebar') {
            const navEl = document.getElementById(SECTIONS[sidebarFocusIndex].id);
            if (navEl) navEl.classList.add('focused');
            return;
        }

        if (focusArea === 'pagination') {
            const btn = paginationFocusBtn === 'prev' ? document.getElementById('page-prev-btn') : document.getElementById('page-next-btn');
            if (btn) btn.classList.add('focused');
            return;
        }

        if (focusArea === 'episodes-pagination') {
            const btn = episodesPaginationFocusBtn === 'prev' ? document.getElementById('ep-page-prev-btn') : document.getElementById('ep-page-next-btn');
            if (btn) btn.classList.add('focused');
            return;
        }

        if (focusArea === 'wall') {
            const card = document.getElementById(`poster-card-${currentCardIndex}`);
            if (card) {
                card.classList.add('focused');
                scrollPosterWall();
            }
            return;
        }

        if (focusArea === 'episodes') {
            const epCard = document.getElementById(`ep-card-${currentEpisodeIndex}`);
            if (epCard) {
                epCard.classList.add('focused');
                scrollEpisodesGrid();
            }
            return;
        }
    }

    let paginationFocusBtn = 'next';
    let episodesPaginationFocusBtn = 'next';

    function scrollPosterWall() {
        const wall = document.getElementById('poster-wall');
        if (!wall) return;
        const row = Math.floor(currentCardIndex / GRID_COLUMNS);
        // Each poster card height is 480px + 28px gap = 508px
        const targetScroll = row > 1 ? (row - 1) * 508 : 0;
        wall.style.transform = `translateY(-${targetScroll}px)`;
    }

    function scrollEpisodesGrid() {
        const grid = document.getElementById('episodes-grid');
        if (!grid) return;
        const row = Math.floor(currentEpisodeIndex / EPISODES_GRID_COLUMNS);
        // Each episode card height is 310px + 28px gap = 338px
        const targetScroll = row > 1 ? (row - 1) * 338 : 0;
        grid.style.transform = `translateY(-${targetScroll}px)`;
    }

    // --- REMOTE D-PAD & KEY CONTROLS ---
    function setupRemoteKeys() {
        window.addEventListener('keydown', handleKeyDown);

        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            try {
                const keys = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                keys.forEach(k => {
                    try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
                });
            } catch (e) {
                console.warn('[Remote Keys] registerKey failed', e);
            }
        }
    }

    function handleKeyDown(e) {
        const keyCode = e.keyCode;

        // 1. If Video Player is active, redirect keys to Player
        if (PlayerEngine.isActive()) {
            handlePlayerKeys(keyCode, e);
            return;
        }

        // 2. Episodes Modal Navigation
        if (focusArea === 'episodes' || focusArea === 'episodes-pagination') {
            handleEpisodesKeys(keyCode, e);
            return;
        }

        // 3. Main Catalog (Sidebar, Poster Wall, Pagination)
        switch (keyCode) {
            case 38: // UP
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex > 0) {
                        sidebarFocusIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'wall') {
                    if (currentCardIndex >= GRID_COLUMNS) {
                        currentCardIndex -= GRID_COLUMNS;
                        updateFocus();
                    } else {
                        const totalItems = currentCategoryPagination.totalSeries || currentCategoryItems.length;
                        if (totalItems > PAGE_SIZE || currentCategoryPagination.totalPages > 1) {
                            focusArea = 'pagination';
                            updateFocus();
                        }
                    }
                }
                break;

            case 40: // DOWN
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex < SECTIONS.length - 1) {
                        sidebarFocusIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    if (currentCardIndex + GRID_COLUMNS < currentCategoryItems.length) {
                        currentCardIndex += GRID_COLUMNS;
                        updateFocus();
                    }
                }
                break;

            case 37: // LEFT
                e.preventDefault();
                if (focusArea === 'wall') {
                    if (currentCardIndex % GRID_COLUMNS === 0) {
                        focusArea = 'sidebar';
                        sidebarFocusIndex = activeSectionIndex;
                        updateFocus();
                    } else {
                        currentCardIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    if (paginationFocusBtn === 'next') {
                        paginationFocusBtn = 'prev';
                        updateFocus();
                    } else {
                        focusArea = 'sidebar';
                        sidebarFocusIndex = activeSectionIndex;
                        updateFocus();
                    }
                }
                break;

            case 39: // RIGHT
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex !== activeSectionIndex) {
                        switchSection(sidebarFocusIndex);
                    }
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    if (currentCardIndex < currentCategoryItems.length - 1) {
                        currentCardIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    if (paginationFocusBtn === 'prev') {
                        paginationFocusBtn = 'next';
                        updateFocus();
                    }
                }
                break;

            case 13: // ENTER / OK
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    switchSection(sidebarFocusIndex);
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    const item = currentCategoryItems[currentCardIndex];
                    handleItemSelection(item);
                } else if (focusArea === 'pagination') {
                    handlePaginationClick();
                }
                break;

            case 10009: // Tizen Return / Back
            case 27:    // ESC
                e.preventDefault();
                if (focusArea === 'wall' || focusArea === 'pagination') {
                    focusArea = 'sidebar';
                    sidebarFocusIndex = activeSectionIndex;
                    updateFocus();
                } else if (focusArea === 'sidebar') {
                    try {
                        tizen.application.getCurrentApplication().exit();
                    } catch (err) {
                        console.log('App exit');
                    }
                }
                break;
        }
    }

    function handlePaginationClick() {
        const curPage = currentCategoryPagination.currentPage;
        const totalPages = currentCategoryPagination.totalPages;

        if (paginationFocusBtn === 'prev' && curPage > 1) {
            currentCardIndex = 0;
            switchSection(activeSectionIndex, curPage - 1);
        } else if (paginationFocusBtn === 'next' && curPage < totalPages) {
            currentCardIndex = 0;
            switchSection(activeSectionIndex, curPage + 1);
        }
    }

    function handleEpisodesKeys(keyCode, e) {
        switch (keyCode) {
            case 38: // UP
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex >= EPISODES_GRID_COLUMNS) {
                        currentEpisodeIndex -= EPISODES_GRID_COLUMNS;
                        updateFocus();
                    } else if (episodesPagination.totalPages > 1) {
                        focusArea = 'episodes-pagination';
                        updateFocus();
                    }
                }
                break;

            case 40: // DOWN
                e.preventDefault();
                if (focusArea === 'episodes-pagination') {
                    focusArea = 'episodes';
                    currentEpisodeIndex = 0;
                    updateFocus();
                } else if (focusArea === 'episodes') {
                    if (currentEpisodeIndex + EPISODES_GRID_COLUMNS < episodesList.length) {
                        currentEpisodeIndex += EPISODES_GRID_COLUMNS;
                        updateFocus();
                    }
                }
                break;

            case 37: // LEFT
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex > 0) {
                        currentEpisodeIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'episodes-pagination') {
                    if (episodesPaginationFocusBtn === 'next') {
                        episodesPaginationFocusBtn = 'prev';
                        updateFocus();
                    }
                }
                break;

            case 39: // RIGHT
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex < episodesList.length - 1) {
                        currentEpisodeIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'episodes-pagination') {
                    if (episodesPaginationFocusBtn === 'prev') {
                        episodesPaginationFocusBtn = 'next';
                        updateFocus();
                    }
                }
                break;

            case 13: // ENTER / OK
                e.preventDefault();
                if (focusArea === 'episodes') {
                    const ep = episodesList[currentEpisodeIndex];
                    playEpisode(ep);
                } else if (focusArea === 'episodes-pagination') {
                    handleEpisodesPaginationClick();
                }
                break;

            case 10009: // Tizen Return / Back
            case 27:    // ESC
                e.preventDefault();
                closeEpisodesDrawer();
                break;
        }
    }

    function handleEpisodesPaginationClick() {
        const cur = episodesPagination.currentPage;
        const total = episodesPagination.totalPages;
        if (!activeSeries) return;

        if (episodesPaginationFocusBtn === 'prev' && cur > 1) {
            currentEpisodeIndex = 0;
            loadEpisodes(activeSeries._id, cur - 1);
        } else if (episodesPaginationFocusBtn === 'next' && cur < total) {
            currentEpisodeIndex = 0;
            loadEpisodes(activeSeries._id, cur + 1);
        }
    }

    function handlePlayerKeys(keyCode, e) {
        e.preventDefault();
        switch (keyCode) {
            case 10009: // Return / Back
            case 27:    // ESC
                PlayerEngine.closePlayer();
                break;

            case 13:   // Enter
            case 10252: // MediaPlayPause
            case 415:  // MediaPlay
            case 19:   // MediaPause
                PlayerEngine.togglePlayPause();
                break;

            case 37:   // Left (Seek back)
            case 412:  // Rewind
                PlayerEngine.seek(-10);
                break;

            case 39:   // Right (Seek forward)
            case 417:  // FastForward
                PlayerEngine.seek(10);
                break;

            case 38:   // UP (Show HUD)
            case 40:   // DOWN
                PlayerEngine.showHUD();
                break;
        }
    }

    function formatDuration(sec) {
        const s = parseInt(sec, 10);
        if (isNaN(s)) return sec;
        const m = Math.floor(s / 60);
        const remS = s % 60;
        return `${m}:${remS < 10 ? '0' : ''}${remS} mins`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        init: init
    };
})();

// Bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
