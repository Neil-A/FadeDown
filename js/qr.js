        // --- QR Backup & Restore ---
        function generateQR() {
            const safeConfig = JSON.parse(JSON.stringify(config));
            delete safeConfig.challengeHash;
            // Strip thumbnails and uploadsPlaylistId — reduces payload size significantly
            if (safeConfig.youtubeChannels) {
                safeConfig.youtubeChannels = safeConfig.youtubeChannels.map(ch => ({ id: ch.id, name: ch.name }));
            }

            const jsonStr = JSON.stringify(safeConfig);
            const b64 = btoa(unescape(encodeURIComponent(jsonStr)));

            const container = document.getElementById('qr-container');
            container.innerHTML = '';
            container.classList.remove('hidden');

            try {
                new QRCode(container, {
                    text: b64,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
                document.getElementById('btn-print-qr').classList.remove('hidden');
            } catch(e) {
                container.innerHTML = '<p style="color:var(--danger);padding:1rem;">Config too large for QR. Try removing some channels.</p>';
            }
        }

        function processRestore(b64) {
            try {
                const jsonStr = decodeURIComponent(escape(atob(b64)));
                const restored = JSON.parse(jsonStr);
                if (restored.v) {
                    config = restored;
                    config.challengeType = 'math';
                    config.challengeHash = null;
                    saveConfig();
                    alert("Settings restored successfully! Challenge reset to Maths.");
                    window.location.reload();
                } else {
                    throw new Error("Invalid format");
                }
            } catch (e) {
                alert("Invalid backup code.");
            }
        }

        async function startScanner() {
            const video = document.getElementById('qr-video');
            const container = document.getElementById('video-container');
            container.classList.remove('hidden');

            try {
                scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                video.srcObject = scanStream;
                video.setAttribute("playsinline", true);
                video.play();
                requestAnimationFrame(tickScan);
            } catch (err) {
                alert("Camera access denied or unavailable. Please paste code text instead.");
                container.classList.add('hidden');
            }
        }

        function tickScan() {
            if (!scanStream) return;
            const video = document.getElementById('qr-video');
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const canvasElement = document.createElement("canvas");
                canvasElement.width = video.videoWidth;
                canvasElement.height = video.videoHeight;
                const canvas = canvasElement.getContext("2d");
                canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

                if (code) {
                    stopScanner();
                    processRestore(code.data);
                    return;
                }
            }
            requestAnimationFrame(tickScan);
        }

        function stopScanner() {
            if (scanStream) {
                scanStream.getTracks().forEach(track => track.stop());
                scanStream = null;
            }
            document.getElementById('video-container').classList.add('hidden');
        }
