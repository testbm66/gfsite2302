# Supabase Pricing Integration — Design Document

## Goal

Produce **as accurate as possible indicative quotes** in the funnel, using the pricing model from the spreadsheet. All funnel quotes are **prerequisite/indicative** — finalised quotes are sent later via email after survey.

---

## What We Know vs What We Don't

### Funnel inputs (what we have)

| Input | Source | Use for pricing |
|-------|--------|-----------------|
| Panel count | Package configurator (4–14) | Direct: panels × unit cost |
| Battery type + qty | Duracell, Sigenergy, Tesla | Battery materials + mounting |
| Add-ons | EV Charger, Backup Gateway, Solar Diverter | Flat add-on prices |
| Home size | 2 bed / 3–4 bed / 5+ bed / Not sure | **Tier selection** (Lower/Mid/Upper) |
| Property type | Detached, semi, terraced, etc. | Could affect scaffolding (future) |
| Commercial | Yes/No | Could affect labour/overheads (future) |

### What we don't have (limits accuracy)

- Roof size / complexity
- Storey height (scaffolding)
- Exact inverter size
- DNO region
- Survey findings

So we **approximate** using the data we have. The spreadsheet gives us the cost structure; we apply it with sensible defaults.

---

## Tier Selection Logic

The spreadsheet has **Upper**, **Mid**, **Lower** price bands. We need a rule to pick one.

**Proposed mapping from `home_size`:**

| Home size (funnel) | Tier | Rationale |
|-------------------|------|-----------|
| 2 Bedroom House | Lower | Smaller system, simpler install |
| 3–4 Bedroom House | Mid | Most common |
| 5+ Bedroom House | Upper | Larger system, more complexity |
| Not sure | Mid | Safe default |

This can be overridden in Supabase (e.g. a `default_tier` setting) if Eddie wants a different rule.

---

## Pricing Formula (from spreadsheet)

### 1. Solar materials (per panel system)

```
panel_unit = panels_price + inverter + mounting_kit + tails_glands + ct + comms
solar_materials = panel_unit × panel_count
```

