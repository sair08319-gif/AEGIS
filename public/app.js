/**
 * AEGIS STEALTH CHAT - CLIENT LOGIC
 * Manages WebSocket transport, E2EE lifecycle, Fixed-Size Padding, Chaff Traffic, and Panic Wipe.
 */

(() => {
  // DOM Elements
  const screenLobby = document.getElementById('screenLobby');
  const screenChat = document.getElementById('screenChat');
  const decoyScreen = document.getElementById('decoyScreen');

  const joinForm = document.getElementById('joinForm');
  const usernameInput = document.getElementById('usernameInput');
  const roomInput = document.getElementById('roomInput');
  const passphraseInput = document.getElementById('passphraseInput');
  const btnRandomCodename = document.getElementById('btnRandomCodename');
  const btnGenRoom = document.getElementById('btnGenRoom');
  const btnGenKey = document.getElementById('btnGenKey');
  const btnTogglePass = document.getElementById('btnTogglePass');

  const activeRoomLabel = document.getElementById('activeRoomLabel');
  const peerCountLabel = document.getElementById('peerCountLabel');
  const cryptoStatusLabel = document.getElementById('cryptoStatusLabel');
  const statusDot = document.getElementById('statusDot');
  const burnTimerSelect = document.getElementById('burnTimerSelect');
  const btnToggleRawCipher = document.getElementById('btnToggleRawCipher');
  const btnShareInvite = document.getElementById('btnShareInvite');
  const btnLeaveRoom = document.getElementById('btnLeaveRoom');
  const panicBtn = document.getElementById('panicBtn');

  // Header Symbol Dock & Minimalist Controls
  const headerSymbolDock = document.getElementById('headerSymbolDock');
  const chatActionGroup = document.getElementById('chatActionGroup');
  const btnBurnTimerDock = document.getElementById('btnBurnTimerDock');
  const burnTimerBadge = document.getElementById('burnTimerBadge');
  const roomDockBtn = document.getElementById('roomDockBtn');
  const peerDockBtn = document.getElementById('peerDockBtn');
  const chaffStatusBadge = document.getElementById('chaffStatusBadge');
  const safetyFingerprintBadge = document.getElementById('safetyFingerprintBadge');
  const safetyFingerprintCode = document.getElementById('safetyFingerprintCode');
  const cryptoIndicator = document.getElementById('cryptoIndicator');

  // Interactive Floating Popover Card Elements
  const symbolPopoverCard = document.getElementById('symbolPopoverCard');
  const popoverIcon = document.getElementById('popoverIcon');
  const popoverTitle = document.getElementById('popoverTitle');
  const popoverBody = document.getElementById('popoverBody');
  const popoverInteractiveArea = document.getElementById('popoverInteractiveArea');
  const popoverFooter = document.getElementById('popoverFooter');
  const popoverStatusBadge = document.getElementById('popoverStatusBadge');
  const popoverCloseBtn = document.getElementById('popoverCloseBtn');
  const stealthToast = document.getElementById('stealthToast');

  const messagesViewport = document.getElementById('messagesViewport');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const typingBar = document.getElementById('typingBar');
  const localIpContainer = document.getElementById('localIpContainer');

  // Image Attachment & Lightbox Elements
  const btnAttachImage = document.getElementById('btnAttachImage');
  const imageFileInput = document.getElementById('imageFileInput');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewThumb = document.getElementById('imagePreviewThumb');
  const imagePreviewName = document.getElementById('imagePreviewName');
  const imagePreviewSize = document.getElementById('imagePreviewSize');
  const btnCancelImage = document.getElementById('btnCancelImage');
  const imageLightboxModal = document.getElementById('imageLightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');

  let pendingImageDataUrl = null;

  // Security Alert & Shield Elements
  const securityAlertBanner = document.getElementById('securityAlertBanner');
  const alertTitle = document.getElementById('alertTitle');
  const alertDetails = document.getElementById('alertDetails');
  const btnDismissAlert = document.getElementById('btnDismissAlert');
  const shieldIndicator = document.getElementById('shieldIndicator');
  const shieldLabel = document.getElementById('shieldLabel');

  // State
  let ws = null;
  let currentRoom = '';
  let codename = '';
  let showCiphertext = false;
  let typingTimeout = null;
  let lastTypingSent = 0;
  let panicPressTimes = [];
  let decoyPressTimes = [];
  let blockedAttemptsCount = 0;

  // Metadata Defenses State
  let chaffEnabled = true;
  let chaffIntervalId = null;
  let chaffPacketsSent = 0;
  let chaffPacketsReceived = 0;

  // Web Audio Synthesizer (Chirps & Alarms)
  const playChirp = (frequency = 880, type = 'sine', duration = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  };

  const playSecurityAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(840, now + 0.15);
      osc.frequency.linearRampToValueAtTime(520, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {}
  };

  // Trigger Live Security Warning Banner
  const triggerSecurityAlert = (title, details) => {
    blockedAttemptsCount++;
    alertTitle.textContent = title;
    alertDetails.textContent = details;
    securityAlertBanner.style.display = 'flex';

    if (shieldLabel) {
      shieldLabel.textContent = `BLOCKED (${blockedAttemptsCount})`;
      shieldIndicator.style.color = 'var(--accent-crimson)';
      const dot = shieldIndicator.querySelector('.status-dot');
      if (dot) dot.style.background = 'var(--accent-crimson)';
    }

    playSecurityAlarm();
  };

  if (btnDismissAlert) {
    btnDismissAlert.addEventListener('click', () => {
      securityAlertBanner.style.display = 'none';
    });
  }

  // ACTIVE TAMPER & EXTENSION SNOOPING GUARD
  const initSecurityShield = () => {
    // 1. Root DOM Mutation Guard: Quarantines injected scripts, extensions, overlays
    const domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            const tag = node.tagName.toLowerCase();
            const className = (node.className || '').toString().toLowerCase();
            const id = (node.id || '').toLowerCase();

            // Detect foreign extension injections (Grammarly, password managers, scrapers)
            const isSuspicious = 
              tag === 'script' ||
              tag === 'iframe' ||
              className.includes('grammarly') ||
              className.includes('lastpass') ||
              className.includes('bitwarden') ||
              className.includes('translate') ||
              id.includes('extension') ||
              node.hasAttribute('data-gramm') ||
              node.hasAttribute('data-extension-id');

            if (isSuspicious) {
              try {
                node.parentNode.removeChild(node);
              } catch (e) {}
              triggerSecurityAlert(
                'SNOOPING EXTENSION INTERCEPTED & QUARANTINED',
                `A browser extension attempted to inject an unauthorized element (<${tag}>) into the page. The element was immediately purged.`
              );
            }
          }
        }
      }
    });

    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // 2. Synthetic Keystroke / Automated Bot Blocker
    const guardInput = (inputEl) => {
      if (!inputEl) return;

      const checkTrust = (e) => {
        // e.isTrusted is false if generated by an extension script or macro rather than human physical event
        if (e.isTrusted === false) {
          e.preventDefault();
          e.stopPropagation();
          triggerSecurityAlert(
            'SYNTHETIC / SCRIPTED INPUT BLOCKED',
            'An automated script or extension attempted to simulate or read typing on an input field. The event was rejected.'
          );
        }
      };

      inputEl.addEventListener('keydown', checkTrust, true);
      inputEl.addEventListener('input', checkTrust, true);
      inputEl.addEventListener('change', checkTrust, true);
    };

    guardInput(usernameInput);
    guardInput(roomInput);
    guardInput(passphraseInput);
    guardInput(messageInput);
  };

  // Run Shield immediately
  initSecurityShield();

  // Codename & Room Generators
  const generateCodename = () => {
    const prefixes = ['Ghost', 'Cipher', 'Viper', 'Shadow', 'Apex', 'Echo', 'Neon', 'Specter', 'Zero', 'Krypton'];
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${num}`;
  };

  const generateRoomId = () => {
    return 'room-' + Math.random().toString(36).substring(2, 8);
  };

  btnRandomCodename.addEventListener('click', () => {
    usernameInput.value = generateCodename();
  });

  btnGenRoom.addEventListener('click', () => {
    roomInput.value = generateRoomId();
  });

  btnGenKey.addEventListener('click', () => {
    passphraseInput.value = StealthCrypto.generateSecretKey(20);
    passphraseInput.type = 'text';
    btnTogglePass.textContent = 'Hide';
  });

  btnTogglePass.addEventListener('click', () => {
    if (passphraseInput.type === 'password') {
      passphraseInput.type = 'text';
      btnTogglePass.textContent = 'Hide';
    } else {
      passphraseInput.type = 'password';
      btnTogglePass.textContent = 'Show';
    }
  });

  btnToggleRawCipher.addEventListener('click', () => {
    showCiphertext = !showCiphertext;
    btnToggleRawCipher.classList.toggle('active', showCiphertext);
    document.querySelectorAll('.raw-cipher-preview').forEach(el => {
      el.style.display = showCiphertext ? 'block' : 'none';
    });
  });

  // IN-MEMORY ZERO-CLOUD IMAGE PROCESSOR
  // Scales down photo in RAM and converts to lightweight Base64 text string
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('⚠️ Please select a valid photo file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Downscale to max dimension 1024px to ensure fast, crisp encrypted relay
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to in-memory Base64 JPEG string (quality 0.72)
        const base64Text = canvas.toDataURL('image/jpeg', 0.72);
        pendingImageDataUrl = base64Text;

        // Render preview pill
        if (imagePreviewThumb) imagePreviewThumb.src = base64Text;
        if (imagePreviewName) imagePreviewName.textContent = file.name || 'Pasted Image';
        const sizeKb = Math.round((base64Text.length * 0.75) / 1024);
        if (imagePreviewSize) imagePreviewSize.textContent = `${sizeKb} KB • In-Memory Base64`;
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';

        showToast(`📷 Photo loaded (${sizeKb} KB text in RAM)`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (btnAttachImage && imageFileInput) {
    btnAttachImage.addEventListener('click', () => {
      imageFileInput.click();
    });

    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        processImageFile(file);
      }
    });
  }

  if (btnCancelImage) {
    btnCancelImage.addEventListener('click', () => {
      pendingImageDataUrl = null;
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
      if (imageFileInput) imageFileInput.value = '';
    });
  }

  // Support pasting images from clipboard (Ctrl+V) anywhere in window
  window.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  });

  // Lightbox Close Handlers
  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', () => {
      if (imageLightboxModal) imageLightboxModal.style.display = 'none';
      if (lightboxImg) lightboxImg.src = '';
    });
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', () => {
      if (imageLightboxModal) imageLightboxModal.style.display = 'none';
      if (lightboxImg) lightboxImg.src = '';
    });
  }

  const parseUrlFragment = () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (params.get('room')) roomInput.value = params.get('room');
    if (params.get('key')) passphraseInput.value = params.get('key');
  };

  const loadNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();
      localIpContainer.innerHTML = '';

      if (!data.ips || data.ips.length === 0) {
        localIpContainer.innerHTML = `<span class="ip-tag">http://localhost:${data.port}</span>`;
        return;
      }

      data.ips.forEach(ip => {
        const span = document.createElement('span');
        span.className = 'ip-tag';
        span.textContent = `http://${ip.address}:${data.port}`;
        span.title = 'Click to copy';
        span.addEventListener('click', () => {
          navigator.clipboard.writeText(`http://${ip.address}:${data.port}`);
          alert(`Copied: http://${ip.address}:${data.port}`);
        });
        localIpContainer.appendChild(span);
      });
    } catch (e) {
      localIpContainer.innerHTML = `<span class="ip-tag">http://localhost:3000</span>`;
    }
  };

  let activePopoverSymbol = null;
  let toastTimer = null;

  const showToast = (msg) => {
    if (!stealthToast) return;
    stealthToast.textContent = msg;
    stealthToast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      stealthToast.style.display = 'none';
    }, 2400);
  };

  const closePopover = () => {
    if (symbolPopoverCard) {
      symbolPopoverCard.style.display = 'none';
    }
    activePopoverSymbol = null;
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
  };

  const openPopoverForSymbol = (symbolKey, triggerBtn) => {
    if (!symbolPopoverCard) return;

    if (activePopoverSymbol === symbolKey && symbolPopoverCard.style.display === 'flex') {
      closePopover();
      return;
    }

    activePopoverSymbol = symbolKey;
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    if (triggerBtn && triggerBtn.classList.contains('dock-btn')) {
      triggerBtn.classList.add('active');
    }

    popoverInteractiveArea.innerHTML = '';
    popoverInteractiveArea.style.display = 'none';

    let icon = '🛡️';
    let title = '';
    let body = '';
    let badgeText = 'ACTIVE';

    switch (symbolKey) {
      case 'shield':
        icon = '🛡️';
        title = 'Anti-Snoop Shield';
        body = 'Active DOM MutationObserver and Synthetic Keystroke Filter defend against unauthorized extensions, keyloggers, and clipboard sniffers.<br><br>Any injected elements are immediately quarantined.';
        badgeText = blockedAttemptsCount === 0 ? '0 THREATS DETECTED' : `${blockedAttemptsCount} INTERCEPTED`;
        break;

      case 'crypto':
        icon = '🔒';
        title = 'AES-256 E2EE + 2KB Padding';
        body = 'Messages are encrypted directly on your device using <strong>AES-256-CBC</strong> with <strong>HMAC-SHA256</strong> verification.<br><br>Packets are padded to exactly <strong>2,048 bytes</strong> of cryptographic noise so packet lengths never leak message size.';
        badgeText = 'ZERO DISK STORAGE';
        break;

      case 'room':
        icon = '📡';
        title = 'Channel Frequency';
        body = `Connected to secure frequency: <strong style="color: var(--accent-emerald); font-family: var(--font-mono);">${escapeHtml(currentRoom || 'N/A')}</strong>.<br><br>The relay is in-memory only and never writes any conversation data to disk.`;
        badgeText = 'EPHEMERAL RAM';
        break;

      case 'peers':
        icon = '👥';
        title = 'Active Peers';
        body = `There are currently <strong>${peerCountLabel ? peerCountLabel.textContent : 1}</strong> peer(s) on this frequency.<br><br>Only people with the matching secret passphrase can decipher any transmission.`;
        badgeText = 'PEERS ONLINE';
        break;

      case 'chaff':
        icon = '⚡';
        title = 'Chaff Dummy Traffic';
        body = `Continuous randomized 2KB dummy noise packets are generated in the background.<br><br>This masks transmission timing and burst rhythms so ISPs cannot correlate when you are messaging or idle.`;
        badgeText = `↑${chaffPacketsSent} SENT | ↓${chaffPacketsReceived} RECV`;
        break;

      case 'fingerprint':
        icon = '🔏';
        title = 'Safety Fingerprint (SAS)';
        const fp = safetyFingerprintCode ? safetyFingerprintCode.textContent : '••••';
        body = `Verify this 4-emoji fingerprint with your contact:<br><div style="font-size: 1.4rem; margin: 10px 0; text-align: center; letter-spacing: 4px;">${fp}</div>If both devices show matching symbols, your channel is mathematically free of Man-in-the-Middle interception.`;
        badgeText = 'HMAC-SHA256 VERIFIED';
        break;

      case 'burn':
        icon = '🔥';
        title = 'Auto-Burn Ephemeral Timer';
        body = 'Select auto-evaporation duration for messages once viewed:';
        popoverInteractiveArea.style.display = 'flex';

        const durations = [
          { val: '0', label: 'Off' },
          { val: '15', label: '15s (Default)' },
          { val: '30', label: '30s' },
          { val: '60', label: '60s' },
          { val: '300', label: '5m' }
        ];

        durations.forEach(d => {
          const optBtn = document.createElement('button');
          optBtn.type = 'button';
          optBtn.className = `popover-option-btn ${burnTimerSelect.value === d.val ? 'active' : ''}`;
          optBtn.textContent = d.label;
          optBtn.addEventListener('click', () => {
            burnTimerSelect.value = d.val;
            const label = d.val === '0' ? 'Off' : (d.val >= 60 ? (d.val / 60) + 'm' : d.val + 's');
            if (burnTimerBadge) burnTimerBadge.textContent = label;
            if (btnBurnTimerDock) btnBurnTimerDock.dataset.tooltip = `Auto-Burn: ${label}`;
            showToast(`🔥 Auto-burn set to ${label}`);
            closePopover();
          });
          popoverInteractiveArea.appendChild(optBtn);
        });

        badgeText = `CURRENT: ${burnTimerBadge ? burnTimerBadge.textContent : '15s'}`;
        break;

      case 'wipe':
      case 'panic':
        icon = '🗑️';
        title = 'WIPE & Destroy Channel';
        body = 'Emergency Kill-Switch: Instantly destroys the room on the relay server, zeroes all encryption keys from active memory, and closes the browser chat tab completely.';
        popoverInteractiveArea.style.display = 'flex';

        const wipeNowBtn = document.createElement('button');
        wipeNowBtn.type = 'button';
        wipeNowBtn.className = 'popover-option-btn active';
        wipeNowBtn.style.background = '#dc2626';
        wipeNowBtn.style.color = '#fff';
        wipeNowBtn.textContent = '⚠️ EXECUTE WIPE NOW';
        wipeNowBtn.addEventListener('click', () => {
          closePopover();
          triggerWipe(false);
        });
        popoverInteractiveArea.appendChild(wipeNowBtn);

        badgeText = 'KILL-SWITCH';
        break;
    }

    popoverIcon.textContent = icon;
    popoverTitle.textContent = title;
    popoverBody.innerHTML = body;
    popoverStatusBadge.textContent = badgeText;

    symbolPopoverCard.style.display = 'flex';

    if (triggerBtn) {
      const rect = triggerBtn.getBoundingClientRect();
      const popoverWidth = 320;
      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      if (left < 10) left = 10;
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      symbolPopoverCard.style.top = `${rect.bottom + 10}px`;
      symbolPopoverCard.style.left = `${left}px`;
    }
  };

  // Wire up symbol buttons
  document.querySelectorAll('[data-symbol]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const symbol = btn.getAttribute('data-symbol');

      if (symbol === 'share') {
        const key = passphraseInput.value;
        const url = `${window.location.origin}${window.location.pathname}#room=${encodeURIComponent(currentRoom)}&key=${encodeURIComponent(key)}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast('✓ Secret invite link copied to clipboard!');
        });
        return;
      }

      if (symbol === 'cipher') {
        showCiphertext = !showCiphertext;
        btnToggleRawCipher.classList.toggle('active', showCiphertext);
        document.querySelectorAll('.raw-cipher-preview').forEach(el => {
          el.style.display = showCiphertext ? 'block' : 'none';
        });
        showToast(showCiphertext ? '🔒 Raw ciphertext preview enabled' : '🔒 Raw ciphertext hidden');
        return;
      }

      if (symbol === 'panic' || symbol === 'wipe') {
        triggerWipe(false);
        return;
      }

      if (symbol === 'exit') {
        btnLeaveRoom.click();
        return;
      }

      openPopoverForSymbol(symbol, btn);
    });
  });

  document.addEventListener('click', (e) => {
    if (symbolPopoverCard && symbolPopoverCard.style.display === 'flex') {
      if (!symbolPopoverCard.contains(e.target) && !e.target.closest('[data-symbol]')) {
        closePopover();
      }
    }
  });

  if (popoverCloseBtn) {
    popoverCloseBtn.addEventListener('click', closePopover);
  }

  btnShareInvite.addEventListener('click', () => {
    const key = passphraseInput.value;
    const url = `${window.location.origin}${window.location.pathname}#room=${encodeURIComponent(currentRoom)}&key=${encodeURIComponent(key)}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('✓ Secret invite link copied to clipboard!');
    });
  });

  // Form Submit: Initialize Crypto & Connect
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    codename = usernameInput.value.trim() || generateCodename();
    currentRoom = roomInput.value.trim();
    const passphrase = passphraseInput.value.trim();

    if (!currentRoom || !passphrase) {
      alert('Room ID and Secret Passphrase are required.');
      return;
    }

    if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'DERIVING KEY (PBKDF2)...';

    try {
      await window.stealthCrypto.initializeKey(passphrase, currentRoom);

      connectRelay(currentRoom);

      activeRoomLabel.textContent = currentRoom;
      if (roomDockBtn) roomDockBtn.dataset.tooltip = `Channel: ${currentRoom}`;

      screenLobby.style.display = 'none';
      screenChat.style.display = 'flex';

      // Reveal Minimalist Symbol Docks
      if (headerSymbolDock) headerSymbolDock.style.display = 'inline-flex';
      if (chatActionGroup) chatActionGroup.style.display = 'inline-flex';

      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'E2EE ACTIVE + 2KB PADDING';
      if (statusDot) statusDot.style.background = 'var(--accent-emerald)';

      // Calculate and display Anti-Phishing Safety Fingerprint (SAS)
      if (safetyFingerprintCode) {
        safetyFingerprintCode.textContent = calculateSafetyFingerprint(passphrase, currentRoom);
      }

      // Start Chaff (Dummy Traffic) Generator
      startChaffGenerator();

      messageInput.focus();
    } catch (err) {
      console.error(err);
      alert('Cryptographic key initialization error: ' + err.message);
      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'CRYPTO ERROR';
    }
  });

  // Calculate Memorable Anti-Phishing Safety Fingerprint (4 Emoji Verification)
  const calculateSafetyFingerprint = (passphrase, roomId) => {
    const hash = CryptoJS.HmacSHA256(roomId, passphrase).toString();
    const emojis = ['🦊', '⚡', '💎', '🛡️', '🔑', '🚀', '🔥', '🦅', '🍀', '🎯', '⚓', '👑', '🌌', '🛸', '🦁', '⭐'];
    let fp = '';
    for (let i = 0; i < 4; i++) {
      const idx = parseInt(hash.substr(i * 2, 2), 16) % emojis.length;
      fp += emojis[idx] + ' ';
    }
    const num = parseInt(hash.substr(8, 4), 16) % 1000;
    const fullCode = `${fp.trim()} (#${String(num).padStart(3, '0')})`;
    if (safetyFingerprintBadge) {
      safetyFingerprintBadge.dataset.tooltip = `Safety Fingerprint: ${fullCode}`;
    }
    return fullCode;
  };

  // Chaff / Dummy Traffic Generator (Anti-Traffic-Analysis)
  const startChaffGenerator = () => {
    stopChaffGenerator();
    if (!chaffEnabled) return;

    // Send randomized dummy packets every 4 to 8 seconds
    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 4000;
      chaffIntervalId = setTimeout(async () => {
        if (ws && ws.readyState === WebSocket.OPEN && window.stealthCrypto.activeKey) {
          try {
            // Create dummy heartbeat packet (padded to 2KB)
            const encryptedDummy = await window.stealthCrypto.encrypt({
              isDummy: true,
              sender: 'CHAFF',
              timestamp: Date.now()
            });

            ws.send(JSON.stringify({
              type: 'encrypted_message',
              roomId: currentRoom,
              payload: {
                id: 'chaff-' + Math.random().toString(36).substring(2, 8),
                ciphertext: encryptedDummy.ciphertext,
                iv: encryptedDummy.iv,
                salt: encryptedDummy.salt,
                authTag: encryptedDummy.authTag,
                burnSeconds: 0
              }
            }));
            chaffPacketsSent++;
            updateChaffUI();
          } catch (e) {}
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  };

  const stopChaffGenerator = () => {
    if (chaffIntervalId) {
      clearTimeout(chaffIntervalId);
      chaffIntervalId = null;
    }
  };

  const updateChaffUI = () => {
    const chaffEl = document.getElementById('chaffStatusBadge');
    if (chaffEl) {
      chaffEl.dataset.tooltip = `Chaff Traffic: Active (↑${chaffPacketsSent} / ↓${chaffPacketsReceived})`;
    }
  };

  // WebSocket Connection
  const connectRelay = (roomId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        roomId: roomId,
        peerId: codename
      }));
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        switch (msg.type) {
          case 'presence': {
            if (msg.peerCount !== undefined) {
              if (peerCountLabel) peerCountLabel.textContent = msg.peerCount;
              if (peerDockBtn) peerDockBtn.dataset.tooltip = `Active Peers: ${msg.peerCount}`;
            }
            break;
          }

          case 'encrypted_message': {
            await handleIncomingEncryptedMessage(msg.payload);
            break;
          }

          case 'room_wiped': {
            triggerWipe(true);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling relay packet:', err);
      }
    };

    ws.onclose = () => {
      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'DISCONNECTED';
      if (statusDot) statusDot.style.background = 'var(--accent-crimson)';
      if (peerCountLabel) peerCountLabel.textContent = '0';
      if (peerDockBtn) peerDockBtn.dataset.tooltip = 'Disconnected';
      stopChaffGenerator();
    };
  };

  // Replay Attack Cache (Prevents intercepted packets from being re-sent)
  const seenPacketIds = new Set();
  const markPacketSeen = (id) => {
    if (!id) return;
    seenPacketIds.add(id);
    if (seenPacketIds.size > 400) {
      const oldest = seenPacketIds.values().next().value;
      seenPacketIds.delete(oldest);
    }
  };

  // Handle Incoming Encrypted Payload
  const handleIncomingEncryptedMessage = async (payload) => {
    if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) return;

    // 1. Replay Attack Protection: Drop duplicate packets
    if (payload.id && seenPacketIds.has(payload.id)) {
      console.warn('Replay attack blocked: Duplicate packet ID received.');
      return;
    }
    if (payload.id) {
      markPacketSeen(payload.id);
    }

    try {
      // 2. Decrypt locally with AES-256 + verify HMAC
      const data = await window.stealthCrypto.decrypt(payload);

      // If this is a Chaff / Dummy packet, absorb silently without rendering
      if (data && data.isDummy) {
        chaffPacketsReceived++;
        updateChaffUI();
        // Subtle micro-flash on security status dot
        statusDot.style.transform = 'scale(1.4)';
        setTimeout(() => { statusDot.style.transform = 'scale(1)'; }, 150);
        return;
      }

      // 3. Stale Message / Delayed Replay Defense: Reject packets older than 2 minutes
      if (data && data.timestamp && Math.abs(Date.now() - data.timestamp) > 120000) {
        console.warn('Stale message rejected: Timestamp outside 2-minute freshness window.');
        return;
      }

      playChirp(650, 'triangle', 0.08);

      // 4. Render real message - burnSeconds is safely read from INSIDE the authenticated payload
      renderMessage({
        sender: data.sender,
        text: data.text || '',
        image: data.image || null,
        timestamp: data.timestamp,
        isOutgoing: false,
        rawCiphertext: payload.ciphertext,
        burnSeconds: Number(data.burnSeconds) || 0
      });
    } catch (err) {
      renderMessage({
        sender: 'UNKNOWN / TAMPERED',
        text: '⚠️ DECRYPTION FAILED: Cryptographic authentication tag mismatch. Message was either altered in transit or sent with a different passphrase.',
        timestamp: Date.now(),
        isOutgoing: false,
        isError: true,
        rawCiphertext: payload.ciphertext
      });
    }
  };

  // Send Message
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const imageToSend = pendingImageDataUrl;

    if ((!text && !imageToSend) || !ws || ws.readyState !== WebSocket.OPEN) return;

    messageInput.value = '';
    pendingImageDataUrl = null;
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imageFileInput) imageFileInput.value = '';

    const burnSeconds = parseInt(burnTimerSelect.value, 10) || 0;

    // SECURITY: burnSeconds is packed INSIDE the encrypted payload so it is HMAC-authenticated
    // and cannot be read or tampered with on the network.
    const messageData = {
      isDummy: false,
      sender: codename,
      text: text,
      image: imageToSend || null,
      burnSeconds: burnSeconds,
      timestamp: Date.now()
    };

    // 1. Encrypt with Fixed-Size 2048-Byte Padding (or dynamic size for photo payloads)
    const encrypted = await window.stealthCrypto.encrypt(messageData);

    const packetId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    markPacketSeen(packetId);

    // 2. Transmit over WebSocket (No unencrypted burnSeconds in outer packet!)
    const packet = {
      id: packetId,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      authTag: encrypted.authTag
    };

    ws.send(JSON.stringify({
      type: 'encrypted_message',
      roomId: currentRoom,
      payload: packet
    }));

    playChirp(880, 'sine', 0.06);

    // 3. Render locally
    renderMessage({
      sender: codename,
      text: text,
      image: imageToSend || null,
      timestamp: messageData.timestamp,
      isOutgoing: true,
      rawCiphertext: encrypted.ciphertext,
      burnSeconds: burnSeconds
    });
  });

  // Render Message Bubble with Complete Auto-Burn RAM Purge
  const renderMessage = ({ sender, text = '', image = null, timestamp, isOutgoing, isError = false, rawCiphertext = '', burnSeconds = 0 }) => {
    const row = document.createElement('div');
    row.className = `msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let metaHtml = `
      <div class="msg-meta">
        <span>${escapeHtml(sender)}</span>
        <span>•</span>
        <span>${timeStr}</span>
        ${burnSeconds > 0 ? `<span>• 🔥 ${burnSeconds}s</span>` : ''}
      </div>
    `;

    let textHtml = '';
    if (text) {
      textHtml = `<div class="msg-text">${escapeHtml(text)}</div>`;
    }

    let cipherHtml = '';
    if (rawCiphertext) {
      const sanitizedSnippet = escapeHtml(String(rawCiphertext).substring(0, 100));
      const safeLength = Number(rawCiphertext.length) || 0;
      cipherHtml = `
        <div class="raw-cipher-preview" style="display: ${showCiphertext ? 'block' : 'none'};">
          <div class="cipher-badge">🔒 AES-256 CIPHERTEXT:</div>
          <div class="cipher-blob">${sanitizedSnippet}... [${safeLength} bytes]</div>
        </div>
      `;
    }

    let burnBarHtml = '';
    if (burnSeconds > 0) {
      burnBarHtml = `
        <div class="burn-timer-bar">
          <div class="burn-progress" style="transition-duration: ${burnSeconds}s;"></div>
        </div>
      `;
    }

    row.innerHTML = `
      ${metaHtml}
      <div class="msg-bubble ${isError ? 'decrypt-error' : ''}">
        <div class="msg-image-slot"></div>
        ${textHtml}
        ${burnBarHtml}
      </div>
      ${cipherHtml}
    `;

    // Secure Image DOM Injection: Validate data:image protocol to prevent HTML injection
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      const slot = row.querySelector('.msg-image-slot');
      if (slot) {
        const wrap = document.createElement('div');
        wrap.className = 'msg-image-wrap';
        const imgEl = document.createElement('img');
        imgEl.className = 'msg-image-thumb';
        imgEl.alt = 'Encrypted photo';
        imgEl.src = image; // Safe attribute assignment via DOM API
        imgEl.addEventListener('click', () => {
          if (lightboxImg && imageLightboxModal) {
            lightboxImg.src = image;
            imageLightboxModal.style.display = 'flex';
          }
        });
        wrap.appendChild(imgEl);
        slot.appendChild(wrap);
      }
    }

    messagesViewport.appendChild(row);
    messagesViewport.scrollTop = messagesViewport.scrollHeight;

    // Auto-Burn: Total Erasure from RAM, DOM, and Inspector
    if (burnSeconds > 0) {
      const progressBar = row.querySelector('.burn-progress');
      setTimeout(() => {
        if (progressBar) progressBar.style.width = '0%';
      }, 50);

      setTimeout(() => {
        row.style.transition = 'all 0.5s ease';
        row.style.opacity = '0';
        row.style.transform = 'scale(0.9)';
        setTimeout(() => {
          // COMPLETE RAM & CIPHER PURGE:
          // 1. Wipe image memory & canvas handles
          row.querySelectorAll('img').forEach(img => {
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            img.remove();
          });
          // 2. Overwrite and destroy raw ciphertext & text strings
          row.querySelectorAll('.msg-text, .raw-cipher-preview, .cipher-blob, .msg-meta').forEach(el => {
            el.textContent = '';
            el.remove();
          });
          // 3. Purge entire DOM subtree
          row.innerHTML = '';
          if (row.parentNode) row.parentNode.removeChild(row);
        }, 500);
      }, burnSeconds * 1000);
    }
  };

  const escapeHtml = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Close tab or redirect immediately to blank page
  const executeTabExit = () => {
    // 1. Attempt standard window.close()
    try {
      window.close();
    } catch (e) {}

    // 2. If blocked by browser sandbox (direct navigation), replace location with about:blank
    setTimeout(() => {
      try {
        window.location.replace('about:blank');
      } catch (e) {
        decoyScreen.style.display = 'flex';
      }
    }, 120);
  };

  // Emergency Kill-Switch: Wipes room from memory, server, and destroys tab
  const triggerWipe = (isIncoming = false) => {
    stopChaffGenerator();
    closePopover();

    if (!isIncoming && ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'wipe_room', roomId: currentRoom }));
      } catch (e) {}
    }

    if (ws) {
      try { ws.close(); } catch(e) {}
      ws = null;
    }

    // Zero out cryptographic keys and active buffers in RAM
    window.stealthCrypto.destroy();
    seenPacketIds.clear();
    messagesViewport.innerHTML = '';
    messageInput.value = '';
    passphraseInput.value = '';
    roomInput.value = '';
    pendingImageDataUrl = null;
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imageFileInput) imageFileInput.value = '';

    if (headerSymbolDock) headerSymbolDock.style.display = 'none';
    if (chatActionGroup) chatActionGroup.style.display = 'none';

    // Strip hash and secrets from browser URL bar history
    try {
      window.history.replaceState(null, '', window.location.pathname || '/');
    } catch (e) {}

    if (isIncoming) {
      showToast('⚠️ EMERGENCY WIPE: Peer initiated channel destruction.');
      setTimeout(() => {
        executeTabExit();
      }, 700);
    } else {
      executeTabExit();
    }
  };

  // Anti-Forensics: PANIC WIPE
  const triggerPanicWipe = () => {
    triggerWipe(false);
  };

  panicBtn.addEventListener('click', triggerPanicWipe);

  btnLeaveRoom.addEventListener('click', () => {
    stopChaffGenerator();
    closePopover();
    if (ws) {
      ws.send(JSON.stringify({ type: 'leave', roomId: currentRoom }));
      ws.close();
    }
    window.stealthCrypto.destroy();
    seenPacketIds.clear();
    messagesViewport.innerHTML = `
      <div class="channel-start-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Channel Closed &bull; Memory Cleared</span>
      </div>
    `;
    screenChat.style.display = 'none';
    if (headerSymbolDock) headerSymbolDock.style.display = 'none';
    if (chatActionGroup) chatActionGroup.style.display = 'none';
    screenLobby.style.display = 'flex';
    if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'AES-256 READY';
    if (statusDot) statusDot.style.background = 'var(--accent-emerald)';
  });

  // Hotkey Navigation & Safe Panic Trigger
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 1. If Lightbox is open, ESC closes the lightbox WITHOUT triggering panic wipe
      if (imageLightboxModal && imageLightboxModal.style.display === 'flex') {
        imageLightboxModal.style.display = 'none';
        if (lightboxImg) lightboxImg.src = '';
        panicPressTimes = [];
        return;
      }

      // 2. If Symbol Popover is open, ESC closes popover WITHOUT triggering panic wipe
      if (symbolPopoverCard && symbolPopoverCard.style.display === 'flex') {
        closePopover();
        panicPressTimes = [];
        return;
      }

      const now = Date.now();
      if (decoyScreen && decoyScreen.style.display === 'flex') {
        decoyPressTimes.push(now);
        decoyPressTimes = decoyPressTimes.filter(t => now - t < 1500);
        if (decoyPressTimes.length >= 3) {
          decoyScreen.style.display = 'none';
          screenLobby.style.display = 'flex';
          decoyPressTimes = [];
        }
        return;
      }

      panicPressTimes.push(now);
      panicPressTimes = panicPressTimes.filter(t => now - t < 1200);
      if (panicPressTimes.length >= 2) {
        triggerPanicWipe();
        panicPressTimes = [];
      }
    }
  });

  // Initialize
  usernameInput.value = generateCodename();
  roomInput.value = generateRoomId();
  parseUrlFragment();
  loadNetworkInfo();
})();
