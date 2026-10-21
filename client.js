/**
 * GT Edits - Clients Fetcher
 * Fetches clients from Google Sheets, supports YouTube Data API v3 and Custom Logos (Instagram, etc.)
 */

// ============================================================================
// 1. CONFIGURATION
// ============================================================================

export const GOOGLE_SHEET_ID = "https://docs.google.com/spreadsheets/d/1rMPwLuOtEOgez0dxdh-bsyHTvAdcTSpT_HGr5UI-m7o/edit";

export const GOOGLE_SHEET_NAME = "Sheet1";

export const YOUTUBE_API_KEY = "AIzaSyC4lCMt4SUMAMaDoeIBe4rHB-FBhY6vlGw";

export const CACHE_EXPIRATION_HOURS = 12;

// Platform SVG Icons
const YT_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff0000" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
`;

const IG_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="#E1306C" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts sheet ID from either raw ID or full Google Sheets URL.
 */
function normalizeSheetId(input) {
  if (!input) return "";
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}

/**
 * Parses channel handle or ID from various YouTube URL formats.
 */
function parseYouTubeUrl(url) {
  if (!url) return null;
  const clean = url.trim();

  const handleMatch = clean.match(/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return { type: "handle", value: handleMatch[1] };
  }

  const channelMatch = clean.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (channelMatch) {
    return { type: "id", value: channelMatch[1] };
  }

  const userMatch = clean.match(/\/(?:c|user)\/([a-zA-Z0-9_.-]+)/);
  if (userMatch) {
    return { type: "username", value: userMatch[1] };
  }

  return null;
}

/**
 * Formats subscriber count numbers into readable strings (e.g., 641000 -> 641K).
 */
function formatSubscribers(count) {
  const num = parseInt(count, 10);
  if (isNaN(num)) return count ? `${count}` : "0";
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(num % 1000000 >= 100000 ? 1 : 0);
    return `${formatted}M`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(num % 1000 >= 100 ? 1 : 0);
    return `${formatted}K`;
  }
  return num.toLocaleString();
}

/**
 * Parses a count string (like "150K", "1.2M", "5000") to a raw numeric value for sorting.
 */
function parseRawCount(str) {
  if (!str) return 0;
  if (typeof str === "number") return str;
  const match = String(str).match(/([\d.]+)\s*([kKmM]?)/);
  if (!match) return 0;
  let val = parseFloat(match[1]) || 0;
  const unit = (match[2] || "").toLowerCase();
  if (unit === "k") val *= 1000;
  if (unit === "m") val *= 1000000;
  return val;
}

/**
 * Cache management in localStorage
 */
const CACHE_PREFIX = "gt_yt_data_v4_";

function getCachedData(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (ageHours < CACHE_EXPIRATION_HOURS) {
      return data;
    }
  } catch (err) {
    console.warn("Error reading cache:", err);
  }
  return null;
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (err) {
    console.warn("Error saving cache:", err);
  }
}

// ============================================================================
// DATA FETCHING: GOOGLE SHEETS
// ============================================================================

/**
 * Fetches rows from Google Sheets.
 * Supports:
 * - Col 1: Name
 * - Col 2: Channel / Profile URL (YouTube or Instagram)
 * - Col 3: Logo URL (Optional custom image URL or local path e.g. clients/name.png)
 * - Col 4: Followers / Subscribers Count (Optional override e.g. "250K")
 */
async function fetchSheetRows(sheetId, sheetName = "") {
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  if (sheetName) {
    url += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets responded with HTTP ${response.status}`);
  }

  const text = await response.text();
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
  if (!jsonMatch) {
    throw new Error("Unable to parse Google Sheet data. Please make sure sheet permissions are set to 'Anyone with the link can view'.");
  }

  const json = JSON.parse(jsonMatch[1]);
  if (json.status === "error") {
    throw new Error(json.errors?.[0]?.detailed_message || "Error fetching Google Sheet");
  }

  const table = json.table;
  if (!table || !table.rows) return [];

  // Identify column indices
  let nameColIdx = 0;
  let urlColIdx = 1;
  let logoColIdx = -1;
  let subsColIdx = -1;

  if (table.cols && table.cols.length > 0) {
    table.cols.forEach((col, idx) => {
      const label = (col.label || "").toLowerCase();
      if (label.includes("name")) nameColIdx = idx;
      else if (
        label.includes("url") ||
        label.includes("youtube") ||
        label.includes("instagram") ||
        label.includes("channel") ||
        label.includes("link")
      ) {
        urlColIdx = idx;
      } else if (
        label.includes("logo") ||
        label.includes("image") ||
        label.includes("avatar") ||
        label.includes("img") ||
        label.includes("photo")
      ) {
        logoColIdx = idx;
      } else if (
        label.includes("sub") ||
        label.includes("follower") ||
        label.includes("count")
      ) {
        subsColIdx = idx;
      }
    });
  }

  // Fallback positional indices if not found by name
  if (logoColIdx === -1 && table.cols && table.cols.length >= 3) {
    logoColIdx = 2;
  }
  if (subsColIdx === -1 && table.cols && table.cols.length >= 4) {
    subsColIdx = 3;
  }

  const clients = [];
  for (const row of table.rows) {
    if (!row.c) continue;
    const nameCell = row.c[nameColIdx];
    const urlCell = row.c[urlColIdx];
    const logoCell = logoColIdx >= 0 ? row.c[logoColIdx] : null;
    const subsCell = subsColIdx >= 0 ? row.c[subsColIdx] : null;

    const name = nameCell ? String(nameCell.f || nameCell.v || "").trim() : "";
    const url = urlCell ? String(urlCell.f || urlCell.v || "").trim() : "";
    const customLogo = logoCell ? String(logoCell.f || logoCell.v || "").trim() : "";
    const customSubs = subsCell ? String(subsCell.f || subsCell.v || "").trim() : "";

    // Ignore empty lines or header repetitions
    if (name && url && name.toLowerCase() !== "name") {
      clients.push({ name, url, customLogo, customSubs });
    }
  }

  return clients;
}

