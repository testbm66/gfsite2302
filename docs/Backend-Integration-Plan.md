# Backend Integration: HubSpot + Supabase + Mapbox + Vercel

Step-by-step plan to connect HubSpot (lead capture), Supabase (pricing database), Mapbox (postcode map), and Vercel (hosting + serverless functions).

## Architecture

```
[User's Browser]
  - Quote Funnel (quote.js)  -->  HubSpot Forms API (lead capture)     -->  HubSpot Contacts
  - Quote Funnel (quote.js)  -->  /api/pricing (Vercel Function)       -->  Supabase (pricing DB)
  - HubSpot Tracking Script  -->  HubSpot Analytics
  - Mapbox Satellite Map     -->  Mapbox Geocoding API + Tiles
```

## Current status

| Item | Status |
|------|--------|
| Domain placeholders (YOURDOMAIN.COM) | **Done** — replaced with greenfox.energy |
| Social links (Facebook, LinkedIn) | **Done** — Instagram removed (no account) |
| HubSpot Portal ID | **Done** — 143575537 plugged into code |
| Mapbox account | **Created** — awaiting token |
| Supabase account | **Created** — awaiting project setup |
| HubSpot Form + properties | Pending — Phase 1 |
| Supabase pricing tables | Pending — Phase 4 |
| Mobile responsiveness | Pending — after Mapbox, before HubSpot |

---

## Order of operations

1. **Phase 1** — Mapbox: plug token into code (awaiting token from Eddie)
2. **Phase 2** — Mobile responsiveness pass across all pages
3. **Phase 3** — HubSpot lead capture: create properties + form, plug Form GUID into code
4. **Phase 4** — Supabase pricing database: build tables, Vercel function, connect to funnel

Phases 1 and 2 can be done in parallel. Phase 4 is independent of Phase 3.

---

## Phase 1: Mapbox (postcode satellite map)

### Step 1.1: Get the token

Eddie has created a Mapbox account. Next:

1. Log in to mapbox.com
2. Copy the **Default public token** from the dashboard (starts with `pk.eyJ1...`)
3. Go to **Tokens** > click the token > **Edit**
4. Under **URL restrictions**, add:
   - `greenfox.energy`
   - Your Vercel preview domain
5. Save

### Step 1.2: Plug the token into the code

It goes into `assets/js/quote.js` — the `MAPBOX_CONFIG` object (line 22).

### Step 1.3: Test it

1. Go through the funnel to the postcode step
2. Enter a real Scottish postcode (e.g. EH1 1BB)
3. The satellite map should load, centred on that postcode
4. You should be able to drag the pin to mark the property

---

## Phase 2: Mobile responsiveness

Full responsive pass across all pages, especially the quote funnel. This should be done before HubSpot integration so the funnel is polished before it starts capturing real leads.

---

## Phase 3: HubSpot Lead Capture

This is the core integration. When someone finishes the funnel, their data goes to HubSpot.

### Step 3.1: Confirm HubSpot plan

The funnel sends 16 custom contact properties. The free plan only allows 10 custom properties total. **Starter plan or above is required.**

### Step 3.2: Get the Portal ID

Already done — `143575537` is plugged into the code.

### Step 3.3: Create custom contact properties

Go to **Settings > Data Management > Properties > Contact properties**. Click "Create property" for each one below.

These are the **exact internal names** the code sends. If even one is misspelt, that field will be silently dropped. All types must be **Single-line text** (the code sends everything as strings).

**Group: "Quiz Answers"** (create a new group called "Quiz Answers" for organisation)

| Label                    | Internal name              | Type             | Notes                                                                |
| ------------------------ | -------------------------- | ---------------- | -------------------------------------------------------------------- |
| Solar Status             | solar_status               | Single-line text | "Not yet", "Yes - working well", "Yes - unsure if working"          |
| Property Location        | property_location          | Single-line text | "Home", "Business"                                                   |
| Property Type            | property_type              | Single-line text | "Detached", "Semi-detached", "Terraced", etc.                       |
| System Size Interest     | system_size_interest       | Single-line text | "2 Bedroom House", "3-4 Bedroom House", "5+ Bedroom House", "Not sure" |
| Battery Interest         | battery_interest           | Single-line text | "Yes", "Maybe", "No"                                                |
| Solar Timeline           | solar_timeline             | Single-line text | "ASAP", "1-3 months", "3-6 months", "Just exploring"               |
| Support Type Needed      | support_type_needed        | Single-line text | Only sent for existing solar owners                                  |
| Monthly Electricity Bill | monthly_electricity_bill   | Single-line text | e.g. "85"                                                           |
| Lead Source Page         | lead_source_page           | Single-line text | Auto-set to "Solar Quote Funnel" or "Solar Health-Check Funnel"     |

**Group: "Package Details"** (create a new group)

| Label                   | Internal name             | Type             | Notes                                           |
| ----------------------- | ------------------------- | ---------------- | ----------------------------------------------- |
| Package Panels          | package_panels            | Single-line text | Number of panels selected                       |
| Package Battery         | package_battery           | Single-line text | e.g. "1x Duracell 5 kWh"                        |
| Package Add-ons         | package_addons            | Single-line text | e.g. "ev-charger, backup-gateway"               |
| Package Total Price     | package_total_price       | Single-line text | e.g. "8500"                                     |
| Submission Type         | payment_status            | Single-line text | "quote_requested" or "callback_requested"       |
| Preferred Callback Time | preferred_callback_time   | Single-line text | "morning", "afternoon", "evening", or "anytime" |

