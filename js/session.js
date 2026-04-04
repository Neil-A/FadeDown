        let sessionStart = null;
        let sessionEndTime = null;
        let fadeInterval = null;
        let currentSat = 1.0;

        function loadSession() {
            const stored = sessionStorage.getItem('fadetube_session_start');
            if (stored) {
                sessionStart = parseInt(stored, 10);
            } else {
                sessionStart = Date.now();
                sessionStorage.setItem('fadetube_session_start', sessionStart.toString());
            }
            const storedEnd = sessionStorage.getItem('fadetube_session_end');
            if (storedEnd) {
                sessionEndTime = parseInt(storedEnd, 10);
            } else {
                sessionEndTime = sessionStart + (config.sessionMins * 60000);
            }
        }

        function startSession() {
            sessionStart = Date.now();
            sessionStorage.setItem('fadetube_session_start', sessionStart.toString());
            sessionEndTime = sessionStart + (config.sessionMins * 60000);
            updateFade();
        }

        // --- Loops & Logic ---
        function startLoops() {
            setInterval(updateClocks, 1000);
            setInterval(updateFade, 10000);
            updateClocks();
            updateFade();
        }

        function updateClocks() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            elClock.innerText = timeStr;
            elLockClock.innerText = timeStr;

            checkSchedule(now);

            // Session timer
            if (sessionEndTime) {
                const msLeft = sessionEndTime - Date.now();
                if (msLeft > 0) {
                    const minsLeft = Math.ceil(msLeft / 60000);
                    elSessionTimer.innerText = `You have ${minsLeft} minutes left 🌤️`;
                } else {
                    elSessionTimer.innerText = "Session ended 🌙";
                }
            }
        }

        function checkSchedule(now) {
            const day = now.getDay();
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            let isAllowed = true;
            if (!config.days.includes(day)) isAllowed = false;
            if (timeStr < config.schedule.start || timeStr > config.schedule.end) isAllowed = false;

            // Check session ended
            if (sessionEndTime && Date.now() > sessionEndTime) {
                isAllowed = false;
                document.getElementById('lock-msg').innerText = "Great session!";
                document.getElementById('lock-sub').innerText = "Time to rest your eyes 🌙";
                document.getElementById('lock-icon').innerText = "😴";
            } else {
                document.getElementById('lock-msg').innerText = `Screen time starts at ${config.schedule.start}!`;
                document.getElementById('lock-sub').innerText = "Time to rest your eyes.";
                document.getElementById('lock-icon').innerText = "🌙";
            }

            if (!isAllowed && elOverlayContainer.classList.contains('hidden')) {
                elLockScreen.classList.remove('hidden');
                elChildView.classList.add('hidden');
                document.getElementById('yt-container').classList.add('hidden');
                elWelcomePage.classList.add('hidden');
            } else if (isAllowed && !elLockScreen.classList.contains('hidden')) {
                elLockScreen.classList.add('hidden');
                if (config.youtubeChannels && config.youtubeChannels.length > 0) {
                    openYoutubePlayer();
                } else {
                    elWelcomePage.classList.remove('hidden');
                }
            }
        }

        function updateFade() {
            if (!sessionStart || !sessionEndTime) return;
            const now = Date.now();
            if (now > sessionEndTime) {
                currentSat = config.minSat;
            } else {
                const fadeStartMs = sessionStart + (config.fadeStart * 60000);
                if (now < fadeStartMs) {
                    currentSat = 1.0;
                } else {
                    const fadeRangeMs = sessionEndTime - fadeStartMs;
                    const elapsedFadeMs = now - fadeStartMs;
                    const progress = elapsedFadeMs / fadeRangeMs;
                    currentSat = 1.0 - (progress * (1.0 - config.minSat));
                    currentSat = Math.max(config.minSat, currentSat);
                }
            }

            elAppContainer.style.filter = `saturate(${currentSat})`;
            document.getElementById('current-sat-display').innerText = `${Math.round(currentSat * 100)}%`;
        }

        function updateUI() {
            // Initial render
        }