// ============================================================================
// DATA FETCHING: YOUTUBE DATA API V3
// ============================================================================

/**
 * Fetches subscriber count and logo for a YouTube channel URL.
 */
async function fetchYouTubeDetails(channelUrl, apiKey) {
  const parsed = parseYouTubeUrl(channelUrl);
  if (!parsed) {
    return null;
  }

  const cacheKey = `${parsed.type}_${parsed.value}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  let endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=${apiKey}`;

  if (parsed.type === "handle") {
    endpoint += `&forHandle=${encodeURIComponent(parsed.value)}`;
  } else if (parsed.type === "id") {
    endpoint += `&id=${encodeURIComponent(parsed.value)}`;
  } else if (parsed.type === "username") {
    endpoint += `&forUsername=${encodeURIComponent(parsed.value)}`;
  }

  const res = await fetch(endpoint);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API returned status ${res.status}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }

  const item = data.items[0];
  const rawSubs = parseInt(item.statistics?.subscriberCount, 10) || 0;
  const subscribers = formatSubscribers(item.statistics?.subscriberCount);

  // Logo URL
  const logo =
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.default?.url ||
    "";

  const details = {
    subscribers,
    subsRaw: rawSubs,
    logo
  };

  setCachedData(cacheKey, details);
  return details;
}

// ============================================================================
// UI RENDERING
// ============================================================================

/**
 * Shows shimmer loading skeletons while data is being fetched.
 */
function renderSkeletons(grid, count = 10) {
  let skeletonsHtml = "";
  for (let i = 0; i < count; i++) {
    skeletonsHtml += `
      <div class="client-card skeleton-card">
        <div class="skeleton-avatar skeleton-shimmer"></div>
        <div class="skeleton-line skeleton-name skeleton-shimmer"></div>
        <div class="skeleton-line skeleton-sub skeleton-shimmer"></div>
      </div>
    `;
  }
  grid.innerHTML = skeletonsHtml;
}

/**
 * Renders the client cards into the grid.
 */
