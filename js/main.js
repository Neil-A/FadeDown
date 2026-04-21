        // Elements - declared as let to assign after DOM ready
        let elAppContainer;
        let elChildView;
        let elLockScreen;
        let elSessionTimer;
        let elClock;
        let elLockClock;
        let elOverlayContainer;
        let elChallengeGate;
        let elSetupPanel;
        let elParentPanel;
        let elParentTrigger;

        // Load & Initialize
        function bindElements() {
            elAppContainer = document.getElementById('app-container');
            elChildView = document.getElementById('child-view');
            elLockScreen = document.getElementById('lock-screen');
            elSessionTimer = document.getElementById('session-timer-display');
            elClock = document.getElementById('clock-display');
            elLockClock = document.getElementById('lock-clock-display');
            elOverlayContainer = document.getElementById('overlay-container');
            elChallengeGate = document.getElementById('challenge-gate');
            elSetupPanel = document.getElementById('setup-panel');
            elParentPanel = document.getElementById('parent-panel');
        }

        async function init() {
            bindElements();
            loadConfig();
            loadSession();

            updateUI();
            startLoops();

            setupEventListeners();

            // After loops started, open YouTube; or trigger setup on first run (?setup=1)
            if (location.search.indexOf('setup=1') !== -1) {
                history.replaceState(null, '', location.pathname);
                showSetupPanel(false);
            } else if (config.youtubeChannels && config.youtubeChannels.length > 0) {
                openYoutubePlayer();
            }
        }

        // --- Event Listeners ---
        function setupEventListeners() {
            // Long press trigger
            let pressTimer;
            elParentTrigger = document.getElementById('parent-trigger');
            elParentTrigger.addEventListener('mousedown', () => { pressTimer = window.setTimeout(triggerParentPanel, 1500); });
            elParentTrigger.addEventListener('mouseup', () => { clearTimeout(pressTimer); });
            elParentTrigger.addEventListener('mouseleave', () => { clearTimeout(pressTimer); });
            elParentTrigger.addEventListener('touchstart', () => { pressTimer = window.setTimeout(triggerParentPanel, 1500); });
            elParentTrigger.addEventListener('touchend', () => { clearTimeout(pressTimer); });

            // Player back button
            document.getElementById('yt-player-back-btn').addEventListener('click', () => {
                if (backBtnTimer) { clearInterval(backBtnTimer); backBtnTimer = null; }
                document.getElementById('yt-frame').src = '';
                document.getElementById('yt-player-view').classList.add('hidden');
                document.getElementById('yt-feed-view').classList.remove('hidden');
            });

            // Lock button in YT header
            document.getElementById('yt-lock-btn').addEventListener('click', triggerParentPanel);

            // Refresh button in YT header
            document.getElementById('yt-refresh-btn').addEventListener('click', () => {
                allFeedVideos = [];
                localStorage.removeItem('yt_feed_cache');
                loadFeed();
            });

            // Child view lock button
            document.getElementById('child-lock-btn').addEventListener('click', triggerParentPanel);

            document.getElementById('btn-watch-yt').addEventListener('click', () => {
                if (config.youtubeChannels && config.youtubeChannels.length > 0) {
                    openYoutubePlayer();
                } else {
                    triggerParentPanel();
                }
            });

            document.getElementById('btn-add-yt-channel').addEventListener('click', addYoutubeChannel);
            document.getElementById('btn-add-yt-playlist').addEventListener('click', addYoutubePlaylist);
            document.getElementById('restore-link').addEventListener('click', (e) => {
                e.preventDefault();
                showOverlay(elParentPanel);
                document.getElementById('parent-panel-content').innerHTML = `
                    <h2>Emergency Restore</h2>
                    <button id="btn-scan-qr-em" class="primary">Scan QR</button>
                    <div id="video-container" class="hidden" style="margin-top:1rem;">
                        <video id="qr-video" playsinline></video>
                    </div>
                    <textarea id="restore-text-em" rows="3" style="width:100%; margin-top:1rem;"></textarea>
                    <button id="btn-restore-text-em" style="margin-top:0.5rem;">Restore from Text</button>
                    <button onclick="window.location.reload()" style="margin-top:2rem;">Cancel</button>
                `;

                document.getElementById('btn-scan-qr-em').addEventListener('click', startScanner);
                document.getElementById('btn-restore-text-em').addEventListener('click', () => {
                    processRestore(document.getElementById('restore-text-em').value);
                });
            });

            // Reset PIN (visible after wrong attempts — requires math gate)
            document.getElementById('btn-reset-pin').addEventListener('click', () => {
                wrongAttempts = 0;
                cooldownEnd = 0;
                showSetupPanel(true);
            });

            // Factory reset
            document.getElementById('btn-factory-reset').addEventListener('click', () => {
                if (!confirm('This will erase all settings, channels, and PIN. Are you sure?')) return;
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            });

            // Closers
            document.getElementById('close-challenge').addEventListener('click', hideOverlay);
            document.getElementById('close-panel').addEventListener('click', () => {
                console.log('Close panel clicked');
                try {
                    gatherAndSaveSettings();
                    console.log('Settings saved');
                } catch (e) {
                    console.log('Error saving settings:', e);
                }
                hideOverlay();
            });

            // Math
            document.getElementById('math-submit').addEventListener('click', verifyChallenge);
            document.getElementById('math-answer').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') verifyChallenge();
            });

            // PIN
            document.querySelectorAll('#pin-challenge .key').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const val = e.target.getAttribute('data-val');
                    if (val === 'C') { currentPinInput = ''; }
                    else if (val === 'OK') { verifyChallenge(); }
                    else { if (currentPinInput.length < 6) currentPinInput += val; }
                    document.getElementById('pin-display').innerText = '*'.repeat(currentPinInput.length);
                });
            });

            // Pattern
            document.querySelectorAll('#pattern-challenge .pattern-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const val = e.target.getAttribute('data-val');
                    if (!currentPattern.includes(val)) {
                        currentPattern.push(val);
                        e.target.classList.add('active');
                    }
                });
            });
            document.getElementById('pattern-clear').addEventListener('click', () => {
                currentPattern = [];
                document.querySelectorAll('#pattern-challenge .pattern-dot').forEach(d => d.classList.remove('active'));
            });
            document.getElementById('pattern-submit').addEventListener('click', verifyChallenge);

            // Active Session Controls
            document.getElementById('btn-add-time').addEventListener('click', () => {
                sessionEndTime += 15 * 60000;
                sessionStorage.setItem('fadetube_session_start', sessionStart.toString());
                sessionStorage.setItem('fadetube_session_end', sessionEndTime.toString());
                hideOverlay();
                updateFade();
                updateClocks();
                checkSchedule(new Date());
            });
            document.getElementById('btn-reset-color').addEventListener('click', () => {
                currentSat = 1.0;
                elAppContainer.style.filter = `saturate(1.0)`;
                const now = Date.now();
                sessionStart = now;
                sessionEndTime = now + (config.sessionMins * 60000);
                sessionStorage.setItem('fadetube_session_start', sessionStart.toString());
                sessionStorage.setItem('fadetube_session_end', sessionEndTime.toString());
                hideOverlay();
                updateFade();
                updateClocks();
                checkSchedule(new Date());
            });
            document.getElementById('btn-end-session').addEventListener('click', () => {
                sessionEndTime = Date.now() - 1000;
                sessionStorage.setItem('fadetube_session_end', sessionEndTime.toString());
                updateClocks();
                updateFade();
                hideOverlay();
            });

            // Setting listeners (sync sliders)
            ['session-mins', 'fade-start', 'min-sat'].forEach(id => {
                document.getElementById(`set-${id}`).addEventListener('input', (e) => {
                    document.getElementById(`val-${id}`).innerText = e.target.value;
                });
            });

            // Days toggle
            document.querySelectorAll('#set-days .day-toggle').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.target.classList.toggle('active');
                });
            });

            // QR
            document.getElementById('btn-generate-qr').addEventListener('click', generateQR);
            document.getElementById('btn-print-qr').addEventListener('click', () => { window.print(); });
            document.getElementById('btn-scan-qr').addEventListener('click', startScanner);
            document.getElementById('btn-stop-scan').addEventListener('click', stopScanner);
            document.getElementById('btn-restore-text').addEventListener('click', () => {
                const text = document.getElementById('restore-text').value;
                if(text) processRestore(text);
            });

            document.getElementById('unlock-btn').addEventListener('click', triggerParentPanel);

            // Setup panel helper — requireMath=true when resetting an existing PIN/pattern
            let setupMathAnswer = 0;
            window.showSetupPanel = function(requireMath) {
                const gate = document.getElementById('setup-math-gate');
                const formBody = document.getElementById('setup-form-body');
                const title = document.getElementById('setup-panel-title');
                const subtitle = document.getElementById('setup-panel-subtitle');
                document.getElementById('setup-math-error').classList.add('hidden');
                document.getElementById('setup-math-answer').value = '';

                if (requireMath) {
                    title.textContent = 'Reset Parent Access';
                    subtitle.textContent = 'Solve the maths puzzle to confirm you\'re the parent, then set a new challenge.';
                    const a = Math.floor(Math.random() * 12) + 1;
                    const b = Math.floor(Math.random() * 12) + 1;
                    setupMathAnswer = a + b;
                    document.getElementById('setup-math-question').textContent = `${a} + ${b} = ?`;
                    gate.classList.remove('hidden');
                    formBody.classList.add('hidden');
                } else {
                    title.textContent = config.challengeHash ? 'Change Challenge' : 'Welcome to FadeTube';
                    subtitle.textContent = config.challengeHash ? 'Set a new parent access challenge.' : 'Let\'s set up your parent access challenge.';
                    gate.classList.add('hidden');
                    formBody.classList.remove('hidden');
                }
                showOverlay(elSetupPanel);
            };

            document.getElementById('btn-verify-setup-math').addEventListener('click', () => {
                const ans = parseInt(document.getElementById('setup-math-answer').value, 10);
                const elErr = document.getElementById('setup-math-error');
                if (ans === setupMathAnswer) {
                    document.getElementById('setup-math-gate').classList.add('hidden');
                    document.getElementById('setup-form-body').classList.remove('hidden');
                    elErr.classList.add('hidden');
                } else {
                    elErr.textContent = 'Incorrect, try again.';
                    elErr.classList.remove('hidden');
                    document.getElementById('setup-math-answer').value = '';
                }
            });

            // Setup Listeners
            const setupType = document.getElementById('setup-challenge-type');
            const refreshSetupUI = (val) => {
                document.getElementById('setup-pin-input-container').classList.toggle('hidden', val !== 'pin');
                document.getElementById('setup-pattern-container').classList.toggle('hidden', val !== 'pattern');
            };
            setupType.addEventListener('change', (e) => refreshSetupUI(e.target.value));
            refreshSetupUI(setupType.value); // show correct input for default selection

            let setupPattern = [];
            document.querySelectorAll('#setup-pattern-grid .pattern-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const val = e.target.getAttribute('data-val');
                    if (!setupPattern.includes(val)) {
                        setupPattern.push(val);
                        e.target.classList.add('active');
                    }
                });
            });
            document.getElementById('setup-pattern-clear').addEventListener('click', () => {
                setupPattern = [];
                document.querySelectorAll('#setup-pattern-grid .pattern-dot').forEach(d => d.classList.remove('active'));
            });

            document.getElementById('btn-finish-setup').addEventListener('click', async () => {
                const type = setupType.value;
                config.challengeType = type;
                if (type === 'pin') {
                    const pin = document.getElementById('setup-pin').value;
                    if (pin.length < 4) { alert("PIN must be at least 4 digits."); return; }
                    config.challengeHash = await sha256(pin);
                } else if (type === 'pattern') {
                    if (setupPattern.length < 3) { alert("Pattern must be at least 3 dots."); return; }
                    config.challengeHash = await sha256(setupPattern.join(''));
                } else {
                    config.challengeHash = null;
                }
                saveConfig();
                hideOverlay();
                updateUI();
                startLoops();
            });

            document.getElementById('btn-change-challenge').addEventListener('click', () => {
                hideOverlay();
                showSetupPanel(false);
            });

            // YouTube embed error detection
            window.addEventListener('message', (evt) => {
                if (evt.origin !== 'https://www.youtube.com') return;
                try {
                    const data = JSON.parse(evt.data);
                    if (data.event === 'onError') {
                        document.getElementById('yt-frame').classList.add('hidden');
                        document.getElementById('yt-player-error').classList.remove('hidden');
                    }
                } catch (e) {}
            });
        }

        // Boot
        window.addEventListener('DOMContentLoaded', init);
