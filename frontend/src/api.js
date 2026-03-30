import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export async function runScan(websiteUrl, appUrl, repoUrl, scannerType = 'python', userPreferences = null) {
  const body = {
    website_url: websiteUrl,
    app_url: appUrl,
    repo_url: repoUrl,
    scanner_type: scannerType,
  };
  if (userPreferences) {
    body.user_preferences = userPreferences;
  }
  const response = await axios.post(`${BASE_URL}/scan`, body);
  return response.data;
}