        // Feed state
        let allFeedVideos = [];
        let activeFilter = 'all';
        let backBtnTimer = null;
        let scanStream = null;

        // --- YouTube Player ---

        function openYoutubePlayer() {
            document.getElementById('child-no-api').classList.add('hidden');
            elWelcomePage.classList.add('hidden');
            elChildView.classList.add('hidden');
            document.getElementById('yt-container').classList.remove('hidden');
            loadFeed();
        }

        async function loadFeed(filterChannelId) {
            if (filterChannelId !== undefined) activeFilter = filterChannelId;
            document.getElementById('yt-player-view').classList.add('hidden');
            document.getElementById('yt-feed-view').classList.remove('hidden');
            updateChips();

            if (allFeedVideos.length > 0) { renderFeed(); return; }

            showSkeletons();

            const cacheKey = 'yt_feed_cache';
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { videos, ts } = JSON.parse(cached);
                    if (videos && videos.length > 0 && Date.now() - ts < 3600000) {
                        allFeedVideos = videos;
                        buildFilterChips();
                        renderFeed();
                        return;
                    }
                }
            } catch(e) {}

            const results = await Promise.all((config.youtubeChannels || []).map(ch => fetchChannelVideos(ch)));
            const merged = results.flat();

            let playable;
            if (config.youtubeApiKey) {
                showSkeletons('Checking videos\u2026');
                const embeddable = await Promise.all(merged.map(v => checkEmbeddable(v.id)));
                playable = merged.filter((_, i) => embeddable[i]);
            } else {
                playable = merged;
            }

            if (config.hideShorts && config.youtubeApiKey) {
                showSkeletons('Filtering Shorts\u2026');
                const durations = await fetchDurations(playable.map(v => v.id));
                playable = playable.filter(v => (durations[v.id] || 999) > 60);
            }

            playable.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            allFeedVideos = playable;
            if (playable.length > 0) {
                try { localStorage.setItem(cacheKey, JSON.stringify({ videos: playable, ts: Date.now() })); } catch(e) {}
            }
            buildFilterChips();
            renderFeed();
        }

        function parseDuration(iso) {
            const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!m) return 0;
            return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
        }

        async function fetchDurations(videoIds) {
            const durations = {};
            // API allows up to 50 IDs per request
            for (let i = 0; i < videoIds.length; i += 50) {
                const batch = videoIds.slice(i, i + 50).join(',');
                try {
                    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch}&key=${config.youtubeApiKey}`);
                    if (!res.ok) continue;
                    const data = await res.json();
                    (data.items || []).forEach(item => {
                        durations[item.id] = parseDuration(item.contentDetails.duration);
                    });
                } catch(e) {}
            }
            return durations;
        }

        function showSkeletons(msg) {
            const grid = document.getElementById('yt-feed-grid');
            const skeletonHtml = Array(5).fill(0).map(() => `<div class="yt-skeleton"><div class="yt-skeleton-thumb"></div><div class="yt-skeleton-meta"><div class="yt-skeleton-icon"></div><div class="yt-skeleton-text"><div class="yt-skeleton-line"></div><div class="yt-skeleton-line short"></div></div></div></div>`).join('');
            grid.innerHTML = (msg ? `<div style="padding:0.8rem 1rem;color:var(--text-secondary);font-size:0.85rem;">${msg}</div>` : '') + skeletonHtml;
        }

        async function fetchChannelVideos(channel) {
            if (!config.youtubeApiKey) {
                // No API key — use RSS for regular channels, skip custom playlists
                if (channel.id && channel.id.startsWith('UC')) {
                    return await fetchChannelRSS(channel);
                }
                return [];
            }
            if (!channel.uploadsPlaylistId && channel.id && channel.id.startsWith('UC')) {
                channel.uploadsPlaylistId = 'UU' + channel.id.slice(2);
            }
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${channel.uploadsPlaylistId}&maxResults=20&key=${config.youtubeApiKey}`);
                if (!res.ok) return [];
                const data = await res.json();
                return (data.items || []).map(item => ({
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    thumbnail: `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/hqdefault.jpg`,
                    publishedAt: item.snippet.publishedAt,
                    channelId: channel.id,
                    channelName: channel.name,
                    channelThumb: channel.thumbnail,
                    playlistId: channel.uploadsPlaylistId
                })).filter(v => v.id && v.title !== 'Private video' && v.title !== 'Deleted video');
            } catch(e) { return []; }
        }

        async function fetchChannelRSS(channel) {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
            for (const [proxyUrl, encode] of CORS_PROXIES) {
                try {
                    const res = await fetch(proxyUrl + (encode ? encodeURIComponent(rssUrl) : rssUrl));
                    if (!res.ok) { console.warn('RSS proxy returned', res.status, proxyUrl); continue; }
                    const text = await res.text();
                    const doc = new DOMParser().parseFromString(text, 'text/xml');
                    const entries = Array.from(doc.querySelectorAll('entry'));
                    if (entries.length === 0) { console.warn('RSS proxy returned no entries', proxyUrl, text.slice(0, 200)); continue; }
                    return entries.map(entry => {
                        // <id> contains "yt:video:VIDEO_ID" — safer than namespace querySelector
                        const idText = entry.querySelector('id')?.textContent || '';
                        const videoId = idText.startsWith('yt:video:') ? idText.slice(9) : null;
                        const title = entry.querySelector('title')?.textContent;
                        const published = entry.querySelector('published')?.textContent;
                        const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                        return {
                            id: videoId,
                            title,
                            thumbnail,
                            publishedAt: published,
                            channelId: channel.id,
                            channelName: channel.name,
                            channelThumb: channel.thumbnail,
                            playlistId: null
                        };
                    }).filter(v => v.id && v.title);
                } catch(e) {
                    console.warn('RSS fetch failed for', channel.id, 'via', proxyUrl, e);
                }
            }
            return [];
        }

        function buildFilterChips() {
            const bar = document.getElementById('yt-filter-bar');
            bar.innerHTML = '';
            const allChip = document.createElement('div');
            allChip.className = 'yt-chip' + (activeFilter === 'all' ? ' active' : '');
            allChip.setAttribute('data-channel', 'all');
            allChip.textContent = 'All';
            allChip.addEventListener('click', () => loadFeed('all'));
            bar.appendChild(allChip);
            (config.youtubeChannels || []).forEach(ch => {
                const chip = document.createElement('div');
                chip.className = 'yt-chip' + (activeFilter === ch.id ? ' active' : '');
                chip.setAttribute('data-channel', ch.id);
                chip.textContent = ch.name;
                chip.addEventListener('click', () => loadFeed(ch.id));
                bar.appendChild(chip);
            });
        }

        function updateChips() {
            document.querySelectorAll('.yt-chip').forEach(c => {
                c.classList.toggle('active', c.getAttribute('data-channel') === activeFilter);
            });
        }

        function renderFeed() {
            const grid = document.getElementById('yt-feed-grid');
            const videos = activeFilter === 'all' ? allFeedVideos : allFeedVideos.filter(v => v.channelId === activeFilter);
            if (videos.length === 0) {
                grid.innerHTML = '<p style="padding:2rem;color:var(--text-secondary);">No videos found.</p>';
                return;
            }
            grid.innerHTML = '';
            videos.forEach(video => {
                const tile = document.createElement('div');
                tile.className = 'yt-video-tile';
                const iconHtml = video.channelThumb ? `<img src="${video.channelThumb}" alt="">` : video.channelName.charAt(0).toUpperCase();
                tile.innerHTML = `
                    <div class="yt-thumb-wrap"><img src="${video.thumbnail}" alt="" loading="lazy"></div>
                    <div class="yt-meta">
                        <div class="yt-channel-icon">${iconHtml}</div>
                        <div class="yt-text">
                            <div class="yt-title">${video.title}</div>
                            <div class="yt-channel-name">${video.channelName}</div>
                        </div>
                    </div>`;
                tile.addEventListener('click', () => playYtVideo(video.id, video.playlistId));
                grid.appendChild(tile);
            });
            updateChips();
        }

        async function checkEmbeddable(videoId) {
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                return res.ok;
            } catch (e) {
                return false;
            }
        }

        function playYtVideo(videoId, playlistId) {
            document.getElementById('yt-feed-view').classList.add('hidden');
            document.getElementById('yt-player-view').classList.remove('hidden');
            document.getElementById('yt-player-error').classList.add('hidden');
            document.getElementById('yt-frame').classList.remove('hidden');

            // Lock back button for 30 seconds
            if (backBtnTimer) clearInterval(backBtnTimer);
            const backBtn = document.getElementById('yt-player-back-btn');
            backBtn.disabled = true;
            let secsLeft = 30;
            backBtn.textContent = `← ${secsLeft}s`;
            backBtnTimer = setInterval(() => {
                secsLeft--;
                if (secsLeft <= 0) {
                    clearInterval(backBtnTimer);
                    backBtnTimer = null;
                    backBtn.disabled = false;
                    backBtn.textContent = '← Back';
                } else {
                    backBtn.textContent = `← ${secsLeft}s`;
                }
            }, 1000);
            const unmuteBtn = document.getElementById('yt-unmute-btn');
            unmuteBtn.textContent = '🔇 Tap to Unmute';
            unmuteBtn.className = 'yt-unmute-btn muted';
            const listParam = playlistId ? `&list=${playlistId}` : '';
            const origin = encodeURIComponent(window.location.origin);
            const baseUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&iv_load_policy=3&controls=1&enablejsapi=1&origin=${origin}${listParam}`;
            document.getElementById('yt-frame').src = baseUrl + '&mute=1';
            unmuteBtn.onclick = () => {
                document.getElementById('yt-frame').src = baseUrl;
                unmuteBtn.textContent = '🔊 Playing';
                unmuteBtn.className = 'yt-unmute-btn unmuted';
            };
        }

        function closeYoutubePlayer() {
            document.getElementById('yt-frame').src = '';
            document.getElementById('yt-container').classList.add('hidden');
            elChildView.classList.remove('hidden');
        }

        function renderYtChannelConfigList() {
            const list = document.getElementById('yt-channel-config-list');
            if (!list) return;
            list.innerHTML = '';
            (config.youtubeChannels || []).forEach((ch, idx) => {
                const item = document.createElement('div');
                item.className = 'app-list-item';
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        ${ch.thumbnail ? `<img src="${ch.thumbnail}" style="width:36px;height:36px;border-radius:50%;" alt="">` : '<span style="font-size:1.5rem;">📺</span>'}
                        <strong>${ch.name}</strong>
                    </div>
                    <button class="yt-del-ch danger" data-idx="${idx}">Del</button>
                `;
                list.appendChild(item);
            });
            list.querySelectorAll('.yt-del-ch').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-idx'), 10);
                    config.youtubeChannels.splice(idx, 1);
                    saveConfig();
                    renderYtChannelConfigList();
                });
            });
        }

        function extractPlaylistId(url) {
            const match = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
            return match ? match[1] : null;
        }

        async function addYoutubeChannel() {
            const nameInput = document.getElementById('yt-new-channel-name').value.trim();
            const chInput = document.getElementById('yt-new-channel-input').value.trim();
            if (!chInput) { alert("Please enter a channel ID, @handle, or YouTube URL."); return; }

            let channelId = null, handle = null;
            if (/^UC[A-Za-z0-9_-]{20,22}$/.test(chInput)) {
                channelId = chInput;
            } else {
                const idMatch = chInput.match(/\/channel\/(UC[A-Za-z0-9_-]{20,22})/);
                const handleMatch = chInput.match(/(?:youtube\.com\/)?@([A-Za-z0-9_.%-]+)/);
                if (idMatch) channelId = idMatch[1];
                else if (handleMatch) handle = handleMatch[1];
                else handle = chInput.replace(/^@/, '');
            }

            // Without API key: only accept direct UCxxxxxx IDs
            if (!config.youtubeApiKey) {
                if (!channelId) {
                    alert("Without an API key, channels must be added by their channel ID (starts with UC...).\n\nTo find it: open the channel on YouTube → More → Share → Copy channel ID.");
                    return;
                }
                const newCh = {
                    id: channelId,
                    name: nameInput || channelId,
                    uploadsPlaylistId: 'UU' + channelId.slice(2)
                };
                if (!config.youtubeChannels) config.youtubeChannels = [];
                if (config.youtubeChannels.find(c => c.id === newCh.id)) { alert("Channel already added."); return; }
                config.youtubeChannels.push(newCh);
                saveConfig();
                renderYtChannelConfigList();
                document.getElementById('yt-new-channel-name').value = '';
                document.getElementById('yt-new-channel-input').value = '';
                alert(`Added "${newCh.name}"!`);
                return;
            }

            const btn = document.getElementById('btn-add-yt-channel');
            btn.disabled = true;
            btn.innerText = 'Looking up...';
            try {
                const param = channelId ? `id=${channelId}` : `forHandle=${encodeURIComponent(handle)}`;
                const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&${param}&key=${config.youtubeApiKey}`);
                if (!res.ok) throw new Error(res.status);
                const data = await res.json();
                if (!data.items || data.items.length === 0) { alert("Channel not found. Check the handle or ID."); return; }
                const ch = data.items[0];
                const newCh = {
                    id: ch.id,
                    name: nameInput || ch.snippet.title,
                    thumbnail: ch.snippet.thumbnails?.default?.url,
                    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads
                };
                if (!config.youtubeChannels) config.youtubeChannels = [];
                if (config.youtubeChannels.find(c => c.id === newCh.id)) { alert("Channel already added."); return; }
                config.youtubeChannels.push(newCh);
                saveConfig();
                renderYtChannelConfigList();
                document.getElementById('yt-new-channel-name').value = '';
                document.getElementById('yt-new-channel-input').value = '';
                alert(`Added "${newCh.name}"!`);
            } catch (e) {
                alert("Failed to look up channel. Check your API key and try again.");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Add Channel';
            }
        }

        function addYoutubePlaylist() {
            const nameInput = document.getElementById('yt-playlist-name').value.trim();
            const urlInput = document.getElementById('yt-playlist-url').value.trim();
            if (!urlInput) { alert('Please enter a YouTube playlist URL.'); return; }

            const playlistId = extractPlaylistId(urlInput);
            if (!playlistId) {
                alert('Unable to extract playlist ID from URL. Please use a valid YouTube playlist URL.');
                return;
            }

            const name = nameInput || 'YouTube Playlist';
            const newCh = {
                id: 'playlist_' + playlistId,
                name: name,
                thumbnail: '',
                uploadsPlaylistId: playlistId
            };

            if (!config.youtubeChannels) config.youtubeChannels = [];
            if (config.youtubeChannels.find(c => c.id === newCh.id)) { alert("Playlist already added."); return; }
            config.youtubeChannels.push(newCh);
            saveConfig();
            renderYtChannelConfigList();
            document.getElementById('yt-playlist-name').value = '';
            document.getElementById('yt-playlist-url').value = '';
            alert(`Added "${name}" as a channel!`);
        }
