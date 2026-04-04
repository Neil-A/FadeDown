        // --- Core Logic ---

        const DEFAULT_CONFIG = {
            v: 1,
            sessionMins: 45,
            fadeStart: 30,
            minSat: 0.2,
            schedule: { start: "00:00", end: "24:00" },
            days: [0, 1, 2, 3, 4, 5, 6],
            challengeType: "pin",
            challengeHash: null,
            youtubeApiKey: '',
            hideShorts: true,
            youtubeChannels: []
        };

        const DEFAULT_CHANNELS = [
            { name: "Ms. Rachel – Songs for Littles", handle: "@SongsforLittles" },
            { name: "Little Bear",                    handle: "@LittleBearOfficial" },
            { name: "Storyline Online",               handle: "@StorylineOnline" },
            { name: "Puffin Rock",                    handle: "@PuffinRock" },
            { name: "Tumble Leaf",                    handle: "@TumbleLeaf" },
            { name: "Super Simple Songs",             handle: "@supersimplesongs" },
            { name: "Daniel Tiger's Neighborhood",    handle: "@DanielTigersNeighborhood" },
            { name: "Sesame Street",                  handle: "@SesameStreet" },
            { name: "PBS Kids",                       handle: "@pbskids" },
            { name: "Boey Bear",                      handle: "@boeybear" },
            { name: "Trash Truck",                    handle: "@TrashTruck" },
            { name: "Franklin",                       handle: "@FranklinAndFriends" },
            { name: "Cosmic Kids Yoga",               handle: "@cosmickidsyoga" }
        ];

        // Each proxy: [proxyUrl, encodeUrl]
        const CORS_PROXIES = [
            ['https://api.allorigins.win/raw?url=', true],
            ['https://api.codetabs.com/v1/proxy?quest=', false],
            ['https://thingproxy.freeboard.io/fetch/', false],
        ];

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
                    if (!config.youtubeChannels || config.youtubeChannels.length === 0) config.youtubeChannels = DEFAULT_CHANNELS.map(c => Object.assign({}, c));
                    if (!config.schedule) config.schedule = { start: '00:00', end: '24:00' };
                    if (!config.days || config.days.length === 0) config.days = [0,1,2,3,4,5,6];
                    // Migrate old "23:59" end to "24:00" so late-night access works
                    if (config.schedule.end === '23:59') config.schedule.end = '24:00';

                    saveConfig();
                } else {
                    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                    config.youtubeChannels = DEFAULT_CHANNELS.map(c => Object.assign({}, c));
                    saveConfig();
                }
            } catch (e) {
                config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                config.youtubeChannels = DEFAULT_CHANNELS.map(c => Object.assign({}, c));
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
