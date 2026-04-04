        let wrongAttempts = 0;
        let cooldownEnd = 0;
        let currentMathAnswer = 0;
        let currentPinInput = '';
        let currentPattern = [];

        // --- Overlays ---
        function showOverlay(panel) {
            elOverlayContainer.classList.remove('hidden');
            elChallengeGate.classList.add('hidden');
            elParentPanel.classList.add('hidden');
            elSetupPanel.classList.add('hidden');
            panel.classList.remove('hidden');
        }

        function hideOverlay() {
            elOverlayContainer.classList.add('hidden');
            stopScanner();
            checkSchedule(new Date());
            if (config.youtubeChannels && config.youtubeChannels.length > 0) {
                elWelcomePage.classList.add('hidden');
            }
        }

        // --- Challenge Gate ---
        function showChallengeGate() {
            // Reset inputs
            currentPinInput = '';
            currentPattern = [];
            document.getElementById('pin-display').innerText = '';
            document.getElementById('math-answer').value = '';
            document.querySelectorAll('#pattern-challenge .pattern-dot').forEach(d => d.classList.remove('active'));

            // Hide all challenge sections and reset state
            document.getElementById('math-challenge').classList.add('hidden');
            document.getElementById('pin-challenge').classList.add('hidden');
            document.getElementById('pattern-challenge').classList.add('hidden');
            document.getElementById('cooldown-msg').classList.add('hidden');
            document.getElementById('challenge-error').classList.add('hidden');
            document.getElementById('btn-reset-pin').classList.add('hidden');

            // Show correct challenge
            if (config.challengeType === 'math') {
                const a = Math.floor(Math.random() * 12) + 1;
                const b = Math.floor(Math.random() * 12) + 1;
                currentMathAnswer = a + b;
                document.getElementById('math-question').innerText = `${a} + ${b} = ?`;
                document.getElementById('math-challenge').classList.remove('hidden');
            } else if (config.challengeType === 'pin') {
                document.getElementById('pin-challenge').classList.remove('hidden');
            } else if (config.challengeType === 'pattern') {
                document.getElementById('pattern-challenge').classList.remove('hidden');
            }

            showOverlay(elChallengeGate);
        }

        function triggerParentPanel() {
            if (Date.now() < cooldownEnd) {
                alert(`Please wait ${Math.ceil((cooldownEnd - Date.now())/1000)} seconds.`);
                return;
            }
            // First-time setup: PIN or pattern selected but no hash stored yet
            if (!config.challengeHash && config.challengeType !== 'math') {
                showSetupPanel(false);
            } else {
                showChallengeGate();
            }
        }

        async function verifyChallenge() {
            let success = false;

            if (config.challengeType === 'math') {
                const ans = parseInt(document.getElementById('math-answer').value, 10);
                success = (ans === currentMathAnswer);
            } else if (config.challengeType === 'pin') {
                const hash = await sha256(currentPinInput);
                success = (hash === config.challengeHash);
            } else if (config.challengeType === 'pattern') {
                const hash = await sha256(currentPattern.join(''));
                success = (hash === config.challengeHash);
            }

            if (success) {
                wrongAttempts = 0;
                openParentPanel();
            } else {
                wrongAttempts++;
                currentPinInput = '';
                document.getElementById('pin-display').innerText = '';
                currentPattern = [];
                document.querySelectorAll('#pattern-challenge .pattern-dot').forEach(d => d.classList.remove('active'));

                const elErr = document.getElementById('challenge-error');
                const elReset = document.getElementById('btn-reset-pin');
                elReset.classList.remove('hidden');

                if (wrongAttempts >= 3) {
                    cooldownEnd = Date.now() + 60000;
                    document.getElementById('cooldown-msg').classList.remove('hidden');
                    elErr.classList.add('hidden');
                } else {
                    elErr.innerText = `Incorrect. ${3 - wrongAttempts} attempt${3 - wrongAttempts === 1 ? '' : 's'} remaining.`;
                    elErr.classList.remove('hidden');
                }
            }
        }

        // --- Parent Panel UI ---
        function openParentPanel() {
            populateSettingsUI();
            showOverlay(elParentPanel);
        }

        function populateSettingsUI() {
            document.getElementById('set-session-mins').value = config.sessionMins;
            document.getElementById('val-session-mins').innerText = config.sessionMins;
            document.getElementById('set-fade-start').value = config.fadeStart;
            document.getElementById('val-fade-start').innerText = config.fadeStart;
            document.getElementById('set-min-sat').value = Math.round(config.minSat * 100);
            document.getElementById('val-min-sat').innerText = Math.round(config.minSat * 100);
            document.getElementById('set-schedule-start').value = config.schedule.start;
            document.getElementById('set-schedule-end').value = config.schedule.end;

            document.querySelectorAll('#set-days .day-toggle').forEach(el => {
                const day = parseInt(el.getAttribute('data-day'), 10);
                if (config.days.includes(day)) el.classList.add('active');
                else el.classList.remove('active');
            });

            document.getElementById('yt-api-key').value = config.youtubeApiKey || '';
            document.getElementById('set-hide-shorts').checked = config.hideShorts !== false;
            renderYtChannelConfigList();

            const typeNames = { math: 'Maths Puzzle', pin: 'PIN', pattern: 'Pattern' };
            document.getElementById('current-challenge-type-label').innerText = typeNames[config.challengeType];
        }

        function gatherAndSaveSettings() {
            config.sessionMins = parseInt(document.getElementById('set-session-mins').value, 10);
            config.fadeStart = parseInt(document.getElementById('set-fade-start').value, 10);
            config.minSat = parseInt(document.getElementById('set-min-sat').value, 10) / 100;
            config.schedule.start = document.getElementById('set-schedule-start').value;
            config.schedule.end = document.getElementById('set-schedule-end').value;

            const days = [];
            document.querySelectorAll('#set-days .day-toggle.active').forEach(el => {
                days.push(parseInt(el.getAttribute('data-day'), 10));
            });
            config.days = days;
            config.youtubeApiKey = document.getElementById('yt-api-key').value.trim();
            config.hideShorts = document.getElementById('set-hide-shorts').checked;

            saveConfig();
            loadSession();
            updateFade();
            updateClocks();

            allFeedVideos = [];
            localStorage.removeItem('yt_feed_cache');
        }