**Group: "Installation Location"** (create a new group)

| Label             | Internal name       | Type             | Notes            |
| ----------------- | ------------------- | ---------------- | ---------------- |
| Install Latitude  | install_latitude    | Single-line text | e.g. "55.953251" |
| Install Longitude | install_longitude   | Single-line text | e.g. "-3.188267" |

**Standard properties** that already exist in HubSpot (no action needed):
- firstname, lastname, email, phone, zip (postcode), message (notes)

**Removed**: `deposit_amount` — no longer sent (deposits are disabled).

### Step 3.4: Create a HubSpot Form

1. Go to **Marketing > Lead Capture > Forms**
2. Click **Create form > Embedded form**
3. Name it **"Solar Quote Funnel"**
4. You don't need to add visible fields (the funnel IS the form). But you MUST:
   - Click **Fields** in the form editor
   - Add every custom property from Step 3.3 as a **hidden field**
   - This tells HubSpot "these fields are allowed on this form" (required since March 2022)
5. Save the form
6. Get the **Form GUID**: click **Share** or **Embed** — in the URL you'll see:
   `https://api.hsforms.com/submissions/v3/integration/submit/PORTAL_ID/FORM_GUID`
   The GUID is the long UUID after the portal ID

### Step 3.5: Plug the Form GUID into the code

It goes into `assets/js/quote.js` — the `HUBSPOT_CONFIG` object.

### Step 3.6: Test it

1. Open the funnel on the Vercel site
2. Fill out the entire quiz with test data
3. Click "Get My Free Quote"
4. In HubSpot > **Contacts** — verify the new contact has ALL custom fields populated
5. Also check **Marketing > Forms > Solar Quote Funnel** — verify the submission is listed
6. Test again with "Speak to Someone" — verify `payment_status` = "callback_requested" and `preferred_callback_time` is set

### Step 3.7: Set up the subscription type (optional)

The code uses `subscriptionTypeId: 999` as a placeholder for marketing email consent. To fix:
1. Go to **Settings > Marketing > Email > Subscription types**
2. Find your marketing subscription type and note its ID
3. Update the value in `assets/js/quote.js`

---

## Phase 4: Dynamic Pricing via Supabase

### The goal

Allow anyone at the company to update pricing from the Supabase dashboard (a spreadsheet-like table editor) — no code changes, no deployments needed. The website pulls the latest prices automatically.

This goes beyond simple product prices. The pricing database will also hold installation costs, labour rates, scaffolding charges, and other variable costs that affect the final quote.

### Architecture: Supabase + Vercel

```
[Supabase Dashboard]          [Vercel]                  [Browser]
 Team edits prices      →    /api/pricing function    →  Quote funnel JS
 (table UI, like a           (reads from Supabase,       (renders prices)
  spreadsheet)                anon key stays in env)
```

### Why Supabase instead of HubSpot Products

HubSpot Products is designed for commerce workflows (quotes, deals, invoicing). Using it purely as a pricing database is the wrong tool for the job and could cause confusion if you later use Products for actual invoicing.

Supabase is a purpose-built database with:
- A table editor that looks like a spreadsheet (non-technical friendly)
- Instant REST API — no custom endpoints needed
- Row Level Security for public read-only access
- Free tier: 500MB storage, 50,000 API requests/month

### Table design

**`products` table** — panels, batteries, add-ons:

| Column | Type | Example |
|--------|------|---------|
| id | uuid (auto) | |
| product_key | text | "panel-unit" |
| name | text | "Solar Panel (per unit)" |
| price | numeric | 400 |
| product_type | text | "panel" / "battery" / "addon" / "included" |
| description | text | "455W panel" |

**`installation_costs` table** — labour, scaffolding, etc.:

| Column | Type | Example |
|--------|------|---------|
| id | uuid (auto) | |
| cost_key | text | "scaffolding-standard" |
| name | text | "Standard Scaffolding" |
| price | numeric | 350 |
| category | text | "installation" / "labour" / "survey" |
| description | text | "Standard 2-storey scaffolding hire" |

The exact schema for `installation_costs` will be finalised when we build this out — it depends on how GreenFox structures their quoting internally.

### Setup steps (when ready to implement)

1. **Create a Supabase project** (Eddie has already created an account)
2. **Create the tables** using the SQL editor or table UI
3. **Populate the data** (initial product prices + installation costs)
4. **Set up Row Level Security** — enable RLS with a public read-only policy
5. **Add Supabase credentials to Vercel** as environment variables:
   - `SUPABASE_URL` — the project URL
   - `SUPABASE_ANON_KEY` — the public anon key (safe for read-only)
6. **Create the Vercel function** (`api/pricing.js`) that reads from Supabase
7. **Update `quote.js`** to fetch from `/api/pricing` on load, with hardcoded values as fallback

### Cost

- **Supabase free tier**: 500MB storage, 50K API requests/month. More than sufficient.
- **Vercel free tier**: 100K serverless function invocations/month.
- **Total: £0/month.**