function renderClientCards(grid, clients) {
  // Sort descending by subscriber/follower count
  const sortedClients = [...clients].sort((a, b) => (b.subsRaw || 0) - (a.subsRaw || 0));

  let html = "";
  sortedClients.forEach((client) => {
    const initial = (client.name[0] || "C").toUpperCase();

    // Use referrerpolicy="no-referrer" so Google CDN doesn't block YouTube avatars
    const logoHtml = client.logo
      ? `<img src="${client.logo}" alt="${client.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'client-avatar-fallback\\'><span>${initial}</span></div>';">`
      : `<div class="client-avatar-fallback"><span>${initial}</span></div>`;

    // Choose icon and badge label based on platform
    let badgeHtml = "";
    if (client.platform === "instagram") {
      badgeHtml = `
        <p class="client-card-subs client-card-subs-ig">
          ${IG_ICON_SVG}
          <span>${client.subscribers || "Instagram"}</span>
        </p>
      `;
    } else {
      badgeHtml = `
        <p class="client-card-subs">
          ${YT_ICON_SVG}
          <span>${client.subscribers || "0"} subscribers</span>
        </p>
      `;
    }

    html += `
      <a href="${client.url}" target="_blank" rel="noopener noreferrer" class="client-card-link">
        <div class="client-card">
          <div class="client-card-logo-wrapper">
            ${logoHtml}
          </div>
          <div class="client-card-body">
            <p class="client-card-name" title="${client.name}">${client.name}</p>
            ${badgeHtml}
          </div>
        </div>
      </a>
    `;
  });

  grid.innerHTML = html;
}

// ============================================================================
// MAIN CONTROLLER
// ============================================================================

async function initClients() {
  const grid = document.getElementById("clients-grid");
  if (!grid) return;

  renderSkeletons(grid, 8);

  const cleanSheetId = normalizeSheetId(GOOGLE_SHEET_ID);
  const isSheetConfigured = cleanSheetId && cleanSheetId !== "YOUR_GOOGLE_SHEET_ID";
  const isApiKeyConfigured = YOUTUBE_API_KEY && YOUTUBE_API_KEY !== "YOUR_YOUTUBE_API_KEY";

  let sheetRows = [];

  // 1. Check if Google Sheet is configured
  if (!isSheetConfigured) {
    grid.innerHTML = `
      <div class="clients-status-banner">
        <strong>⚙️ Setup Notice:</strong> Please set <code>GOOGLE_SHEET_ID</code> in <code>client.js</code> to load your clients from Google Sheets.
      </div>
    `;
    return;
  }

  try {
    sheetRows = await fetchSheetRows(cleanSheetId, GOOGLE_SHEET_NAME);
  } catch (err) {
    console.error("Error fetching Google Sheet:", err);
    grid.innerHTML = `
      <div class="clients-status-banner" style="border-color: #ff4757; color: #ff6b81;">
        <strong>Error Loading Google Sheet:</strong> ${err.message}<br>
        Make sure your Google Sheet is shared with <strong>"Anyone with the link can view"</strong>.
      </div>
    `;
    return;
  }

  if (!sheetRows || sheetRows.length === 0) {
    grid.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px 0;">
        No clients found in the spreadsheet.
      </p>
    `;
    return;
  }

  // 2. Fetch Details for each client (YouTube via API, Instagram/others via Sheet / Custom Logo)
  try {
    const clientsData = await Promise.all(
      sheetRows.map(async (row) => {
        const isYouTube = row.url.includes("youtube.com") || row.url.includes("youtu.be");
        const isInstagram = row.url.includes("instagram.com");

        if (isYouTube && isApiKeyConfigured) {
          try {
            const yt = await fetchYouTubeDetails(row.url, YOUTUBE_API_KEY);
            if (yt) {
              return {
                name: row.name,
                url: row.url,
                subscribers: row.customSubs || yt.subscribers,
                subsRaw: parseRawCount(row.customSubs) || yt.subsRaw,
                logo: row.customLogo || yt.logo,
                platform: "youtube"
              };
            }
          } catch (ytErr) {
            console.warn(`Could not fetch YouTube details for ${row.name}:`, ytErr);
          }
        }

        // Instagram or custom platform client
        if (isInstagram) {
          return {
            name: row.name,
            url: row.url,
            subscribers: row.customSubs || "Instagram",
            subsRaw: parseRawCount(row.customSubs) || 0,
            logo: row.customLogo || "",
            platform: "instagram"
          };
        }

        // General fallback
        return {
          name: row.name,
          url: row.url,
          subscribers: row.customSubs || "--",
          subsRaw: parseRawCount(row.customSubs) || 0,
          logo: row.customLogo || "",
          platform: isYouTube ? "youtube" : "other"
        };
      })
    );

    renderClientCards(grid, clientsData);
  } catch (err) {
    console.error("Error loading client details:", err);
    grid.innerHTML = `
      <div class="clients-status-banner" style="border-color: #ff4757; color: #ff6b81;">
        <strong>Error loading clients:</strong> ${err.message}
      </div>
    `;
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClients);
} else {
  initClients();
}
