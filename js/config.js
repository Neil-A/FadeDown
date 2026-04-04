        // --- Core Logic ---

        const DEFAULT_CONFIG = {
            v: 1,
            sessionMins: 45,
            fadeStart: 30,
            minSat: 0.2,
            schedule: { start: "00:00", end: "23:59" },
            days: [0, 1, 2, 3, 4, 5, 6],
            challengeType: "pin",
            challengeHash: null,
            youtubeApiKey: '',
            hideShorts: true,
            youtubeChannels: []
        };

        const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

        let config = null;

        function loadConfig() {
            try {
                // Migrate from old brand key if present
                const legacy = localStorage.getItem('fadedown_config');
                if (legacy && !localStorage.getItem('fadetube_config')) {
                    localStorage.setItem('fadetube_config', legacy);
                    localStorage.removeItem('fadedown_config');
                }
                const stored = localStorage.getItem('fadetube_config');
                if (stored) {
                    config = JSON.parse(stored);
                    if (config.v !== 1) { config.v = 1; }
                    // Add new config fields if missing
                    if (config.youtubeApiKey === undefined) config.youtubeApiKey = '';
                    if (config.hideShorts === undefined) config.hideShorts = true;
                    if (!config.youtubeChannels) config.youtubeChannels = [];

                    saveConfig();
                } else {
                    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                    saveConfig();
                }
            } catch (e) {
                config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            }
        }

        function saveConfig() {
            localStorage.setItem('fadetube_config', JSON.stringify(config));
        }

        // --- Cryptography ---
        async function sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