From spreadsheet (per unit, Mid tier): 77 + 1400 + 800 + 250 + 50 + 50 = **2627** per panel.  
(Spreadsheet total 2727 suggests a small rounding or the inverter might be per system not per panel — we'll model it as per system.)

**Refined model:** Inverter, mounting, tails, CT, comms are **per system** (once per install). Panels are **per unit**.

```
solar_materials = (panel_price × panel_count) + inverter + mounting_kit + tails_glands + ct + comms
```

From spreadsheet row 11: 3266, 2727, 2105 = total **per panel** (so it's all bundled per panel). So:

```
solar_materials = panel_unit_price × panel_count
```

Where `panel_unit_price` = 91/77/70 (Upper/Mid/Lower) for panels only, but the spreadsheet shows 3266/2727/2105 as the full "per unit" — that's the all-in cost per panel including inverter, mounting, etc. So it's:

```
solar_materials = full_panel_unit_price × panel_count
```

With full_panel_unit = 3266 (Upper), 2727 (Mid), 2105 (Lower).

### 2. Battery

```
battery_cost = battery_base_price + (bat_mounting_kit × qty)
```

For extra batteries (qty > 1): additional units at 80% of base (per spreadsheet -0.2 = 20% discount).

```
battery_cost = (battery_base × 1) + (battery_base × 0.8 × (qty - 1)) + (bat_mounting_kit × qty)
```

Battery base by type:
- Tesla 13.5: 6300 (Upper)
- Sig 10: 3041 (Mid)
- Duracell 5: 1820 (Lower)

### 3. Scaffolding

Single value per tier: 1200 / 1000 / 800 (Standard).

### 4. Labour

```
labour = roofing + electrical - discount
```

Mid: 1250 + 1750 - 450 = 2550

### 5. Overheads

Single value per tier: 760 / 660 / 560.

### 6. Add-ons

Flat: Backup Gateway 950, EV Charger 999, Solar Diverter 650.

### 7. Total

```
total = solar_materials + battery_cost + scaffolding + labour + overheads + addons
```

---

## Supabase Schema (implemented)

**Project:** GreenFoxEnergy's Project (`yefqgbnlsdsvjzpfjtjv`)

### Table: `pricing_tiers`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| tier_key | text | 'upper', 'mid', 'lower' |
| display_name | text | 'Upper', 'Mid', 'Lower' |

### Table: `pricing_solar_materials`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| cost_key | text | 'panel', 'inverter', 'mounting_kit', 'tails_glands', 'ct', 'comms' |
| name | text | Display name |
| tier_key | text | FK to pricing_tiers |
| price | numeric | Price in GBP |
| is_per_panel | boolean | true = multiply by panel count |
| notes | text | e.g. '455W JA Solar' |

### Table: `pricing_batteries`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| product_key | text | 'tesla', 'sigenergy', 'duracell' |
| name | text | Display name |
| tier_key | text | Which tier this battery uses |
| base_price | numeric | Base price |
| mounting_kit_price | numeric | Per unit (default 100) |
| extra_unit_discount | numeric | 0.2 = 20% off extra units |
| notes | text | Optional |

### Table: `pricing_installation`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| cost_key | text | 'scaffolding_standard', 'labour_roofing', 'labour_electrical', 'labour_discount' |
| name | text | Display name |
| tier_key | text | FK to pricing_tiers |
| price | numeric | GBP |
| notes | text | Optional |

### Table: `pricing_overheads`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| cost_key | text | 'acquisition', 'shipping', 'payment_processing', 'dno_admin', 'insurances', 'commission', 'total' |
| name | text | Display name |
| tier_key | text | FK to pricing_tiers |
| price | numeric | GBP |

### Table: `pricing_addons`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| product_key | text | 'ev-charger', 'backup-gateway', 'solo-diverter' |
| name | text | Display name |
| price | numeric | Flat price (no tier) |
| notes | text | Optional |

All tables have RLS enabled with a public read policy for anon (pricing data is not sensitive).

---

## Calculation Flow

1. **Fetch all pricing** from Supabase via `/api/pricing`.
2. **Determine tier** from `formData.home_size` (small→lower, medium→mid, large→upper, unsure→mid).
3. **Solar materials:** `panel_unit_price[tier] × panel_count`
4. **Battery:** Look up battery by product_key, get base + mounting; apply extra-unit discount if qty > 1.
5. **Scaffolding:** `scaffolding_standard[tier]`
6. **Labour:** `roofing[tier] + electrical[tier] - discount[tier]`
7. **Overheads:** `overheads_total[tier]`
8. **Add-ons:** Sum of selected addon prices.
9. **Total:** Sum of above.

---

## API Design

### `GET /api/pricing`

Returns JSON:

```json
{
  "tiers": ["upper", "mid", "lower"],
  "solar_materials": {
    "panel_unit": { "upper": 3266, "mid": 2727, "lower": 2105 }
  },
  "batteries": {
    "tesla": { "tier": "upper", "base_price": 6300, "mounting": 100, "extra_discount": 0.2 },
    "sigenergy": { "tier": "mid", "base_price": 3041, "mounting": 100, "extra_discount": 0.2 },
    "duracell": { "tier": "lower", "base_price": 1820, "mounting": 100, "extra_discount": 0.2 }
  },
  "installation": {
    "scaffolding_standard": { "upper": 1200, "mid": 1000, "lower": 800 },
    "labour_roofing": { "upper": 1500, "mid": 1250, "lower": 1000 },
    "labour_electrical": { "upper": 2000, "mid": 1750, "lower": 1500 },
    "labour_discount": { "upper": 525, "mid": 450, "lower": 375 }
  },
  "overheads": { "upper": 760, "mid": 660, "lower": 560 },
  "addons": {
    "ev-charger": 999,
    "backup-gateway": 950,
    "solo-diverter": 650
  }
}
```

### Frontend calculation

`quote.js` gets this on load (or when package step is shown), then `calcPackageTotal()` uses the fetched data instead of hardcoded `PRICING`. Fallback to current hardcoded values if API fails.

---

## Limitations (what we can't nail)

- **Scaffolding** — We don't know storey height; we use "standard".
- **Labour** — We don't know roof complexity; we use tier-based averages.
- **Inverter sizing** — Spreadsheet assumes one inverter per system; we don't vary by panel count.
- **VAT** — Spreadsheet says zero-rated for residential; we assume 0% for home, could add for commercial later.
- **Radio campaign 15%** — Not in funnel; could add as a promo code later.

---

## Supabase Connection (for Vercel API)

Add these to Vercel environment variables:

- `SUPABASE_URL` = `https://yefqgbnlsdsvjzpfjtjv.supabase.co`
- `SUPABASE_ANON_KEY` = (anon key from Supabase Dashboard > Settings > API)

The anon key is safe for server-side use with RLS (read-only policies).

---

## Next Steps

1. ~~Create Supabase tables and seed with spreadsheet data.~~ **Done**
2. ~~Build Vercel `/api/pricing` function.~~ **Done** — `api/pricing.js`
3. ~~Update `quote.js` to fetch pricing, implement tier selection, and use dynamic calculation.~~ **Done**
4. ~~Add `home_size` → tier mapping.~~ **Done** — `getTierFromHomeSize()` (small→lower, medium→mid, large→upper, unsure→mid)
5. Test with real scenarios and compare to spreadsheet totals.
