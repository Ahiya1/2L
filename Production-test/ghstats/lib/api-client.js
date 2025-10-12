// lib/api-client.js
const API_BASE_URL = 'https://api.github.com';
const API_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch repository statistics from GitHub API
 * @param {string} owner - Repository owner username
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Statistics object with stars, forks, issues, watchers
 * @throws {Error} On API errors, network failures, or timeout
 */
export async function fetchRepoStats(owner, repo) {
  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/repos/${owner}/${repo}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ghstats-cli'
        }
      }
    );

    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Check response status
    if (!response.ok) {
      // Repository not found
      if (response.status === 404) {
        throw new Error(`Repository '${owner}/${repo}' not found`);
      }

      // Rate limit exceeded
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          throw new Error(
            `Rate limit exceeded. Resets at ${resetDate.toLocaleString()}`
          );
        }
        throw new Error('Rate limit exceeded');
      }

      // Other HTTP errors
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    // Parse JSON response
    const data = await response.json();

    // Extract required fields
    // CRITICAL: Use subscribers_count for watchers, NOT watchers_count
    // (watchers_count duplicates stargazers_count due to GitHub API legacy behavior)
    return {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      issues: data.open_issues_count || 0,
      watchers: data.subscribers_count || 0
    };

  } catch (error) {
    // Handle timeout specifically
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - GitHub API is not responding');
    }

    // Re-throw other errors for centralized handling
    throw error;

  } finally {
    // Always clear timeout to prevent memory leak
    clearTimeout(timeoutId);
  }
}
