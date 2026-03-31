// ═══════════════════════════════════════════════════════════════
//  SecurePulse Extension — Background Service Worker
// ═══════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:8000';

// ── On Install ────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SecurePulse] Extension installed:', details.reason);

  // Set initial badge
  chrome.action.setBadgeBackgroundColor({ color: '#6c5ce7' });
  chrome.action.setBadgeText({ text: '' });

  // Show welcome notification on first install
  if (details.reason === 'install') {
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SecurePulse Installed! 🛡️',
      message: 'Click the toolbar icon on any website to run an instant security scan.',
    });
  }
});

// ── Listen for messages from popup ────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanComplete') {
    const { score, grade, url } = request.data;

    // Update the extension badge with the grade
    const gradeColors = {
      A: '#00b894',
      B: '#00cec9',
      C: '#fdcb6e',
      D: '#e17055',
      F: '#d63031',
    };

    chrome.action.setBadgeText({ text: grade });
    chrome.action.setBadgeBackgroundColor({
      color: gradeColors[grade] || '#6c5ce7',
    });

    // Store last scan result
    chrome.storage.local.set({
      lastScan: {
        url,
        score,
        grade,
        timestamp: Date.now(),
      },
    });

    // Show notification for critical results
    if (score < 40) {
      chrome.notifications.create(`scan-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `⚠️ Security Alert — Grade ${grade}`,
        message: `${url} scored ${score}/100. Critical vulnerabilities found. Open SecurePulse for details.`,
      });
    }

    sendResponse({ success: true });
  }

  // Keep the message channel open for async responses
  return true;
});

// ── Context Menu (Right-click "Scan with SecurePulse") ────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'securepulse-scan',
    title: 'Scan with SecurePulse',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'securepulse-scan') {
    // Open popup — we can't directly trigger a scan from context menu,
    // but we can store the URL and the popup will pick it up
    const targetUrl = info.linkUrl || info.pageUrl || tab.url;
    chrome.storage.local.set({ pendingScanUrl: targetUrl });
    chrome.action.openPopup();
  }
});
