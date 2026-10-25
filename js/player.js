/**
 * ARY Plus TV - High-Performance Video Player Engine
 * Robust AVPlay Lifecycle and Resource Handling for Tizen 6.0
 */
const PlayerEngine = (function() {
    let videoElement = null;
    let isPlaying = false;
    let isLiveStream = false;
    let duration = 0;
    let currentTime = 0;
    let hudTimer = null;
    let hlsInstance = null;
    let onCloseCallback = null;
    let isClosing = false;

    function getAVPlay() {
        if (typeof webapis !== 'undefined' && webapis.avplay) {
            return webapis.avplay;
        }
        return null;
    }

    function init() {
        videoElement = document.getElementById('html5-player');
    }

    function playStream(url, title, isLive, onClose) {
        if (!url) {
            console.error('[PlayerEngine] No stream URL provided');
            return;
        }

        isClosing = false;
        isLiveStream = Boolean(isLive);
        onCloseCallback = onClose;

        const app = document.getElementById('app');
        const episodesView = document.getElementById('episodes-view');
        const playerContainer = document.getElementById('player-container');
        const hudTitle = document.getElementById('hud-title');
        const hudStatus = document.getElementById('hud-status');
        const hudProgress = document.getElementById('hud-progress-bar');
        const spinner = document.getElementById('spinner');

        // AVPLAY HARDWARE UNDERLAY RULES:
        // 1. Hide DOM trees so video plane shines through
        if (app) app.style.display = 'none';
        if (episodesView) episodesView.style.display = 'none';

        // 2. Set transparency
        document.documentElement.style.backgroundColor = 'transparent';
        document.body.style.backgroundColor = 'transparent';

        playerContainer.style.backgroundColor = 'transparent';
        playerContainer.style.display = 'block';

        hudTitle.textContent = title || 'ARY Plus Stream';
        hudStatus.textContent = isLiveStream ? '🔴 LIVE STREAM' : 'VOD PLAYBACK';
        hudProgress.style.display = isLiveStream ? 'none' : 'block';
        if (spinner) spinner.style.display = 'block';
        showHUD();

        console.log('[PlayerEngine] Playing:', url, 'Live:', isLiveStream);

        const avplay = getAVPlay();
        if (avplay) {
            playAVPlay(url, avplay);
        } else {
            playHTML5(url);
        }
    }

    function playAVPlay(url, avplay) {
        // Safe reset before opening new stream
        try {
            const state = avplay.getState();
            if (state !== 'NONE' && state !== 'IDLE') {
                try { avplay.stop(); } catch(e){}
                try { avplay.close(); } catch(e){}
            }
        } catch (e) {}

        try {
            avplay.open(url);
            avplay.setDisplayRect(0, 0, 1920, 1080);
            avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');

            try {
                avplay.setStreamingProperty("USER_AGENT", "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36");
            } catch (e) {}

            const listener = {
                onbufferingstart: function() {
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'block';
                },
                onbufferingcomplete: function() {
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                },
                oncurrentplaytime: function(time) {
                    currentTime = time;
                    updateTimeDisplay(time, duration);
                },
                onerror: function(eventType) {
                    console.error('[AVPlay Error]', eventType);
                    const st = document.getElementById('hud-status');
                    if (st) st.textContent = 'Stream Error';
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                },
                onstreamcompleted: function() {
                    console.log('[AVPlay] Stream Completed');
                    closePlayer();
                }
            };

            avplay.setListener(listener);

            avplay.prepareAsync(function() {
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                try {
                    duration = avplay.getDuration();
                } catch(e) {
                    duration = 0;
                }
                try {
                    avplay.play();
                    isPlaying = true;
                } catch (e) {
                    console.error('[AVPlay play exception]', e);
                }
            }, function(err) {
                console.error('[AVPlay Prepare Failed]', err);
                const st = document.getElementById('hud-status');
                if (st) st.textContent = 'Playback error';
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
            });

        } catch (e) {
            console.error('[AVPlay Exception]', e);
            const sp = document.getElementById('spinner');
            if (sp) sp.style.display = 'none';
        }
    }

    function playHTML5(url) {
        if (!videoElement) return;

        if (hlsInstance) {
            try { hlsInstance.destroy(); } catch(e){}
            hlsInstance = null;
        }

        if (window.Hls && Hls.isSupported()) {
            hlsInstance = new Hls({
                enableWorker: true,
                lowLatencyMode: true
            });
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(videoElement);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                videoElement.play().catch(e => console.log('Autoplay caught:', e));
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                isPlaying = true;
            });
            hlsInstance.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    console.error('[HLS.js Fatal Error]', data);
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = url;
            videoElement.play().then(() => {
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                isPlaying = true;
            }).catch(err => {
                console.warn('[HTML5 Fallback Play error]', err);
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
            });
        } else {
            videoElement.src = url;
            videoElement.play().catch(() => {});
        }

        videoElement.ontimeupdate = () => {
            currentTime = videoElement.currentTime * 1000;
            duration = (videoElement.duration || 0) * 1000;
            updateTimeDisplay(currentTime, duration);
        };
    }

    function updateTimeDisplay(curMs, durMs) {
        if (isLiveStream || !durMs || isNaN(durMs)) return;
        const fill = document.getElementById('hud-progress-fill');
        const timeLabel = document.getElementById('hud-time');
        const pct = Math.min(100, Math.max(0, (curMs / durMs) * 100));
        if (fill) fill.style.width = pct + '%';

        const curSec = Math.floor(curMs / 1000);
        const durSec = Math.floor(durMs / 1000);
        if (timeLabel) timeLabel.textContent = formatTime(curSec) + ' / ' + formatTime(durSec);
    }

    function formatTime(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function togglePlayPause() {
        const avplay = getAVPlay();
        if (!isPlaying) {
            if (avplay) {
                try { avplay.play(); } catch(e){}
            } else if (videoElement) {
                videoElement.play();
            }
            isPlaying = true;
            showHUD();
        } else {
            if (avplay) {
                try { avplay.pause(); } catch(e){}
            } else if (videoElement) {
                videoElement.pause();
            }
            isPlaying = false;
            showHUD();
        }
    }

    function seek(offsetSeconds) {
        if (isLiveStream) return;
        const offsetMs = offsetSeconds * 1000;
        const target = Math.max(0, Math.min(duration, currentTime + offsetMs));
        const avplay = getAVPlay();
        if (avplay) {
            try { avplay.seekTo(target); } catch(e){}
        } else if (videoElement) {
            videoElement.currentTime = target / 1000;
        }
        showHUD();
    }

    function showHUD() {
        const hud = document.getElementById('player-hud');
        if (!hud) return;
        hud.classList.add('visible');
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => {
            if (isPlaying) {
                hud.classList.remove('visible');
            }
        }, 4000);
    }

    function closePlayer() {
        if (isClosing) return;
        isClosing = true;

        clearTimeout(hudTimer);
        isPlaying = false;

        // 1. Safe shutdown of AVPlay hardware pipeline
        const avplay = getAVPlay();
        if (avplay) {
            try {
                const state = avplay.getState();
                if (state === 'PLAYING' || state === 'PAUSED') {
                    avplay.stop();
                }
            } catch (e) {
                console.warn('[AVPlay stop err]', e);
            }
            try {
                avplay.close();
            } catch (e) {
                console.warn('[AVPlay close err]', e);
            }
        }

        // 2. Cleanup HTML5 video fallback
        if (videoElement) {
            try { videoElement.pause(); } catch(e){}
            videoElement.removeAttribute('src');
            try { videoElement.load(); } catch(e){}
            if (hlsInstance) {
                try { hlsInstance.destroy(); } catch(e){}
                hlsInstance = null;
            }
        }

        // 3. Hide HUD and Player overlay
        const hud = document.getElementById('player-hud');
        if (hud) hud.classList.remove('visible');
        const pContainer = document.getElementById('player-container');
        if (pContainer) pContainer.style.display = 'none';
        const sp = document.getElementById('spinner');
        if (sp) sp.style.display = 'none';

        // 4. Restore background colors for Web view
        document.documentElement.style.backgroundColor = '#0a0c10';
        document.body.style.backgroundColor = '#0a0c10';

        // 5. Fire callback cleanly
        const cb = onCloseCallback;
        onCloseCallback = null;
        if (typeof cb === 'function') {
            try {
                cb();
            } catch (err) {
                console.error('[onCloseCallback Error]', err);
            }
        }
        isClosing = false;
    }

    function isActive() {
        const pContainer = document.getElementById('player-container');
        return pContainer && pContainer.style.display === 'block';
    }

    return {
        init: init,
        playStream: playStream,
        togglePlayPause: togglePlayPause,
        seek: seek,
        showHUD: showHUD,
        closePlayer: closePlayer,
        isActive: isActive
    };
})();
