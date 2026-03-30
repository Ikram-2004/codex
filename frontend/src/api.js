import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════

export async function registerUser(email, name, password, company = '') {
  const response = await api.post('/auth/register', { email, name, password, company });
  return response.data;
}

export async function loginUser(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function getUserProfile(userId) {
  const response = await api.get(`/auth/user/${userId}`);
  return response.data;
}

export async function updatePreferences(userId, preferences) {
  const response = await api.put('/auth/preferences', {
    user_id: userId,
    preferences,
  });
  return response.data;
}

export async function updateUserProfile(userId, name, company) {
<<<<<<< HEAD
  const response = await api.put('/auth/profile', {
    user_id: userId,
    name,
    company,
=======
  const response = await api.put('/auth/update-profile', {
    user_id: userId,
    name: name,
    company: company,
>>>>>>> a22312cf2e87e2e27f7718ee48f4802920345e6c
  });
  return response.data;
}

<<<<<<< HEAD
=======

>>>>>>> a22312cf2e87e2e27f7718ee48f4802920345e6c
// ══════════════════════════════════════════════════════════════
//  SCANNING
// ══════════════════════════════════════════════════════════════

export async function runScan(websiteUrl, appUrl, repoUrl, scannerType = 'python', userPreferences = null, userId = null) {
  const body = {
    website_url: websiteUrl,
    app_url: appUrl,
    repo_url: repoUrl,
    scanner_type: scannerType,
    user_id: userId,
  };
  if (userPreferences) {
    body.user_preferences = userPreferences;
  }
  const response = await api.post('/scan', body);
  return response.data;
}

export async function getScanHistory(userId) {
  const response = await api.get(`/scans/history/${userId}`);
  return response.data;
}

export async function getScanDetails(scanId) {
  const response = await api.get(`/scans/${scanId}`);
  return response.data;
}

export async function uploadApk(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/apk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════

export async function getDashboardStats(userId) {
  const response = await api.get(`/dashboard/${userId}`);
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════════════════════

export async function sendChatMessage(messages, scanContext = null, userPreferences = null, userId = null, sessionId = null) {
  const response = await api.post('/chat', {
    messages,
    scan_context: scanContext,
    user_preferences: userPreferences,
    user_id: userId,
    session_id: sessionId,
  });
  return response.data;
}

export async function getChatHistory(userId, chatType = 'advisor') {
  const response = await api.get(`/chat/history/${userId}`, { params: { chat_type: chatType } });
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  TICKETS
// ══════════════════════════════════════════════════════════════

export async function createTicket(name, email, subject, priority, description, userId = null, scanId = null) {
  const response = await api.post('/ticket', {
    name, email, subject, priority, description,
    user_id: userId,
    scan_id: scanId,
  });
  return response.data;
}

export async function getUserTickets(userId) {
  const response = await api.get(`/tickets/${userId}`);
  return response.data;
}

// ══════════════════════════════════════════════════════════════
//  SUPPORT
// ══════════════════════════════════════════════════════════════

export async function searchKnowledgeBase(query) {
  const response = await api.post('/support/search', { query });
  return response.data;
}

export async function sendLiveChat(messages, userId = null) {
  const response = await api.post('/support/livechat', {
    messages,
    user_id: userId,
  });
  return response.data;
}

export async function getSystemStatus() {
  const response = await api.get('/status');
  return response.data;
}

export async function getKnowledgeDomains() {
  const response = await api.get('/support/knowledge');
  return response.data;
}

export async function getArticle(domainId, articleIndex) {
  const response = await api.get(`/support/knowledge/${domainId}/${articleIndex}`);
  return response.data;
}

export async function connectWithCommand(name, email, company, message, urgency) {
  const response = await api.post('/support/command', {
    name, email, company, message, urgency,
  });
  return response.data;
}