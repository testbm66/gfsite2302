# SEO Migration Plan — Old Site → GreenFox (greenfox.energy)

**Status:** There was previously **no SEO migration plan** in place. This document provides one and explains why running both sites in parallel is a risk.

---

## Why running both sites at once is a risk

| Risk | What happens |
|------|----------------------|
| **Duplicate content** | Google sees two versions of the same business (old domain/URLs + greenfox.energy). It may split rankings, demote one or both, or pick the “wrong” URL to show. |
| **Split link equity** | Backlinks and authority are spread across two properties instead of consolidating on the new site. |
| **User & search confusion** | People and crawlers don’t know which site is canonical. Old links, ads, and profiles may point to the old site while the new one is the one you want to rank. |
| **Wasted crawl budget** | Search engines spend time on the old site instead of fully discovering and trusting the new one. |

**Recommendation:** Treat the new site (greenfox.energy) as the single live site as soon as it’s ready. Use a short, planned cutover with 301 redirects from every old URL to the correct new URL so that equity and traffic transfer to greenfox.energy.

---

## Prerequisites (before cutover)

- [ ] New site (greenfox.energy) is live on Vercel and fully ready (content, funnel, key integrations as needed).
- [ ] You have a **full list of old-site URLs** that receive traffic or are linked to (from Google Search Console, analytics, or a crawl of the old site).
- [ ] You know where the **old site is hosted** (and who can add 301 redirects or change DNS).

---

## Step 1: Build the redirect map

For **every** important URL on the old site, decide where it should go on the new site. Use this table (fill in the “Old URL” column with real URLs from the old site).

**New site URL structure (greenfox.energy):**

| New URL (destination) | Old URL (source) — fill in |
|------------------------|----------------------------|
| https://greenfox.energy/ | e.g. https://old-domain.co.uk/ or https://old-domain.co.uk/index.html |
| https://greenfox.energy/solar-services | |
| https://greenfox.energy/quote | |
| https://greenfox.energy/solar-healthcheck | |
| https://greenfox.energy/about | |
| https://greenfox.energy/contact | |
| https://greenfox.energy/battery-storage | |
| https://greenfox.energy/ev-charger | |
| https://greenfox.energy/partners | |
| https://greenfox.energy/vixen-care-plan | |
| https://greenfox.energy/privacy | |
| https://greenfox.energy/terms | |
| https://greenfox.energy/areas/edinburgh | |
| https://greenfox.energy/areas/glasgow | |
| https://greenfox.energy/areas/aberdeen | |
| https://greenfox.energy/areas/dundee | |
| https://greenfox.energy/areas/perth | |

- **No direct new equivalent?** Redirect to the closest page (e.g. old “Services” → `/solar-services`) or to the homepage `/`.
- **Old URLs with query strings or multiple paths?** List each pattern and map to one new URL; the redirect layer (Step 3) will need to handle them (e.g. “any path under /blog → /”).

---

## Step 2: Implement 301 redirects (cutover day)

- **301 = permanent redirect.** It tells search engines and browsers “this URL has permanently moved to this new URL.” Link equity passes to the new URL.
- **Where to implement:** On the **old** site’s host (e.g. .htaccess on Apache, config on Nginx, or redirect rules in the old host’s control panel). If the old site is being retired, the domain often points to the new host and redirects are done there (e.g. Vercel redirects in `vercel.json` for the old domain, or Netlify/Cloudflare rules).
- **Catch-all:** Add a final rule: any old URL not in the map → `https://greenfox.energy/` (or `/404` if you prefer), so nothing 404s.

**Example (Vercel):** If you point the **old domain** at Vercel and use `vercel.json` to redirect that host:

```json
{
  "redirects": [
    { "source": "/old-page", "destination": "https://greenfox.energy/solar-services", "permanent": true },
    { "source": "/:path*", "destination": "https://greenfox.energy/:path*", "permanent": true }
  ]
}
```

(Adjust `source`/`destination` to match your actual redirect map.)

---

## Step 3: DNS / domain cutover

- **If greenfox.energy is already the main domain:** Ensure the old domain (if it still exists) 301-redirects **all** traffic to greenfox.energy using the map above.
- **If you’re switching the main domain to greenfox.energy:** Point DNS for the primary domain to Vercel (or wherever the new site lives) and keep the old domain redirecting to greenfox.energy for at least 6–12 months so links and search results update.

---

## Step 4: Old site after cutover

- **Do not leave the old site indexable.** Once redirects are live:
  - Add a **noindex** to the old site’s `<head>` (if any requests still hit it), or
  - Serve a **robots.txt** on the old host that disallows all: `User-agent: *` / `Disallow: /`
  - So search engines stop treating the old URLs as competing content.

---

## Step 5: Search Console & monitoring

- **Google Search Console:** Add and verify **greenfox.energy** (if not already). Submit the new sitemap: `https://greenfox.energy/sitemap.xml`. If the old domain is still in GSC, keep the property and use it to check “Coverage” / “URL Inspection” for redirects and indexing of new URLs.
- **Bing Webmaster Tools:** Same for greenfox.energy; submit sitemap.
- **Monitor (first 2–4 weeks):** Search Console for indexing of new URLs, drop in crawl errors, and that traffic/impressions move to greenfox.energy. Check analytics to confirm referral and direct traffic land on the new site.

---

## Step 6: Internal links and external references

- **Internal links:** This codebase already uses greenfox.energy in canonicals and internal links; no change needed if the live site is greenfox.energy.
- **External:** Update key profiles (Google Business Profile, directories, social, ads) to point to greenfox.energy URLs. No technical change in the repo, but part of the migration checklist.

---

## Summary

| Item | Action |
|------|--------|
| **Migration plan** | This document — use it and keep the redirect map up to date. |
| **Risk of two sites live** | High — duplicate content, split equity, confusion. Minimise overlap; cut over with 301s. |
| **Before cutover** | List all old URLs, build redirect map, decide where redirects are implemented (old host vs new). |
| **Cutover** | 301 from every old URL to the correct new URL on greenfox.energy; catch-all to homepage (or 404). |
| **After cutover** | Old site noindex or robots.txt Disallow; verify new site in Search Console/Bing; submit sitemap; monitor. |

If you want, the next step is to **fill in the “Old URL” column** in the redirect map (Step 1) using a list of URLs from the current/old site (e.g. from GSC or a crawl), then implement the redirects and do the cutover in one go.
