import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export async function runScan(websiteUrl, appUrl, repoUrl) {
  const response = await axios.post(`${BASE_URL}/scan`, {
    website_url: websiteUrl,
    app_url: appUrl,
    repo_url: repoUrl,
  });
  return response.data;
}