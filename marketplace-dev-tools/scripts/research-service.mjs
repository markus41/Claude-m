#!/usr/bin/env node

/**
 * research-service.mjs
 *
 * Standalone ESM script that fetches Microsoft Learn documentation pages
 * for a given service and extracts Graph API endpoints, permissions, and schemas.
 *
 * Usage: npm run research -- <service-name>
 *        node marketplace-dev-tools/scripts/research-service.mjs <service-name>
 *
 * Requires Node.js 18+ (uses built-in fetch).
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = resolve(__dirname, "..", "research-output");

// Microsoft Learn API search endpoint
const LEARN_SEARCH_URL =
  "https://learn.microsoft.com/api/search?search={query}&locale=en-us&$top=10&facet=category&facet=products";

// Known service-to-doc-path mappings
const SERVICE_DOC_PATHS = {
  bookings: "booking-api-overview",
  calendar: "calendar",
  contacts: "contact",
  mail: "mail-api-overview",
  onedrive: "onedrive",
  onenote: "onenote-api-overview",
  planner: "planner-overview",
  teams: "teams-api-overview",
  sharepoint: "sharepoint",
  todo: "todo-overview",
  users: "user",
  groups: "groups-overview",
  intune: "intune-graph-overview",
  security: "security-api-overview",
  reports: "report",
  forms: "forms-overview",
  lists: "list",
};

/**
 * Fetch a URL with timeout and error handling.
 */
