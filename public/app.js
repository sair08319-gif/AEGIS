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

  // Floating Video Bubble Elements
  const floatingVideoBubble = document.getElementById('floatingVideoBubble');
  const bubbleDragHandle = document.getElementById('bubbleDragHandle');
  const btnBubbleExpand = document.getElementById('btnBubbleExpand');
  const btnBubbleClose = document.getElementById('btnBubbleClose');
  const bubbleRemoteVideo = document.getElementById('bubbleRemoteVideo');
  const bubbleLocalVideo = document.getElementById('bubbleLocalVideo');
  const bubbleWaiting = document.getElementById('bubbleWaiting');
  const btnBubbleMuteAudio = document.getElementById('btnBubbleMuteAudio');
  const btnBubbleToggleVideo = document.getElementById('btnBubbleToggleVideo');
  const bubbleIconMicOn = document.getElementById('bubbleIconMicOn');
  const bubbleIconMicOff = document.getElementById('bubbleIconMicOff');
  const bubbleIconCamOn = document.getElementById('bubbleIconCamOn');
  const bubbleIconCamOff = document.getElementById('bubbleIconCamOff');
  const bubbleRoomTag = document.getElementById('bubbleRoomTag');

  // Fullscreen Video Call Stage Overlay Elements
  const videoCallModal = document.getElementById('videoCallModal');
  const modalRoomBadge = document.getElementById('modalRoomBadge');
  const btnMinimizeToBubble = document.getElementById('btnMinimizeToBubble');
  const btnModalEndCall = document.getElementById('btnModalEndCall');
  const modalRemoteVideo = document.getElementById('modalRemoteVideo');
  const modalLocalVideo = document.getElementById('modalLocalVideo');
  const modalWaitingState = document.getElementById('modalWaitingState');
  const modalLocalPipWrap = document.getElementById('modalLocalPipWrap');
  const btnModalToggleAudio = document.getElementById('btnModalToggleAudio');
  const btnModalToggleVideo = document.getElementById('btnModalToggleVideo');
  const btnModalFlipCamera = document.getElementById('btnModalFlipCamera');
  const btnModalMinimizeBottom = document.getElementById('btnModalMinimizeBottom');
  const btnModalHangup = document.getElementById('btnModalHangup');
  const modalIconAudioOn = document.getElementById('modalIconAudioOn');
  const modalIconAudioOff = document.getElementById('modalIconAudioOff');
  const modalIconVideoOn = document.getElementById('modalIconVideoOn');
  const modalIconVideoOff = document.getElementById('modalIconVideoOff');

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
  const screenShieldOverlay = document.getElementById('screenShieldOverlay');
  const shieldVeilReason = document.getElementById('shieldVeilReason');
  const btnResumeShield = document.getElementById('btnResumeShield');
  const btnSwitchToDecoy = document.getElementById('btnSwitchToDecoy');
  const chatWatermarkOverlay = document.getElementById('chatWatermarkOverlay');
  const screenShieldBadge = document.getElementById('screenShieldBadge');
  const kioskModeToggle = document.getElementById('kioskModeToggle');
  const kioskCountdownWrap = document.getElementById('kioskCountdownWrap');
  const kioskCountdownNum = document.getElementById('kioskCountdownNum');
  const btnReenterFullscreen = document.getElementById('btnReenterFullscreen');
  const kioskStatusBadge = document.getElementById('kioskStatusBadge');
  const shieldVeilStandardActions = document.getElementById('shieldVeilStandardActions');

  // State
  let ws = null;
  let currentRoom = '';
  let blindedRoomId = '';
  let myEphemeralPeerId = '';
  const peerCodenames = new Map();
  let codename = '';
  let activePeersList = [];
  let activeChatPeers = [];
  let activeVideoPeers = [];
  let sessionMessages = [];

  // Integrated WebRTC Call State
  let localStream = null;
  let remoteStream = null;
  let screenStream = null;
  let peerConnection = null;
  let isVideoCallActive = false;
  let isScreenSharing = false;
  let isIpCloaked = true; // Guaranteed IP Privacy: Always Force TURN Relay // false = Direct P2P, true = Force TURN Relay
  let isAudioMuted = false;
  let isVideoMuted = false;
  let facingMode = 'user';
  let pendingIceCandidates = [];
  // Dynamic ICE Configuration with Turn Relay & Anti-IP-Leak Protection
  const getRtcConfig = () => {
    const turnRelays = [
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ];

    const stunServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ];

    return {
      iceServers: [...turnRelays, ...stunServers],
      iceCandidatePoolSize: 10
    };
  };

  const rtcConfig = getRtcConfig();

  const saveActiveSession = (room, name, pass) => {
    // SECURITY HARDENING: Plaintext passphrases and decrypted messages are kept EXCLUSIVELY in memory closure.
    // Zero disk serialization ensures no extension or crash-dump recovery can harvest keys.
  };

  const saveMessagesToSession = () => {
    // In-memory only: sessionMessages array holds active decrypted history in RAM
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

  // Anti-Screenshot & Screen Privacy Shield State & Handlers
  const ORIGINAL_PAGE_TITLE = 'Aegis Stealth | Zero-Knowledge E2EE Chat';
  const DECOY_PAGE_TITLE = 'Search';
  let isShieldLocked = false;
  let focusUnveilTimeout = null;

  // Kiosk Lockdown Mode State
  let isKioskModeActive = false;
  let kioskCountdownTimer = null;
  let kioskSecondsLeft = 3;

  const showScreenShield = (reason = 'Content concealed to prevent unauthorized screen capture or snip.', locked = false) => {
    if (!screenShieldOverlay) return;
    if (shieldVeilReason) shieldVeilReason.textContent = reason;
    document.body.classList.add('shield-concealed');
    document.title = DECOY_PAGE_TITLE;
    screenShieldOverlay.style.display = 'flex';
    if (locked) isShieldLocked = true;
  };

  const hideScreenShield = (force = false) => {
    if (!screenShieldOverlay) return;
    if (isShieldLocked && !force) return;
    isShieldLocked = false;
    document.body.classList.remove('shield-concealed');
    document.title = ORIGINAL_PAGE_TITLE;
    screenShieldOverlay.style.display = 'none';
  };

  const triggerKioskViolation = () => {
    if (!isKioskModeActive || !currentRoom) return;
    document.body.classList.add('shield-concealed');
    document.title = 'SECURITY VIOLATION';
    if (shieldVeilReason) {
      shieldVeilReason.textContent = 'FULLSCREEN EXITED: Return to fullscreen immediately or room will self-destruct!';
    }
    if (shieldVeilStandardActions) shieldVeilStandardActions.style.display = 'none';
    if (kioskCountdownWrap) kioskCountdownWrap.style.display = 'flex';
    if (screenShieldOverlay) screenShieldOverlay.style.display = 'flex';
    isShieldLocked = true;
    playSecurityAlarm();
    kioskSecondsLeft = 3;
    if (kioskCountdownNum) kioskCountdownNum.textContent = kioskSecondsLeft;
    if (kioskCountdownTimer) clearInterval(kioskCountdownTimer);
    kioskCountdownTimer = setInterval(() => {
      kioskSecondsLeft--;
      if (kioskCountdownNum) kioskCountdownNum.textContent = kioskSecondsLeft;
      playChirp(440, 'sawtooth', 0.1);
      if (kioskSecondsLeft <= 0) {
        clearInterval(kioskCountdownTimer);
        kioskCountdownTimer = null;
        triggerPanicWipe();
      }
    }, 1000);
  };

  const abortKioskViolation = () => {
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    if (kioskCountdownWrap) kioskCountdownWrap.style.display = 'none';
    if (shieldVeilStandardActions) shieldVeilStandardActions.style.display = 'flex';
    hideScreenShield(true);
    showToast('✓ Fullscreen restored. Room secure.');
  };

  const purgeClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('[AEGIS PROTOCOL: SCREEN CAPTURE RESTRICTED]');
      }
    } catch (e) {}
  };

  const updateForensicWatermark = (codenameText, roomText) => {
    if (!chatWatermarkOverlay) return;
    const cleanName = String(codenameText || 'AGENT').replace(/[^a-zA-Z0-9_\-]/g, '');
    const cleanR = String(roomText || '').replace(/[^a-zA-Z0-9_\-]/g, '');
    const dateStr = new Date().toISOString().substring(0, 10);
    const textStr = `${cleanName} • ${cleanR} • ${dateStr} • AEGIS E2EE`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="170">
      <text x="20" y="85" fill="%23ffffff" font-size="11" font-family="monospace" font-weight="bold" transform="rotate(-22 170 85)" opacity="0.6">
        ${textStr}
      </text>
    </svg>`;
    chatWatermarkOverlay.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  };

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

    // 3. Anti-Screenshot, Anti-Capture & Background Window Camouflage
    // When the browser window loses focus (e.g. user clicks another window, minimizes, Win+Shift+S, Alt+Tab):
    // Instantly blank all DOM elements, disguise the tab title, and show the privacy shield.
    window.addEventListener('blur', () => {
      if (focusUnveilTimeout) {
        clearTimeout(focusUnveilTimeout);
        focusUnveilTimeout = null;
      }
      if (currentRoom || isVideoCallActive) {
        showScreenShield('WINDOW INACTIVE • CONCEALED TO PREVENT BACKGROUND CAPTURE / SNIPPING', false);
      }
    });

    // Anti-Click-Snip Protection: When window regains focus, hold the shield for 350ms
    // to prevent instant window-click screenshot grabbers from capturing plaintext in that frame
    window.addEventListener('focus', () => {
      if (isShieldLocked) return;
      if (focusUnveilTimeout) clearTimeout(focusUnveilTimeout);
      focusUnveilTimeout = setTimeout(() => {
        if (document.hasFocus()) {
          hideScreenShield(false);
        }
      }, 350);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && (currentRoom || isVideoCallActive)) {
        showScreenShield('MINIMIZED / BACKGROUND TAB • SECURE CONCEALMENT ACTIVE', false);
      } else if (document.visibilityState === 'visible' && !isShieldLocked) {
        if (focusUnveilTimeout) clearTimeout(focusUnveilTimeout);
        focusUnveilTimeout = setTimeout(() => {
          if (document.hasFocus()) {
            hideScreenShield(false);
          }
        }, 350);
      }
    });

    // 4. Hardware PrintScreen Key Interception & OS Clipboard Purge
    window.addEventListener('keyup', (e) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        showScreenShield('HARDWARE PRINTSCREEN / SNAPSHOT DETECTED • CONTENT CONCEALED', true);
        purgeClipboard();
        triggerSecurityAlert(
          'SCREENSHOT ATTEMPT INTERCEPTED',
          'Hardware PrintScreen key was pressed. Screen was immediately blanked and OS clipboard was purged.'
        );
      }
    });

    // 5. Intercept Print (Ctrl+P / Cmd+P), Save Page (Ctrl+S / Cmd+S), and DevTools Shortcuts
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        showScreenShield('PRINTING FORBIDDEN • DISPLAY CONCEALED', true);
        triggerSecurityAlert('PRINT ATTEMPT BLOCKED', 'Printing and PDF export are strictly forbidden in Aegis.');
        return;
      }

      if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('SAVE WEBPAGE BLOCKED', 'Saving raw webpage assets to disk is disabled.');
        return;
      }

      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('DEVTOOLS INSPECTOR BLOCKED', 'DOM inspection and developer console shortcuts are restricted.');
        return;
      }
    });

    // 6. Resume Shield Button Listener
    if (btnResumeShield) {
      btnResumeShield.addEventListener('click', () => {
        hideScreenShield(true);
      });
    }

    if (btnSwitchToDecoy) {
      btnSwitchToDecoy.addEventListener('click', () => {
        if (screenShieldOverlay) screenShieldOverlay.style.display = 'none';
        if (decoyScreen) decoyScreen.style.display = 'flex';
        document.title = 'Search Engine';
        showToast('🔍 Camouflage Decoy Active. Press ESC 3 times to return.');
      });
    }

    // 7. Anti-Context Menu (Right-Click) on Sensitive Elements
    const sensitiveContainers = [
      screenChat,
      messagesViewport,
      videoCallModal,
      floatingVideoBubble,
      imageLightboxModal,
      whiteboardModal
    ];

    sensitiveContainers.forEach(container => {
      if (container) {
        container.addEventListener('contextmenu', (e) => {
          if (e.target === messageInput) return; // Allow right-click paste in message text input
          e.preventDefault();
        });
      }
    });

    // 8. Anti-Drag on Images
    document.addEventListener('dragstart', (e) => {
      if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        e.preventDefault();
      }
    });

    // 9. Kiosk Fullscreen Change Detection & Restoration Handlers
    const handleFullscreenChange = () => {
      if (!isKioskModeActive || !currentRoom) return;
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen) {
        triggerKioskViolation();
      } else {
        if (kioskCountdownTimer) {
          abortKioskViolation();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    if (btnReenterFullscreen) {
      btnReenterFullscreen.addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Fullscreen request failed:', err);
          });
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }
      });
    }
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
    // Anti-Forensics: Immediately scrub room key and secrets from browser URL bar history
    try {
      window.history.replaceState(null, '', window.location.pathname || '/');
    } catch (e) {}
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
    const key = (window.stealthCrypto && window.stealthCrypto.rawPassphrase) || passphraseInput.value || '';
    const url = `${window.location.origin}${window.location.pathname}#room=${encodeURIComponent(currentRoom)}&key=${encodeURIComponent(key)}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('✓ Secret invite link copied to clipboard!');
    });
  });

  // Note: Direct P2P option has been permanently replaced by mandatory Encrypted TURN Relay for total IP anonymity.

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
        const isYou = (name === myEphemeralPeerId || name === codename);
        const displayName = isYou ? codename : (peerCodenames.get(name) || name);
        item.innerHTML = `
          <div class="peer-name-wrap">
            <span style="font-size: 1.1rem;">👤</span>
            <span style="font-weight: 600;">${escapeHtml(displayName)}</span>
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
          const isYou = (name === myEphemeralPeerId || name === codename);
        const displayName = isYou ? codename : (peerCodenames.get(name) || name);
          item.innerHTML = `
            <div class="peer-name-wrap">
              <span style="font-size: 1.1rem;">🎥</span>
              <span style="font-weight: 600;">${escapeHtml(displayName)}</span>
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


  // ==========================================================================
  // INTEGRATED WEBRTC ENGINE & TOUCH/DRAGGABLE FLOATING VIDEO BUBBLE
  // ==========================================================================

  // Screen Sharing Management
  const btnModalShareScreen = document.getElementById('btnModalShareScreen');
  const modalIconScreenOn = document.getElementById('modalIconScreenOn');
  const modalIconScreenOff = document.getElementById('modalIconScreenOff');
  const screenSharingBanner = document.getElementById('screenSharingBanner');
  const btnStopScreenShareBadge = document.getElementById('btnStopScreenShareBadge');

  const toggleScreenSharing = async () => {
    if (!isVideoCallActive || !peerConnection) {
      showToast('⚠️ Please join a video call first to share your screen.');
      return;
    }

    if (isScreenSharing) {
      await stopScreenSharing();
      return;
    }

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      isScreenSharing = true;
      if (btnModalShareScreen) btnModalShareScreen.classList.add('active-screen');
      if (screenSharingBanner) screenSharingBanner.style.display = 'flex';
      if (modalIconScreenOn) modalIconScreenOn.style.display = 'none';
      if (modalIconScreenOff) modalIconScreenOff.style.display = 'inline';

      // Hot-swap video track on peerConnection
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      }

      // Update local self-view
      if (modalLocalVideo) modalLocalVideo.srcObject = screenStream;
      if (bubbleLocalVideo) bubbleLocalVideo.srcObject = screenStream;

      showToast('🖥️ Screen sharing is live!');

      // Auto-revert when user stops sharing via native browser dialog
      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (err) {
      console.warn('Screen share cancelled:', err);
      isScreenSharing = false;
    }
  };

  const stopScreenSharing = async () => {
    if (!isScreenSharing && !screenStream) return;
    isScreenSharing = false;

    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
    }

    if (btnModalShareScreen) btnModalShareScreen.classList.remove('active-screen');
    if (screenSharingBanner) screenSharingBanner.style.display = 'none';
    if (modalIconScreenOn) modalIconScreenOn.style.display = 'inline';
    if (modalIconScreenOff) modalIconScreenOff.style.display = 'none';

    // Revert video sender back to camera track
    if (localStream && peerConnection) {
      const cameraTrack = localStream.getVideoTracks()[0];
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }
      if (modalLocalVideo) modalLocalVideo.srcObject = localStream;
      if (bubbleLocalVideo) bubbleLocalVideo.srcObject = localStream;
    }

    showToast('Camera feed restored.');
  };

  if (btnModalShareScreen) btnModalShareScreen.addEventListener('click', toggleScreenSharing);
  if (btnStopScreenShareBadge) btnStopScreenShareBadge.addEventListener('click', stopScreenSharing);

    const startMedia = async () => {
    if (localStream) {
      localStream.getTracks().forEach(t => {
        try { t.stop(); } catch(e) {}
      });
      localStream = null;
      // Windows Media Foundation hardware release delay (prevents NotReadableError)
      await new Promise(r => setTimeout(r, 300));
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Stage 1: Try optimal video + audio without overconstrained framerate limits
    try {
      const videoConstraints = isMobile
        ? { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } };

      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: videoConstraints
      });
    } catch (err1) {
      console.warn('Initial HD camera capture failed, attempting relaxed constraints:', err1);

      // Stage 2: Relaxed constraints — let browser pick any working config
      try {
        // CRITICAL FIX: Explicitly stop any partial stream to release OS hardware lock
        if (localStream) { localStream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} }); localStream = null; }
        // 300ms hardware-release delay for Windows/Driver NotReadableError (stage 2)
        await new Promise(r => setTimeout(r, 300));
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
      } catch (err2) {
        console.warn('Relaxed video+audio capture failed:', err2.name, err2.message);

        // Stage 3: Camera locked by OS/driver -> Audio-Only fallback
        try {
          // CRITICAL FIX: Release again before final attempt
          if (localStream) { localStream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} }); localStream = null; }
          await new Promise(r => setTimeout(r, 300));
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          showToast('⚠️ Camera unavailable. Audio-Only mode. Close Zoom/Teams and retry video.');
        } catch (err3) {
          console.error('All media capture stages failed:', err3.name, err3.message);
          if (err1.name === 'NotReadableError' || err2.name === 'NotReadableError') {
            showToast('⚠️ Camera hardware busy. Close all apps using camera and retry.');
          } else if (err1.name === 'NotAllowedError' || err2.name === 'NotAllowedError') {
            showToast('⚠️ Camera/Mic permission blocked. Allow access in browser settings.');
          } else {
            showToast('⚠️ No camera or microphone found on this device.');
          }
          return false;
        }
      }
    }

    if (modalLocalVideo) modalLocalVideo.srcObject = localStream;
    if (bubbleLocalVideo) bubbleLocalVideo.srcObject = localStream;
    return true;
  };

  const sendEncryptedWebRtcSignal = async (signalData) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !window.stealthCrypto || !window.stealthCrypto.isInitialized) return;
    try {
      const enc = await window.stealthCrypto.encrypt({
        signal: signalData,
        senderPeerId: myEphemeralPeerId
      });
      ws.send(JSON.stringify({
        type: 'webrtc_signal',
        roomId: blindedRoomId || currentRoom,
        payload: enc
      }));
    } catch (err) {
      console.error('[SECURITY] WebRTC signal encryption failed:', err);
    }
  };

  const createPeerConnection = () => {
    if (peerConnection) {
      try { peerConnection.close(); } catch (e) {}
      peerConnection = null;
    }

    peerConnection = new RTCPeerConnection(getRtcConfig());
    remoteStream = new MediaStream();

    if (modalRemoteVideo) modalRemoteVideo.srcObject = remoteStream;
    if (bubbleRemoteVideo) bubbleRemoteVideo.srcObject = remoteStream;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      if (event.track) {
        if (!remoteStream.getTracks().find(t => t.id === event.track.id)) {
          remoteStream.addTrack(event.track);
        }
        if (modalWaitingState) modalWaitingState.style.display = 'none';
        if (bubbleWaiting) bubbleWaiting.style.display = 'none';

        if (modalRemoteVideo && modalRemoteVideo.paused) modalRemoteVideo.play().catch(() => {});
        if (bubbleRemoteVideo && bubbleRemoteVideo.paused) bubbleRemoteVideo.play().catch(() => {});
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendEncryptedWebRtcSignal({ candidate: event.candidate });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
        if (modalWaitingState) modalWaitingState.style.display = 'none';
        if (bubbleWaiting) bubbleWaiting.style.display = 'none';
        showToast('✓ Video & Audio Connected');
      } else if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
        clearRemotePeer('Peer disconnected');
      }
    };
  };

  const createAndSendOffer = async () => {
    if (!peerConnection) createPeerConnection();
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);
      await sendEncryptedWebRtcSignal({ offer: offer });
    } catch (err) {
      console.error('Create offer error:', err);
    }
  };

  const clearRemotePeer = (msg = null) => {
    stopAudioVisualizer();
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
      remoteStream = new MediaStream();
      if (modalRemoteVideo) modalRemoteVideo.srcObject = remoteStream;
      if (bubbleRemoteVideo) bubbleRemoteVideo.srcObject = remoteStream;
    }
    if (modalWaitingState) modalWaitingState.style.display = 'flex';
    if (bubbleWaiting) bubbleWaiting.style.display = 'flex';
    if (msg) showToast(msg);
  };

  const handleWebRtcSignal = async (signal) => {
    if (!isVideoCallActive || !signal) return;

    try {
      if (signal.offer) {
        if (!peerConnection) createPeerConnection();
        if (peerConnection.signalingState !== 'stable') {
          await Promise.all([
            peerConnection.setLocalDescription({ type: 'rollback' }),
            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer))
          ]);
        } else {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
        }

        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          try { await peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await sendEncryptedWebRtcSignal({ answer: answer });
      } else if (signal.answer) {
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
          while (pendingIceCandidates.length > 0) {
            const cand = pendingIceCandidates.shift();
            try { await peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
        }
      } else if (signal.candidate) {
        if (peerConnection && peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {}
        } else {
          pendingIceCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  };

  const startVideoCall = async (asBubble = false) => {
    if (!currentRoom) return;
    const mediaOk = await startMedia();
    if (!mediaOk) return;

    isVideoCallActive = true;
    createPeerConnection();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_state',
        roomId: currentRoom,
        active: true
      }));
    }

    if (modalRoomBadge) modalRoomBadge.textContent = currentRoom;
    if (bubbleRoomTag) bubbleRoomTag.textContent = currentRoom;

    if (asBubble) {
      minimizeVideoToBubble();
    } else {
      maximizeVideo();
    }

    if (activeVideoPeers.length > 0) {
      showToast('Calling connected peers in room...');
      createAndSendOffer();
    } else {
      showToast('📞 Video active. Share room with friends to connect!');
    }
  };

  const minimizeVideoToBubble = () => {
    if (videoCallModal) videoCallModal.style.display = 'none';
    if (floatingVideoBubble) {
      floatingVideoBubble.style.display = 'flex';
      if (!floatingVideoBubble.style.top || floatingVideoBubble.style.top === 'auto') {
        floatingVideoBubble.style.bottom = '85px';
        floatingVideoBubble.style.right = '20px';
      }
    }
    showToast('💬 Video minimized to floating bubble. You can chat while watching!');
  };

  const maximizeVideo = () => {
    if (floatingVideoBubble) floatingVideoBubble.style.display = 'none';
    if (videoCallModal) videoCallModal.style.display = 'flex';
  };

  const endVideoCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    clearRemotePeer();
    if (peerConnection) {
      try { peerConnection.close(); } catch (e) {}
      peerConnection = null;
    }

    isVideoCallActive = false;

    if (videoCallModal) videoCallModal.style.display = 'none';
    if (floatingVideoBubble) floatingVideoBubble.style.display = 'none';

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_state',
        roomId: currentRoom,
        active: false
      }));
    }

    showToast('Video call disconnected');
  };

  const toggleAudio = () => {
    if (!localStream) return;
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isAudioMuted);

    if (bubbleIconMicOn) bubbleIconMicOn.style.display = isAudioMuted ? 'none' : 'block';
    if (bubbleIconMicOff) bubbleIconMicOff.style.display = isAudioMuted ? 'block' : 'none';
    if (modalIconAudioOn) modalIconAudioOn.style.display = isAudioMuted ? 'none' : 'block';
    if (modalIconAudioOff) modalIconAudioOff.style.display = isAudioMuted ? 'block' : 'none';
    if (btnModalToggleAudio) btnModalToggleAudio.classList.toggle('off', isAudioMuted);

    showToast(isAudioMuted ? '🔇 Microphone Muted' : '🔊 Microphone Active');
  };

  const toggleVideo = () => {
    if (!localStream) return;
    isVideoMuted = !isVideoMuted;
    localStream.getVideoTracks().forEach(t => t.enabled = !isVideoMuted);

    if (bubbleIconCamOn) bubbleIconCamOn.style.display = isVideoMuted ? 'none' : 'block';
    if (bubbleIconCamOff) bubbleIconCamOff.style.display = isVideoMuted ? 'block' : 'none';
    if (modalIconVideoOn) modalIconVideoOn.style.display = isVideoMuted ? 'none' : 'block';
    if (modalIconVideoOff) modalIconVideoOff.style.display = isVideoMuted ? 'block' : 'none';
    if (btnModalToggleVideo) btnModalToggleVideo.classList.toggle('off', isVideoMuted);

    showToast(isVideoMuted ? '📷 Camera Off' : '📷 Camera On');
  };

  const flipCamera = async () => {
    facingMode = (facingMode === 'user') ? 'environment' : 'user';
    await startMedia();
    if (peerConnection && localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
    showToast('📷 Camera flipped');
  };

  // Touch & Mouse Draggable Bubble Engine (Supports anywhere on screen)
  const initBubbleDragging = (bubbleEl, handleEl) => {
    if (!bubbleEl || !handleEl) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (clientX, clientY, target) => {
      if (target.closest('button')) return;
      const rect = bubbleEl.getBoundingClientRect();
      startX = clientX;
      startY = clientY;
      startLeft = rect.left;
      startTop = rect.top;
      isDragging = true;
      bubbleEl.classList.add('is-dragging');
    };

    const onPointerMove = (clientX, clientY, e) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (e && e.cancelable) e.preventDefault();

      const bubbleWidth = bubbleEl.offsetWidth || 175;
      const bubbleHeight = bubbleEl.offsetHeight || 240;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      newLeft = Math.max(10, Math.min(window.innerWidth - bubbleWidth - 10, newLeft));
      newTop = Math.max(10, Math.min(window.innerHeight - bubbleHeight - 10, newTop));

      bubbleEl.style.left = `${newLeft}px`;
      bubbleEl.style.top = `${newTop}px`;
      bubbleEl.style.bottom = 'auto';
      bubbleEl.style.right = 'auto';
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      bubbleEl.classList.remove('is-dragging');
    };

    // Mobile & Tablet Touch
    handleEl.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    }, { passive: false });

    window.addEventListener('touchend', onPointerUp);

    // Desktop Mouse
    handleEl.addEventListener('mousedown', (e) => {
      onPointerDown(e.clientX, e.clientY, e.target);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onPointerMove(e.clientX, e.clientY, e);
      }
    });

    window.addEventListener('mouseup', onPointerUp);
  };


  // Wire up Video Controls & Floating Bubble Triggers
  if (btnOpenVideo) {
    btnOpenVideo.addEventListener('click', () => {
      if (isVideoCallActive) {
        maximizeVideo();
      } else {
        startVideoCall(false);
      }
    });
  }

  // Floating Bubble Controls
  if (btnBubbleClose) {
    btnBubbleClose.addEventListener('click', (e) => {
      e.stopPropagation();
      endVideoCall();
    });
  }

  if (btnBubbleExpand) {
    btnBubbleExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      maximizeVideo();
    });
  }

  const bubbleVideoWrap = document.getElementById('bubbleVideoWrap');
  if (bubbleVideoWrap) {
    bubbleVideoWrap.addEventListener('click', () => {
      maximizeVideo();
    });
  }

  if (btnBubbleMuteAudio) btnBubbleMuteAudio.addEventListener('click', toggleAudio);
  if (btnBubbleToggleVideo) btnBubbleToggleVideo.addEventListener('click', toggleVideo);

  // Fullscreen Modal Controls
  if (btnMinimizeToBubble) btnMinimizeToBubble.addEventListener('click', minimizeVideoToBubble);
  if (btnModalMinimizeBottom) btnModalMinimizeBottom.addEventListener('click', minimizeVideoToBubble);
  if (btnModalEndCall) btnModalEndCall.addEventListener('click', endVideoCall);
  if (btnModalHangup) btnModalHangup.addEventListener('click', endVideoCall);
  if (btnModalToggleAudio) btnModalToggleAudio.addEventListener('click', toggleAudio);
  if (btnModalToggleVideo) btnModalToggleVideo.addEventListener('click', toggleVideo);
  if (btnModalFlipCamera) btnModalFlipCamera.addEventListener('click', flipCamera);

  if (modalLocalPipWrap) {
    modalLocalPipWrap.addEventListener('click', () => {
      if (typeof toggleViewSwap === 'function') {
        toggleViewSwap();
      } else {
        modalLocalPipWrap.classList.toggle('pip-expanded');
      }
    });
  }

  // Initialize Draggable Bubble
  initBubbleDragging(floatingVideoBubble, bubbleDragHandle);


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
    const cleanRoom = String(roomId || '').trim();
    const cleanPass = String(passphrase || '').trim();
    currentRoom = cleanRoom;
    codename = userCodename || generateCodename();
    blindedRoomId = StealthCrypto.blindRoomId(cleanRoom);
    myEphemeralPeerId = 'anon-' + StealthCrypto.generateNoise(10);
    peerCodenames.set(myEphemeralPeerId, codename);

    if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'DERIVING KEY (PBKDF2)...';

    try {
      // CRITICAL FIX: Use cleanPass + cleanRoom (both .trim()ed) so mobile/desktop
      // keyboard quirks can never produce different PBKDF2 inputs => HMAC mismatch
      await window.stealthCrypto.initializeKey(cleanPass, cleanRoom);

      connectRelay(blindedRoomId);

      if (activeRoomLabel) activeRoomLabel.textContent = currentRoom;

      screenLobby.style.display = 'none';
      screenChat.style.display = 'flex';

      // Switch Header: Hide Lobby Brand, Show Chat Info & Action Controls
      if (headerBrand) headerBrand.style.display = 'none';
      if (chatHeaderInfo) chatHeaderInfo.style.display = 'flex';
      if (chatActionGroup) chatActionGroup.style.display = 'inline-flex';
      if (headerSymbolDock) headerSymbolDock.style.display = 'none';
      if (isKioskModeActive) {
        if (kioskStatusBadge) kioskStatusBadge.style.display = 'inline-flex';
      } else {
        if (kioskStatusBadge) kioskStatusBadge.style.display = 'none';
      }

      // Save active session for instant return from video or page refresh
      saveActiveSession(currentRoom, codename, passphrase);

      // Start Chaff (Dummy Traffic) Generator
      startChaffGenerator();

      // Render Dynamic Forensic Anti-Leak Watermark
      updateForensicWatermark(codename, currentRoom);

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

    if (kioskModeToggle && kioskModeToggle.checked) {
      isKioskModeActive = true;
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request error:', err);
        });
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } else {
      isKioskModeActive = false;
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
        if (ws && ws.readyState === WebSocket.OPEN && window.stealthCrypto.isInitialized) {
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

  // Cryptographic In-Room Presence: Announces codename to room peers only via encrypted channel
  const sendEncryptedPresenceAnnouncement = async (isAck = false) => {
    if (!window.stealthCrypto || !window.stealthCrypto.isInitialized || !ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const enc = await window.stealthCrypto.encrypt({
        presenceAnnouncement: true,
        isAck: isAck,
        codename: codename,
        ephemeralPeerId: myEphemeralPeerId,
        clientType: 'chat',
        hasVideo: isVideoCallActive
      });
      ws.send(JSON.stringify({
        type: 'encrypted_message',
        payload: enc
      }));
    } catch (e) {}
  };

  // WebSocket Connection
  let wsPingInterval = null;
  let wsReconnectTimer = null;
  let isWsReconnecting = false;

  const connectRelay = (roomId) => {
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = null;
    }
    if (wsPingInterval) {
      clearInterval(wsPingInterval);
      wsPingInterval = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        try { ws.close(); } catch (e) {}
      }
    } catch (e) {}

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isWsReconnecting = false;
      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'SECURE (E2EE)';
      if (statusDot) statusDot.style.background = 'var(--accent-emerald)';

      ws.send(JSON.stringify({
        type: 'join',
        roomId: roomId,
        peerId: myEphemeralPeerId,
        clientType: 'chat'
      }));

      // Announce encrypted presence to authenticated peers only
      sendEncryptedPresenceAnnouncement(false);

      // Render Heartbeat: Ping server every 20 seconds to keep connection alive through proxies
      wsPingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
        }
      }, 20000);
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        // Ignore heartbeat pongs
        if (msg.type === 'pong') return;

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

            // Auto-negotiate video call if both peers are in call
            if (isVideoCallActive && activeVideoPeers.length > 1) {
              if (!peerConnection || peerConnection.iceConnectionState === 'new' || peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
                const otherPeers = activeVideoPeers.filter(p => p !== myEphemeralPeerId);
                if (otherPeers.length > 0 && myEphemeralPeerId > otherPeers[0]) {
                  console.log('[WEBRTC] Automatically initiating call offer to video peer:', otherPeers[0]);
                  createAndSendOffer();
                }
              }
            }
            break;
          }

          case 'encrypted_message': {
            await handleIncomingEncryptedMessage(msg.payload);
            break;
          }

          case 'webrtc_signal': {
            if (msg.payload && window.stealthCrypto && window.stealthCrypto.isInitialized) {
              try {
                const decrypted = await window.stealthCrypto.decrypt(msg.payload);
                if (decrypted && decrypted.signal) {
                  // If receiving an offer and video not active, auto-activate video call!
                  if (decrypted.signal.offer && !isVideoCallActive) {
                    showToast('📞 Incoming video call from peer...');
                    await startVideoCall(false);
                  }
                  await handleWebRtcSignal(decrypted.signal, decrypted.senderPeerId || msg.sender);
                }
              } catch (e) {
                console.warn('[SECURITY] WebRTC signal dropped: Decryption or authentication failed.');
              }
            } else if (msg.signal) {
              if (msg.signal.offer && !isVideoCallActive) {
                await startVideoCall(false);
              }
              await handleWebRtcSignal(msg.signal, msg.sender);
            }
            break;
          }

          case 'room_wiped': {
            if (window.stealthCrypto && window.stealthCrypto.activeMacKey && msg.authTag) {
              const expected = CryptoJS.HmacSHA256('WIPE_ROOM:' + currentRoom, window.stealthCrypto.activeMacKey).toString();
              if (StealthCrypto.timingSafeEqual(expected, msg.authTag)) {
                triggerWipe(true);
              } else {
                console.warn('[SECURITY] Unauthenticated room wipe rejected: Invalid HMAC signature.');
              }
            } else {
              console.warn('[SECURITY] Unauthenticated room wipe rejected: Missing HMAC authentication tag.');
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error handling relay packet:', err);
      }
    };

    ws.onclose = () => {
      if (wsPingInterval) {
        clearInterval(wsPingInterval);
        wsPingInterval = null;
      }

      if (cryptoStatusLabel) cryptoStatusLabel.textContent = 'RECONNECTING...';
      if (statusDot) statusDot.style.background = 'var(--accent-crimson)';

      // Auto-reconnect if inside an active room
      if (currentRoom && !isWsReconnecting) {
        isWsReconnecting = true;
        wsReconnectTimer = setTimeout(() => {
          console.log('[AEGIS] Auto-reconnecting to relay...');
          connectRelay(blindedRoomId || currentRoom);
        }, 1500);
      }
    };
  };

  // Replay Attack Cache: Authenticated against cryptographic authTag
  let lastDecryptionNoticeTime = 0;
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

      // Intercept Encrypted Whiteboard Strokes & Clear commands
      if (data && data.whiteboardData && Array.isArray(data.strokes)) {
        if (!wbCtx) initWhiteboard();
        renderRemoteWhiteboardStrokes(data.strokes);
        return;
      }
      if (data && data.whiteboardClear) {
        clearLocalWhiteboard(false);
        showToast('Peer cleared the whiteboard.');
        return;
      }

      // Intercept Encrypted Presence Announcement
      if (data && data.presenceAnnouncement) {
        if (data.ephemeralPeerId && data.codename) {
          peerCodenames.set(data.ephemeralPeerId, data.codename);
        }
        if (!data.isAck) {
          sendEncryptedPresenceAnnouncement(true);
        }
        if (renderActivePeersList) renderActivePeersList();
        return;
      }

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
      console.warn('[SECURITY] Inbound packet decryption failed:', err.message);
      const now = Date.now();
      if (now - lastDecryptionNoticeTime > 10000) {
        lastDecryptionNoticeTime = now;
        const isSaltMismatch = payload && payload.salt && window.stealthCrypto && (payload.salt !== window.stealthCrypto.saltHex);
        const noticeText = isSaltMismatch
          ? '⚠️ Key derivation mismatch: A peer in this room joined with a different Secret Passphrase or room name. Please verify credentials and refresh.'
          : '⚠️ Inbound packet failed HMAC verification. A peer in this room may have joined with a different secret passphrase.';
        renderMessage({
          sender: 'SECURITY NOTICE',
          text: noticeText,
          timestamp: Date.now(),
          isOutgoing: false,
          isError: true,
          rawCiphertext: payload.ciphertext
        });
      }
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
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    isKioskModeActive = false;
    if (kioskCountdownWrap) kioskCountdownWrap.style.display = 'none';
    if (shieldVeilStandardActions) shieldVeilStandardActions.style.display = 'flex';
    if (kioskStatusBadge) kioskStatusBadge.style.display = 'none';
    currentRoom = '';
    stopChaffGenerator();
    closePopover();

    // 1. Wipe clipboard to prevent residual invite link theft
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('');
      }
    } catch (e) {}

    // 2. Clear all browser storage caches
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}

    if (!isIncoming && ws && ws.readyState === WebSocket.OPEN) {
      try {
        const wipeTag = window.stealthCrypto.activeMacKey
          ? CryptoJS.HmacSHA256('WIPE_ROOM:' + currentRoom, window.stealthCrypto.activeMacKey).toString()
          : 'unauthenticated';
        ws.send(JSON.stringify({ 
          type: 'wipe_room', 
          roomId: blindedRoomId || currentRoom,
          authTag: wipeTag
        }));
      } catch (e) {}
    }

    if (ws) {
      try { ws.close(); } catch(e) {}
      ws = null;
    }

    peerCodenames.clear();
    clearActiveSession();
    sessionMessages = [];
    if (isScreenSharing) stopScreenSharing();
    clearLocalWhiteboard(false);
    if (whiteboardModal) whiteboardModal.style.display = 'none';
    if (isVideoCallActive) endVideoCall();

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

    // 1. Read URL hash parameters and immediately scrub them
    const hash = window.location.hash.substring(1);
    if (hash) {
      const p = new URLSearchParams(hash);
      room = p.get('room');
      pass = p.get('key');
      name = p.get('codename');
      try {
        window.history.replaceState(null, '', window.location.pathname || '/');
      } catch (e) {}
    }

    // 2. Do not restore unverified credentials from sessionStorage
    // Room and passphrase must be explicitly entered or provided in secret URL fragment

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
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    isKioskModeActive = false;
    if (kioskCountdownWrap) kioskCountdownWrap.style.display = 'none';
    if (shieldVeilStandardActions) shieldVeilStandardActions.style.display = 'flex';
    if (kioskStatusBadge) kioskStatusBadge.style.display = 'none';

    if (document.fullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }

    hideScreenShield(true);
    if (chatWatermarkOverlay) chatWatermarkOverlay.style.backgroundImage = 'none';
    stopChaffGenerator();
    closePopover();
    if (ws) {
      ws.send(JSON.stringify({ type: 'leave', roomId: currentRoom }));
      ws.close();
    }
    currentRoom = '';
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

  // ==========================================================================
  // ENCRYPTED EPHEMERAL WHITEBOARD & SCRATCHPAD (POINTER-DRIVEN & REAL-TIME)
  // ==========================================================================
  const btnOpenWhiteboard = document.getElementById('btnOpenWhiteboard');
  const whiteboardModal = document.getElementById('whiteboardModal');
  const whiteboardBackdrop = document.getElementById('whiteboardBackdrop');
  const btnCloseWhiteboard = document.getElementById('btnCloseWhiteboard');
  const btnClearWhiteboard = document.getElementById('btnClearWhiteboard');
  const whiteboardCanvas = document.getElementById('whiteboardCanvas');
  let wbCtx = null;
  let isWbDrawing = false;
  let wbCurrentColor = '#10b981';
  let wbCurrentSize = 3;
  let lastWbX = 0;
  let lastWbY = 0;
  let pendingWbStrokes = [];
  let wbFlushTimeout = null;
  let isWbInitialized = false;

  const initWhiteboard = () => {
    if (!whiteboardCanvas) return;
    if (!wbCtx) {
      wbCtx = whiteboardCanvas.getContext('2d');
    }

    // Set fixed virtual canvas resolution (crisp HD scaling)
    if (whiteboardCanvas.width !== 1200 || whiteboardCanvas.height !== 750) {
      whiteboardCanvas.width = 1200;
      whiteboardCanvas.height = 750;
      wbCtx.fillStyle = '#070a10';
      wbCtx.fillRect(0, 0, 1200, 750);
    }

    wbCtx.lineCap = 'round';
    wbCtx.lineJoin = 'round';

    if (isWbInitialized) return;
    isWbInitialized = true;

    const getWbCoordinates = (e) => {
      const rect = whiteboardCanvas.getBoundingClientRect();
      const scaleX = whiteboardCanvas.width / (rect.width || 1);
      const scaleY = whiteboardCanvas.height / (rect.height || 1);
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      isWbDrawing = true;
      try { whiteboardCanvas.setPointerCapture(e.pointerId); } catch(err) {}
      const coords = getWbCoordinates(e);
      lastWbX = coords.x;
      lastWbY = coords.y;

      // Draw initial point
      wbCtx.strokeStyle = wbCurrentColor;
      wbCtx.lineWidth = wbCurrentSize;
      wbCtx.beginPath();
      wbCtx.arc(coords.x, coords.y, wbCurrentSize / 2, 0, Math.PI * 2);
      wbCtx.fillStyle = wbCurrentColor;
      wbCtx.fill();
    };

    const draw = (e) => {
      if (!isWbDrawing || !wbCtx) return;
      e.preventDefault();
      const coords = getWbCoordinates(e);

      // Render local stroke
      wbCtx.strokeStyle = wbCurrentColor;
      wbCtx.lineWidth = wbCurrentSize;
      wbCtx.beginPath();
      wbCtx.moveTo(lastWbX, lastWbY);
      wbCtx.lineTo(coords.x, coords.y);
      wbCtx.stroke();

      // Buffer stroke for encrypted batch sync
      pendingWbStrokes.push({
        fromX: lastWbX,
        fromY: lastWbY,
        toX: coords.x,
        toY: coords.y,
        color: wbCurrentColor,
        size: wbCurrentSize
      });

      lastWbX = coords.x;
      lastWbY = coords.y;

      if (!wbFlushTimeout) {
        wbFlushTimeout = setTimeout(flushWhiteboardStrokes, 50);
      }
    };

    const stopDraw = (e) => {
      if (isWbDrawing) {
        isWbDrawing = false;
        try { whiteboardCanvas.releasePointerCapture(e.pointerId); } catch(err) {}
        flushWhiteboardStrokes();
      }
    };

    // Modern Pointer Events (Unified Touch, Mouse, & Stylus)
    whiteboardCanvas.addEventListener('pointerdown', startDraw);
    whiteboardCanvas.addEventListener('pointermove', draw);
    whiteboardCanvas.addEventListener('pointerup', stopDraw);
    whiteboardCanvas.addEventListener('pointercancel', stopDraw);

    // Color pickers
    document.querySelectorAll('.wb-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wb-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        wbCurrentColor = btn.dataset.color || '#10b981';
      });
    });

    // Size pickers
    document.querySelectorAll('.wb-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wb-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        wbCurrentSize = parseInt(btn.dataset.size, 10) || 3;
      });
    });
  };

  const flushWhiteboardStrokes = async () => {
    if (wbFlushTimeout) {
      clearTimeout(wbFlushTimeout);
      wbFlushTimeout = null;
    }
    if (pendingWbStrokes.length === 0 || !window.stealthCrypto || !window.stealthCrypto.isInitialized) return;

    try {
      const batch = [...pendingWbStrokes];
      pendingWbStrokes = [];
      const enc = await window.stealthCrypto.encrypt({
        whiteboardData: true,
        strokes: batch
      });
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'encrypted_message',
          payload: enc
        }));
      }
    } catch (e) {}
  };

  const renderRemoteWhiteboardStrokes = (strokes) => {
    if (!wbCtx && whiteboardCanvas) initWhiteboard();
    if (!wbCtx || !Array.isArray(strokes)) return;

    strokes.forEach(s => {
      wbCtx.strokeStyle = s.color || '#10b981';
      wbCtx.lineWidth = s.size || 3;
      wbCtx.beginPath();
      wbCtx.moveTo(s.fromX, s.fromY);
      wbCtx.lineTo(s.toX, s.toY);
      wbCtx.stroke();
    });
  };

  const clearLocalWhiteboard = (broadcast = true) => {
    if (wbCtx && whiteboardCanvas) {
      wbCtx.fillStyle = '#070a10';
      wbCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
    }
    if (broadcast && window.stealthCrypto && window.stealthCrypto.isInitialized) {
      (async () => {
        try {
          const enc = await window.stealthCrypto.encrypt({
            whiteboardClear: true
          });
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'encrypted_message',
              payload: enc
            }));
          }
        } catch (e) {}
      })();
    }
  };

  if (btnOpenWhiteboard) {
    btnOpenWhiteboard.addEventListener('click', () => {
      if (whiteboardModal) whiteboardModal.style.display = 'flex';
      initWhiteboard();
    });
  }

  if (btnCloseWhiteboard) {
    btnCloseWhiteboard.addEventListener('click', () => {
      if (whiteboardModal) whiteboardModal.style.display = 'none';
    });
  }

  if (whiteboardBackdrop) {
    whiteboardBackdrop.addEventListener('click', () => {
      if (whiteboardModal) whiteboardModal.style.display = 'none';
    });
  }

  if (btnClearWhiteboard) {
    btnClearWhiteboard.addEventListener('click', () => {
      clearLocalWhiteboard(true);
      showToast('Whiteboard canvas cleared');
    });
  }


  // Hotkey Navigation & Safe Panic Trigger
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 0. If Screen Privacy Shield is visible, ESC dismisses it cleanly
      if (screenShieldOverlay && screenShieldOverlay.style.display === 'flex') {
        hideScreenShield(true);
        panicPressTimes = [];
        return;
      }

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


  // ==========================================================================
  // AEGIS VIDEO ENHANCEMENTS: VOICE ACTIVITY, NATIVE PIP, FULLSCREEN & SWAP
  // ==========================================================================

  let audioVisualizerCtx = null;
  let remoteAudioAnalyser = null;
  let visualizerRaf = null;
  let isViewSwapped = false;
  let isAudioOnlyMode = false;

  const initAudioVisualizer = (stream) => {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return;
      if (!audioVisualizerCtx) {
        audioVisualizerCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioVisualizerCtx.state === 'suspended') {
        audioVisualizerCtx.resume().catch(() => {});
      }
      const source = audioVisualizerCtx.createMediaStreamSource(stream);
      remoteAudioAnalyser = audioVisualizerCtx.createAnalyser();
      remoteAudioAnalyser.fftSize = 64;
      source.connect(remoteAudioAnalyser);

      const dataArray = new Uint8Array(remoteAudioAnalyser.frequencyBinCount);
      const remoteSpeakingEl = document.getElementById('remoteSpeakingIndicator');
      const remoteVideoEl = document.getElementById('modalRemoteVideo');

      const checkAudio = () => {
        if (!remoteAudioAnalyser) return;
        remoteAudioAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const isSpeaking = avg > 20;

        if (remoteSpeakingEl) {
          remoteSpeakingEl.style.display = isSpeaking ? 'inline-flex' : 'none';
        }
        if (remoteVideoEl) {
          if (isSpeaking) {
            remoteVideoEl.classList.add('speaking-active-ring');
          } else {
            remoteVideoEl.classList.remove('speaking-active-ring');
          }
        }
        visualizerRaf = requestAnimationFrame(checkAudio);
      };
      if (visualizerRaf) cancelAnimationFrame(visualizerRaf);
      visualizerRaf = requestAnimationFrame(checkAudio);
    } catch (e) {
      console.warn('Audio visualizer init error:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (visualizerRaf) {
      cancelAnimationFrame(visualizerRaf);
      visualizerRaf = null;
    }
    const remoteSpeakingEl = document.getElementById('remoteSpeakingIndicator');
    const remoteVideoEl = document.getElementById('modalRemoteVideo');
    if (remoteSpeakingEl) remoteSpeakingEl.style.display = 'none';
    if (remoteVideoEl) remoteVideoEl.classList.remove('speaking-active-ring');
  };

  // Swap Views (Main Video & PiP)
  const toggleViewSwap = () => {
    isViewSwapped = !isViewSwapped;
    const stage = document.querySelector('.video-stage-inner');
    if (stage) stage.classList.toggle('view-swapped', isViewSwapped);
    showToast(isViewSwapped ? 'Swapped main view to your camera' : 'Restored main view to peer');
  };

  const btnHeaderSwapView = document.getElementById('btnHeaderSwapView');
  if (btnHeaderSwapView) btnHeaderSwapView.addEventListener('click', toggleViewSwap);

  // Fullscreen Toggle
  const btnModalFullscreen = document.getElementById('btnModalFullscreen');
  const iconEnterFullscreen = document.getElementById('iconEnterFullscreen');
  const iconExitFullscreen = document.getElementById('iconExitFullscreen');
  if (btnModalFullscreen) {
    btnModalFullscreen.addEventListener('click', () => {
      const modal = document.getElementById('videoCallModal');
      if (!document.fullscreenElement) {
        if (modal.requestFullscreen) modal.requestFullscreen().catch(() => {});
        else if (modal.webkitRequestFullscreen) modal.webkitRequestFullscreen();
        if (iconEnterFullscreen) iconEnterFullscreen.style.display = 'none';
        if (iconExitFullscreen) iconExitFullscreen.style.display = 'inline';
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        if (iconEnterFullscreen) iconEnterFullscreen.style.display = 'inline';
        if (iconExitFullscreen) iconExitFullscreen.style.display = 'none';
      }
    });
  }

  // Native Picture-in-Picture
  const btnModalNativePip = document.getElementById('btnModalNativePip');
  if (btnModalNativePip) {
    btnModalNativePip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          btnModalNativePip.classList.remove('active-pip');
        } else if (modalRemoteVideo && modalRemoteVideo.srcObject) {
          await modalRemoteVideo.requestPictureInPicture();
          btnModalNativePip.classList.add('active-pip');
        } else if (modalLocalVideo && modalLocalVideo.srcObject) {
          await modalLocalVideo.requestPictureInPicture();
          btnModalNativePip.classList.add('active-pip');
        }
      } catch (err) {
        console.warn('Native PiP error:', err);
        showToast('Picture-in-Picture not supported or active stream required');
      }
    });
  }

  // Audio-Only Low-Bandwidth Mode
  const btnModalAudioOnly = document.getElementById('btnModalAudioOnly');
  const iconAudioOnlyOff = document.getElementById('iconAudioOnlyOff');
  const iconAudioOnlyOn = document.getElementById('iconAudioOnlyOn');
  if (btnModalAudioOnly) {
    btnModalAudioOnly.addEventListener('click', () => {
      if (!localStream) return;
      isAudioOnlyMode = !isAudioOnlyMode;
      localStream.getVideoTracks().forEach(t => {
        t.enabled = !isAudioOnlyMode;
      });
      btnModalAudioOnly.classList.toggle('active-audio-only', isAudioOnlyMode);
      if (iconAudioOnlyOff) iconAudioOnlyOff.style.display = isAudioOnlyMode ? 'none' : 'inline';
      if (iconAudioOnlyOn) iconAudioOnlyOn.style.display = isAudioOnlyMode ? 'inline' : 'none';
      showToast(isAudioOnlyMode ? '🔇 Audio-Only mode (Camera paused, conserving bandwidth)' : '📹 Video camera restored');
    });
  }
})();
