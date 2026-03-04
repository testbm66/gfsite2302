# SEO Recommendations — GreenFox Energy

Quick reference for what’s in place and what you can do next to improve search performance.

---

## What’s already in place (and recently improved)

- **Titles & meta descriptions** — Unique per page, with location/service keywords (e.g. “Solar Panels Edinburgh”, “Battery Storage”).
- **Canonical URLs** — Every page has a canonical; they now use **clean URLs** (no `.html`) to match the sitemap and Vercel (e.g. `https://greenfox.energy/quote`).
- **Open Graph & Twitter** — `og:title`, `og:description`, `og:url`, `og:type`; **og:image** and **twitter:image** added on homepage, quote, and contact so shares show a preview image.
- **Sitemap** — `sitemap.xml` lists all important URLs (clean); **battery-storage**, **ev-charger**, and **partners** added.
- **robots.txt** — Allows all, points to sitemap.
- **404** — Custom page with `noindex` so it isn’t indexed.
- **Structured data** — Homepage: `LocalBusiness` (name, phone, email, address, area served, aggregateRating). Solar Health-Check: `FAQPage` for common questions.
- **Semantic HTML** — Single `<h1>` per page, clear heading hierarchy.

---

## Changes made (March 2026)

1. **Sitemap** — Added `/battery-storage`, `/ev-charger`, `/partners`; set `lastmod` for new entries.
2. **Social previews** — Added `og:image` and `twitter:image` (currently `GFPhoneLanding.png`) on index, quote, contact; `twitter:card` set to `summary_large_image` where relevant.
3. **Canonicals & og:url** — All pages now use clean URLs (no `.html`) for both; added missing `og:url` on contact, terms, privacy, and all five area pages.

---

## What you can do next (priority order)

### 1. Dedicated social share image (high impact)

- **Current:** Shared links use `assets/img/GFPhoneLanding.png` (may not be ideal ratio/size).
- **Ideal:** One image per section (or one site-wide) at **1200×630 px** (e.g. logo + tagline, or hero crop), saved as PNG or JPG.
- **Action:** Create e.g. `assets/img/og-default.jpg` (1200×630), then replace `og:image` and `twitter:image` URLs in the HTML with `https://greenfox.energy/assets/img/og-default.jpg`. Optionally add a different image for quote vs homepage.

### 2. Google Search Console & Bing Webmaster Tools

- **Action:** Add the property for `https://greenfox.energy`, verify (HTML tag or DNS), then submit `sitemap.xml`.
- **Why:** Lets you see indexing status, search queries, and crawl errors.

### 3. More structured data (medium impact)

- **Service/area pages** — Add `LocalBusiness` or `Service` JSON-LD on key pages (e.g. solar-services, battery-storage, ev-charger, one area page as a template) with name, description, areaServed, url.
- **Breadcrumbs** — Add `BreadcrumbList` on area and service pages (e.g. Home > Areas > Edinburgh) so Google can show breadcrumbs in results.
- **How-to / FAQ** — If you add clear “How we install” or FAQ sections, add `HowTo` or `FAQPage` schema where it fits.

### 4. Content and keywords

- **Location pages** — Ensure each area page has a clear, unique intro (what you do there, why local customers choose you), 300–500+ words, and terms like “solar panels [town]”, “solar installer Edinburgh”, etc.
- **Blog or guides** — A small “Solar guide” or “FAQs” section with useful, keyword-rich content (e.g. “Cost of solar panels in Scotland”, “How long do solar panels last”) can help rankings and link-sharing.
- **Internal links** — Link from homepage and services to area pages and to the quote page with descriptive anchor text (e.g. “Get a free quote”, “Solar in Edinburgh”).

### 5. Performance and Core Web Vitals

- **Images** — Use responsive images (`srcset`/`sizes`) and modern formats (WebP) where possible; keep hero images under ~200 KB.
- **Fonts** — You already use `preconnect` for Google Fonts; consider `font-display: swap` (or the same via the Fonts URL) to avoid blocking text.
- **LCP** — Largest contentful paint is often the hero image; lazy-load below-the-fold images and keep the hero image optimized.

### 6. Local SEO

- **Google Business Profile** — Keep name, address, phone, hours, and category accurate; add photos and short posts; encourage reviews (they can feed into your Trustpilot/rating).
- **NAP consistency** — Use the same business name, phone (0330 133 8165), and address (or “Scotland” if no single address) in schema and on the site.
- **LocalBusiness schema** — You already have it on the homepage; if you add a full street address, add it to the schema so it matches your GBP listing.

### 7. Minor technical checks

- **HTTPS** — Ensure the whole site is served over HTTPS (Vercel does this by default).
- **Mobile-friendly** — Test with [Google’s Mobile-Friendly Test](https://search.google.com/test/mobile-friendly); fix any issues reported.
- **Sitemap lastmod** — When you change key pages, update the corresponding `<lastmod>` in `sitemap.xml` (optional but helps crawlers).

---

## File reference (for future edits)

| What | Where |
|------|--------|
| Sitemap | `sitemap.xml` (root) |
| robots | `robots.txt` (root) |
| Canonical + og/twitter | `<head>` of each `.html` page |
| LocalBusiness schema | `index.html` (inline JSON-LD) |
| FAQPage schema | `solar-healthcheck.html` (inline JSON-LD) |

---

## Summary

- **Done:** Clean canonicals, full sitemap, social images on main pages, basic schema, unique titles/descriptions.
- **Next:** Add a proper 1200×630 share image, verify in Search Console and Bing, then add more schema (breadcrumbs, service/area pages) and strengthen area-page content and internal links.