async function safeFetch(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "claude-m-research/1.0" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract endpoints from a Microsoft Learn HTML page.
 * Looks for HTTP method + URL patterns in the page content.
 */
function extractEndpoints(html) {
  const endpoints = [];
  // Match patterns like: GET /me/calendarGroups, POST /users/{id}/events
  const endpointRegex =
    /\b(GET|POST|PATCH|PUT|DELETE)\s+(\/[a-zA-Z0-9\-_{}\/\$\.]+)/g;
  let match;
  const seen = new Set();
  while ((match = endpointRegex.exec(html)) !== null) {
    const key = `${match[1]} ${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      endpoints.push({
        method: match[1],
        path: match[2],
        description: "",
        apiVersion: "v1.0",
        permissions: { delegated: [], application: [] },
        requestBody: null,
        responseSchema: {},
        queryParams: [],
        pagination: false,
      });
    }
  }
  return endpoints;
}

/**
 * Extract permission scopes from page content.
 */
function extractPermissions(html) {
  const permissions = { delegated: [], application: [] };
  // Match permission patterns like: Calendars.Read, Mail.ReadWrite, User.Read.All
  const permRegex = /\b([A-Z][a-zA-Z]+(?:\.[A-Z][a-zA-Z]+){1,3})\b/g;
  let match;
  const seen = new Set();
  while ((match = permRegex.exec(html)) !== null) {
    const perm = match[1];
    if (!seen.has(perm) && !perm.startsWith("System.") && !perm.startsWith("Microsoft.")) {
      seen.add(perm);
      if (perm.endsWith(".All")) {
        permissions.application.push(perm);
      } else {
        permissions.delegated.push(perm);
      }
    }
  }
  return permissions;
}

/**
 * Build the research output for a service.
 */
async function researchService(serviceName) {
  console.log(`\nResearching Microsoft Graph API: ${serviceName}`);
  console.log("=".repeat(50));

  const docPath = SERVICE_DOC_PATHS[serviceName.toLowerCase()];
  const baseDocUrl = docPath
    ? `https://learn.microsoft.com/en-us/graph/api/resources/${docPath}?view=graph-rest-1.0`
    : null;

  const docUrls = [];
  const allEndpoints = [];
  const allPermissions = { delegated: new Set(), application: new Set() };

  // Fetch the main documentation page
  if (baseDocUrl) {
    console.log(`Fetching: ${baseDocUrl}`);
    try {
      const html = await safeFetch(baseDocUrl);
      docUrls.push(baseDocUrl);

      const endpoints = extractEndpoints(html);
      allEndpoints.push(...endpoints);
      console.log(`  Found ${endpoints.length} endpoints`);

      const perms = extractPermissions(html);
      perms.delegated.forEach((p) => allPermissions.delegated.add(p));
      perms.application.forEach((p) => allPermissions.application.add(p));
      console.log(
        `  Found ${perms.delegated.length + perms.application.length} permission scopes`
      );
    } catch (err) {
      console.warn(`  Warning: Could not fetch ${baseDocUrl}: ${err.message}`);
    }
  }

  // Search Microsoft Learn for additional pages
  const searchQuery = encodeURIComponent(
    `Microsoft Graph API ${serviceName} endpoints`
  );
  const searchUrl = LEARN_SEARCH_URL.replace("{query}", searchQuery);
  console.log(`Searching Microsoft Learn for additional docs...`);
  try {
    const searchHtml = await safeFetch(searchUrl);
    // Extract URLs from search results
    const urlRegex =
      /https:\/\/learn\.microsoft\.com\/en-us\/graph\/api\/[a-z0-9\-\/\?=&]+/gi;
    let urlMatch;
    const additionalUrls = new Set();
    while ((urlMatch = urlRegex.exec(searchHtml)) !== null) {
      const url = urlMatch[0].split("&")[0]; // Clean query params
      if (!docUrls.includes(url)) {
        additionalUrls.add(url);
      }
    }

    // Fetch up to 5 additional pages
    const urlsToFetch = [...additionalUrls].slice(0, 5);
    for (const url of urlsToFetch) {
      console.log(`Fetching: ${url}`);
      try {
        const html = await safeFetch(url);
        docUrls.push(url);
        const endpoints = extractEndpoints(html);
        allEndpoints.push(...endpoints);
        const perms = extractPermissions(html);
        perms.delegated.forEach((p) => allPermissions.delegated.add(p));
        perms.application.forEach((p) => allPermissions.application.add(p));
      } catch (err) {
        console.warn(`  Warning: Could not fetch ${url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`  Warning: Search failed: ${err.message}`);
  }

  // Deduplicate endpoints
  const seen = new Set();
  const uniqueEndpoints = allEndpoints.filter((ep) => {
    const key = `${ep.method} ${ep.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Detect patterns
  const patterns = [];
  const methods = new Set(uniqueEndpoints.map((ep) => ep.method));
  if (methods.has("GET") && methods.has("POST") && methods.has("PATCH") && methods.has("DELETE")) {
    patterns.push("crud");
  }
  if (uniqueEndpoints.some((ep) => ep.method === "GET" && !ep.path.includes("{") && !ep.path.includes("$"))) {
    patterns.push("pagination");
  }

  // Build output
  const displayName =
    serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
  const output = {
    service: serviceName.toLowerCase(),
    displayName,
    description: `Microsoft Graph API endpoints for ${displayName}`,
    apiVersions: ["v1.0"],
    baseUrl: "https://graph.microsoft.com/v1.0",
    docUrls,
    areas: [
      {
        name: displayName,
        endpoints: uniqueEndpoints,
      },
    ],
    patterns,
    notes: `Auto-generated research output. Review with /research-reviewer for accuracy. Found ${uniqueEndpoints.length} endpoints across ${docUrls.length} documentation pages.`,
  };

  return output;
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npm run research -- <service-name>");
    console.error("Example: npm run research -- bookings");
    console.error(
      "\nKnown services: " + Object.keys(SERVICE_DOC_PATHS).join(", ")
    );
    process.exit(1);
  }

  const serviceName = args[0];

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const result = await researchService(serviceName);
    const outputPath = resolve(OUTPUT_DIR, `${serviceName.toLowerCase()}.json`);
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

    console.log(`\n${"=".repeat(50)}`);
    console.log(`Research complete: ${serviceName}`);
    console.log(`  Endpoints found: ${result.areas[0].endpoints.length}`);
    console.log(`  Doc pages used:  ${result.docUrls.length}`);
    console.log(`  Patterns:        ${result.patterns.join(", ") || "none detected"}`);
    console.log(`  Output:          ${outputPath}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review with: /research-reviewer`);
    console.log(`  2. Scaffold:    /scaffold-plugin ${outputPath} --plugin-name microsoft-${serviceName}`);
  } catch (err) {
    console.error(`\nError researching ${serviceName}: ${err.message}`);
    process.exit(1);
  }
}

main();
