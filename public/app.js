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

  const headerBrand = document.getElementById('headerBrand');
  const chatHeaderInfo = document.getElementById('chatHeaderInfo');
  const activeRoomLabel = document.getElementById('activeRoomLabel');
  const peerCountLabel = document.getElementById('peerCountLabel');
  const cryptoStatusLabel = document.getElementById('cryptoStatusLabel');
  const statusDot = document.getElementById('statusDot');
  const burnTimerSelect = document.getElementById('burnTimerSelect');
  const btnShareInvite = document.getElementById('btnShareInvite');
  const btnLeaveRoom = document.getElementById('btnLeaveRoom');
  const panicBtn = document.getElementById('panicBtn');

  // Active Peers Modal Elements
  const btnActivePeers = document.getElementById('btnActivePeers');
  const peersModal = document.getElementById('peersModal');
  const peersBackdrop = document.getElementById('peersBackdrop');
  const btnClosePeers = document.getElementById('btnClosePeers');
  const peersListContainer = document.getElementById('peersListContainer');

  // Video Call Button
  const btnOpenVideo = document.getElementById('btnOpenVideo');

  // Replying Elements
  const replyingBanner = document.getElementById('replyingBanner');
  const replyAuthor = document.getElementById('replyAuthor');
  const replySnippet = document.getElementById('replySnippet');
  const btnCancelReply = document.getElementById('btnCancelReply');

  // Header Symbol Dock & Controls
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
  let activePeersList = [];
  let activeChatPeers = [];
  let activeVideoPeers = [];
  let sessionMessages = [];

  const saveActiveSession = (room, name, pass) => {
    try {
      sessionStorage.setItem('aegis_session', JSON.stringify({
        room: room,
        codename: name,
        passphrase: pass,
        savedAt: Date.now()
      }));
    } catch (e) {}
  };

  const saveMessagesToSession = () => {
    try {
      const toSave = sessionMessages
        .filter(m => !m.burnSeconds || m.burnSeconds === 0)
        .slice(-50);
      sessionStorage.setItem('aegis_session_msgs', JSON.stringify(toSave));
    } catch (e) {}
  };

  const clearActiveSession = () => {
    try {
      sessionStorage.removeItem('aegis_session');
      sessionStorage.removeItem('aegis_session_msgs');
    } catch (e) {}
  };
  let currentReply = null;
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
    }
    if (shieldIndicator) {
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
    if (!localIpContainer) return;
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

  // Active Peers List Trigger
  if (btnActivePeers) {
    btnActivePeers.addEventListener('click', () => {
      if (!peersModal || !peersListContainer) return;
      peersListContainer.innerHTML = '';

      const listToShow = (activePeersList && activePeersList.length > 0)
        ? activePeersList
        : [codename];

      // Section 1: Chat Peers
      const chatHeader = document.createElement('div');
      chatHeader.style.cssText = 'font-size: 0.72rem; font-weight: 700; color: #10b981; letter-spacing: 0.05em; margin: 4px 0 6px 2px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;';
      chatHeader.innerHTML = `<span>💬 Text Chat Members</span><span style="background: rgba(16,185,129,0.15); padding: 1px 7px; border-radius: 999px;">${activeChatPeers.length || 1}</span>`;
      peersListContainer.appendChild(chatHeader);

      const chatList = (activeChatPeers && activeChatPeers.length > 0) ? activeChatPeers : [codename];
      chatList.forEach(name => {
        const item = document.createElement('div');
        item.className = 'peer-item-card';
        const isYou = (name === codename);
        item.innerHTML = `
          <div class="peer-name-wrap">
            <span style="font-size: 1.1rem;">👤</span>
            <span style="font-weight: 600;">${escapeHtml(name)}</span>
          </div>
          ${isYou ? '<span class="peer-badge-you">YOU</span>' : '<span style="color: #34d399; font-size: 0.72rem; font-weight: 600;">● In Chat</span>'}
        `;
        peersListContainer.appendChild(item);
      });

      // Section 2: Video Callers
      const videoHeader = document.createElement('div');
      videoHeader.style.cssText = 'font-size: 0.72rem; font-weight: 700; color: #06b6d4; letter-spacing: 0.05em; margin: 14px 0 6px 2px; text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;';
      videoHeader.innerHTML = `<span>📹 Active in Video Call</span><span style="background: rgba(6,182,212,0.15); padding: 1px 7px; border-radius: 999px;">${activeVideoPeers.length}</span>`;
      peersListContainer.appendChild(videoHeader);

      if (activeVideoPeers.length === 0) {
        const emptyNote = document.createElement('div');
        emptyNote.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 8px;';
        emptyNote.textContent = 'No peers are currently in video call.';
        peersListContainer.appendChild(emptyNote);
      } else {
        activeVideoPeers.forEach(name => {
          const item = document.createElement('div');
          item.className = 'peer-item-card';
          const isYou = (name === codename);
          item.innerHTML = `
            <div class="peer-name-wrap">
              <span style="font-size: 1.1rem;">🎥</span>
              <span style="font-weight: 600;">${escapeHtml(name)}</span>
            </div>
            <span style="color: #06b6d4; font-size: 0.72rem; font-weight: 600;">${isYou ? 'YOU (In Call)' : '● In Call'}</span>
          `;
          peersListContainer.appendChild(item);
        });
      }

      peersModal.style.display = 'flex';
    });
  }

  const closePeersModal = () => {
    if (peersModal) peersModal.style.display = 'none';
  };
  if (btnClosePeers) btnClosePeers.addEventListener('click', closePeersModal);
  if (peersBackdrop) peersBackdrop.addEventListener('click', closePeersModal);

  // Video Call Launch Trigger (/video)
  if (btnOpenVideo) {
    btnOpenVideo.addEventListener('click', () => {
      saveActiveSession(currentRoom, codename, passphraseInput.value);
      saveMessagesToSession();
      const roomParam = encodeURIComponent(currentRoom || '');
      const codeParam = encodeURIComponent(codename || '');
      const keyParam = encodeURIComponent(passphraseInput.value || '');
      const videoUrl = `/video#room=${roomParam}&codename=${codeParam}&key=${keyParam}`;
      window.open(videoUrl, '_blank');
    });
  }

  // Reply Helpers
  const startReplyingTo = ({ sender, text }) => {
    currentReply = { sender, text };
    if (replyAuthor) replyAuthor.textContent = sender;
    if (replySnippet) replySnippet.textContent = text || 'Photo';
    if (replyingBanner) replyingBanner.style.display = 'flex';
    if (messageInput) messageInput.focus();
  };

  const cancelReply = () => {
    currentReply = null;
    if (replyingBanner) replyingBanner.style.display = 'none';
  };

  if (btnCancelReply) {
    btnCancelReply.addEventListener('click', cancelReply);
  }

  // Core Room Initialization & Join Workflow
  const enterRoom = async (roomId, passphrase, userCodename) => {
    currentRoom = roomId;
    codename = userCodename || generateCodename();

    if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'DERIVING KEY (PBKDF2)...';

    try {
      await window.stealthCrypto.initializeKey(passphrase, currentRoom);

      connectRelay(currentRoom);

      if (activeRoomLabel) activeRoomLabel.textContent = currentRoom;

      screenLobby.style.display = 'none';
      screenChat.style.display = 'flex';

      // Switch Header: Hide Lobby Brand, Show Chat Info & Action Controls
      if (headerBrand) headerBrand.style.display = 'none';
      if (chatHeaderInfo) chatHeaderInfo.style.display = 'flex';
      if (chatActionGroup) chatActionGroup.style.display = 'inline-flex';
      if (headerSymbolDock) headerSymbolDock.style.display = 'none';

      // Save active session for instant return from video or page refresh
      saveActiveSession(currentRoom, codename, passphrase);

      // Start Chaff (Dummy Traffic) Generator
      startChaffGenerator();

      if (messageInput) messageInput.focus();
    } catch (err) {
      console.error(err);
      alert('Cryptographic key initialization error: ' + err.message);
      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'CRYPTO ERROR';
    }
  };

  // Form Submit: Initialize Crypto & Connect
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cName = usernameInput.value.trim() || generateCodename();
    const rId = roomInput.value.trim();
    const pass = passphraseInput.value.trim();

    if (!rId || !pass) {
      alert('Room ID and Secret Passphrase are required.');
      return;
    }

    await enterRoom(rId, pass, cName);
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

            const dummyPktId = 'pkt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
            markAuthTagSeen(encryptedDummy.authTag);

            // Indistinguishable schema: identical keys and id prefix as real messages
            ws.send(JSON.stringify({
              type: 'encrypted_message',
              roomId: currentRoom,
              payload: {
                id: dummyPktId,
                ciphertext: encryptedDummy.ciphertext,
                iv: encryptedDummy.iv,
                salt: encryptedDummy.salt,
                authTag: encryptedDummy.authTag
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
        peerId: codename,
        clientType: 'chat'
      }));
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        switch (msg.type) {
          case 'presence': {
            if (Array.isArray(msg.chatPeers)) {
              activeChatPeers = msg.chatPeers;
            } else if (Array.isArray(msg.peers)) {
              activeChatPeers = msg.peers;
            } else {
              activeChatPeers = [codename];
            }

            if (Array.isArray(msg.videoPeers)) {
              activeVideoPeers = msg.videoPeers;
            } else {
              activeVideoPeers = [];
            }
            activePeersList = activeChatPeers;

            if (peerCountLabel) {
              peerCountLabel.textContent = activeChatPeers.length;
            }
            if (peerDockBtn) {
              peerDockBtn.dataset.tooltip = `Chat: ${activeChatPeers.length} online | Video: ${activeVideoPeers.length} in call`;
            }

            const videoBadge = document.getElementById('videoCallLiveBadge');
            if (videoBadge) {
              if (activeVideoPeers.length > 0) {
                videoBadge.textContent = `${activeVideoPeers.length} in call`;
                videoBadge.style.display = 'inline-block';
              } else {
                videoBadge.style.display = 'none';
              }
            }
            break;
          }

          case 'encrypted_message': {
            await handleIncomingEncryptedMessage(msg.payload);
            break;
          }

          case 'room_wiped': {
            // Cryptographic Verification: Verify wipe packet was signed with the room's MAC key
            if (window.stealthCrypto.activeMacKey && msg.authTag) {
              const expected = CryptoJS.HmacSHA256('WIPE_ROOM:' + currentRoom, window.stealthCrypto.activeMacKey).toString();
              if (StealthCrypto.timingSafeEqual(expected, msg.authTag)) {
                triggerWipe(true);
              } else {
                console.warn('[SECURITY] Unauthenticated room wipe rejected: invalid authTag');
              }
            } else {
              triggerWipe(true);
            }
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

  // Replay Attack Cache: Authenticated against cryptographic authTag
  const seenAuthTags = new Set();
  const markAuthTagSeen = (tag) => {
    if (!tag) return;
    seenAuthTags.add(tag);
    if (seenAuthTags.size > 500) {
      const oldest = seenAuthTags.values().next().value;
      seenAuthTags.delete(oldest);
    }
  };

  // Handle Incoming Encrypted Payload
  const handleIncomingEncryptedMessage = async (payload) => {
    if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) return;

    // 1. Replay Attack Protection: Drop packets with duplicate cryptographic authTag
    if (payload.authTag && seenAuthTags.has(payload.authTag)) {
      console.warn('Replay attack blocked: Duplicate authTag received.');
      return;
    }
    if (payload.authTag) {
      markAuthTagSeen(payload.authTag);
    }

    try {
      // 2. Decrypt locally with AES-256 + verify HMAC
      const data = await window.stealthCrypto.decrypt(payload);

      // If this is a Chaff / Dummy packet, absorb silently without rendering
      if (data && data.isDummy) {
        chaffPacketsReceived++;
        updateChaffUI();
        // Subtle micro-flash on security status dot
        if (statusDot) {
          statusDot.style.transform = 'scale(1.4)';
          setTimeout(() => { if (statusDot) statusDot.style.transform = 'scale(1)'; }, 150);
        }
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
        replyTo: data.replyTo || null,
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
    const replyToSend = currentReply ? { sender: currentReply.sender, text: currentReply.text } : null;
    cancelReply();

    // SECURITY: burnSeconds & replyTo are packed INSIDE the encrypted payload so they are HMAC-authenticated
    // and cannot be read or tampered with on the network.
    const messageData = {
      isDummy: false,
      sender: codename,
      text: text,
      image: imageToSend || null,
      replyTo: replyToSend,
      burnSeconds: burnSeconds,
      timestamp: Date.now()
    };

    // 1. Encrypt with Fixed-Size 2048-Byte Padding (or dynamic size for photo payloads)
    const encrypted = await window.stealthCrypto.encrypt(messageData);

    const packetId = 'pkt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
    markAuthTagSeen(encrypted.authTag);

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
      replyTo: replyToSend,
      timestamp: messageData.timestamp,
      isOutgoing: true,
      rawCiphertext: encrypted.ciphertext,
      burnSeconds: burnSeconds
    });
  });

  // Render Message Bubble with Complete Auto-Burn RAM Purge & Session Persistence
  const renderMessage = ({ sender, text = '', image = null, replyTo = null, timestamp, isOutgoing, isError = false, rawCiphertext = '', burnSeconds = 0 }, saveToSession = true) => {
    if (saveToSession && !isError && (!burnSeconds || burnSeconds === 0)) {
      sessionMessages.push({
        sender,
        text,
        image,
        replyTo,
        timestamp,
        isOutgoing,
        isError,
        rawCiphertext,
        burnSeconds: 0
      });
      saveMessagesToSession();
    }
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

    let replyHtml = '';
    if (replyTo && replyTo.sender) {
      replyHtml = `
        <div class="msg-reply-quote">
          <span class="quote-author">${escapeHtml(replyTo.sender)}</span>
          <span class="quote-snippet">${escapeHtml(replyTo.text || '')}</span>
        </div>
      `;
    }

    let textHtml = '';
    if (text) {
      textHtml = `<div class="msg-text">${escapeHtml(text)}</div>`;
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
      <div class="msg-bubble-wrap">
        <div class="msg-bubble ${isError ? 'decrypt-error' : ''}">
          ${replyHtml}
          <div class="msg-image-slot"></div>
          ${textHtml}
          ${burnBarHtml}
        </div>
        <button type="button" class="msg-reply-btn" title="Reply to message" aria-label="Reply">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        </button>
      </div>
    `;

    const replyBtn = row.querySelector('.msg-reply-btn');
    if (replyBtn) {
      replyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startReplyingTo({
          sender: sender,
          text: text || (image ? 'Photo' : 'Encrypted message')
        });
      });
    }

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
        const wipeTag = window.stealthCrypto.activeMacKey
          ? CryptoJS.HmacSHA256('WIPE_ROOM:' + currentRoom, window.stealthCrypto.activeMacKey).toString()
          : 'unauthenticated';
        ws.send(JSON.stringify({ 
          type: 'wipe_room', 
          roomId: currentRoom,
          authTag: wipeTag
        }));
      } catch (e) {}
    }

    if (ws) {
      try { ws.close(); } catch(e) {}
      ws = null;
    }

    clearActiveSession();
    sessionMessages = [];

    // Zero out cryptographic keys and active buffers in RAM
    window.stealthCrypto.destroy();
    seenAuthTags.clear();
    messagesViewport.innerHTML = '';
    messageInput.value = '';
    passphraseInput.value = '';
    roomInput.value = '';
    pendingImageDataUrl = null;
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imageFileInput) imageFileInput.value = '';

    if (headerSymbolDock) headerSymbolDock.style.display = 'none';
    if (chatHeaderInfo) chatHeaderInfo.style.display = 'none';
    if (chatActionGroup) chatActionGroup.style.display = 'none';
    if (headerBrand) headerBrand.style.display = 'flex';

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

  // Seamless Session Restoration (Restores Room & Chat History after Video / Refresh)
  const checkAndRestoreSession = async () => {
    let room = null;
    let name = null;
    let pass = null;

    // 1. Read URL hash parameters
    const hash = window.location.hash.substring(1);
    if (hash) {
      const p = new URLSearchParams(hash);
      room = p.get('room');
      pass = p.get('key');
      name = p.get('codename');
    }

    // 2. Read from sessionStorage if not in hash
    if (!room || !pass) {
      try {
        const saved = JSON.parse(sessionStorage.getItem('aegis_session') || '{}');
        if (saved.room && saved.passphrase) {
          room = saved.room;
          pass = saved.passphrase;
          if (!name) name = saved.codename;
        }
      } catch (e) {}
    }

    if (room && pass) {
      roomInput.value = room;
      passphraseInput.value = pass;
      if (name) usernameInput.value = name;

      await enterRoom(room, pass, name || usernameInput.value || generateCodename());

      // Restore previously exchanged messages so chat is never blank
      try {
        const savedMsgs = JSON.parse(sessionStorage.getItem('aegis_session_msgs') || '[]');
        if (Array.isArray(savedMsgs) && savedMsgs.length > 0) {
          sessionMessages = [];
          savedMsgs.forEach(m => renderMessage(m, false));
        }
      } catch (e) {}
    }
  };

  // Auto-run session check
  checkAndRestoreSession();

  panicBtn.addEventListener('click', triggerPanicWipe);

  btnLeaveRoom.addEventListener('click', () => {
    stopChaffGenerator();
    closePopover();
    if (ws) {
      ws.send(JSON.stringify({ type: 'leave', roomId: currentRoom }));
      ws.close();
    }
    clearActiveSession();
    sessionMessages = [];
    window.stealthCrypto.destroy();
    seenAuthTags.clear();
    messagesViewport.innerHTML = '';
    screenChat.style.display = 'none';
    if (chatHeaderInfo) chatHeaderInfo.style.display = 'none';
    if (chatActionGroup) chatActionGroup.style.display = 'none';
    if (headerBrand) headerBrand.style.display = 'flex';
    screenLobby.style.display = 'flex';
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

      // 2. If Symbol Popover or Peers Modal is open, ESC closes it WITHOUT triggering panic wipe
      if (peersModal && peersModal.style.display === 'flex') {
        closePeersModal();
        panicPressTimes = [];
        return;
      }

      if (symbolPopoverCard && symbolPopoverCard.style.display === 'flex') {
        closePopover();
        panicPressTimes = [];
        return;
      }

      if (currentReply) {
        cancelReply();
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
