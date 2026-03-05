# Quote Funnel & HubSpot Integration — Technical Documentation

A complete technical reference for how the GreenFox Energy solar quote funnel works and how it integrates with HubSpot.

---

## Table of Contents

1. [Overview](#overview)
2. [Funnel Architecture](#funnel-architecture)
3. [Step Flow & Logic](#step-flow--logic)
4. [Data Collection](#data-collection)
5. [HubSpot Integration](#hubspot-integration)
6. [Field Mapping Reference](#field-mapping-reference)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The quote funnel is a multi-step quiz that:

1. Asks qualifying questions (location, property type, system size, battery interest, timeline)
2. Collects contact details (name, email, phone, postcode)
3. Shows a package configurator (panels, batteries, add-ons) with a Mapbox satellite map for installation location
4. Displays an order summary with two actions: **Get My Free Quote** or **Speak to Someone**
5. Submits all data to HubSpot via the Forms API v3

**Key files:**

- `quote.html` — Funnel UI and step markup
- `assets/js/quote.js` — All funnel logic, data collection, HubSpot submission
- `assets/css/quote-styles.css` — Funnel styling

---

## Funnel Architecture

### Step Structure

Each step is a `<div class="quiz-step" data-step="ID">`. Steps are shown/hidden by adding/removing the `is-active` class. Only one step is active at a time.

### Progress Bar

The progress bar has four labels: **Your Home**, **System**, **Details**, **Your Quote**. These map to step ranges:

| Label      | Steps                                      |
|-----------|---------------------------------------------|
| Your Home | 2, 3, 3b                                    |
| System    | 4, 4b, 5, 6                                 |
| Details   | 8, 9                                        |
| Your Quote| calculating, package, order-summary         |

### State

- `formData` — Object holding all quiz answers and contact details. Persists across steps.
- `packageState` — Object holding package configurator choices (panels, batteries, add-ons).
- `currentStepIndex` — Index into the current flow array.
- `stepHistory` — Stack of step indices for back-button navigation.

---

## Step Flow & Logic

### Default Flow (Residential)

```
2 → 3 → 4 → 5 → 6 → 8 → 9 → calculating → package → order-summary
```

| Step ID        | Question / Action                                                                 |
|----------------|------------------------------------------------------------------------------------|
| 2              | Where would you like solar? (Home / Workplace)                                     |
| 3              | What type of property? (Detached, Semi-detached, Terraced, Bungalow, Flat, Other) |
| 4              | How big a system? (2 Bed / 3–4 Bed / 5+ Bed / Not sure)                           |
| 4b             | *Conditional* — Energy bill calculator (only if "Not sure" selected)              |
| 5              | Battery interest? (Yes / Maybe / No)                                              |
| 6              | When to go solar? (ASAP / 1–3 months / 3–6 months / Just exploring)                |
| 8              | Postcode                                                                           |
| 9              | Contact details (first name, last name, email, phone, notes, consent)             |
| calculating    | Transition screen ("Calculating your perfect system…")                             |
| package        | Package configurator + Mapbox map                                                  |
| order-summary  | Review package, choose "Get My Free Quote" or "Speak to Someone"                   |

### Business Flow

If user selects **Workplace** on step 2:

```
2 → 3b → 4 → 5 → 6 → 8 → 9 → calculating → package → order-summary
```

Step **3b** asks: "What type of business premises?" (Office, Warehouse, Retail, Farm/Agricultural).

### Conditional Step 4b

If user selects **Not sure** on step 4, step **4b** is inserted after step 4. The user enters their monthly electricity bill (£) and clicks "Calculate My System Size". The calculator estimates panels based on:

- `ratePerKwh` = 0.28
- `panelOutputPerYear` = 350 kWh per panel
- `selfConsumptionRate` = 0.50
- `exportRate` = 0.15

The result sets `calculatedSystemSize` and `formData.monthlyBill`.

### Hidden Steps

- **Step 1** (Solar status) — Hidden (`display: none`). `formData.solarStatus` defaults to `'not-yet'`.
- **Step 7** (Support type for existing solar owners) — Never reached because step 1 is hidden.

---

## Data Collection

### collectStepData()

Runs when the user advances from a step (e.g. clicks "Continue" or submits step 9). It reads only from the **current** step:

- **Radio buttons** — `formData[radio.name] = radio.value`
- **Text inputs / textareas** — `formData[input.name] = input.value.trim()` (only if non-empty)
- **Checkboxes** — `formData[checkbox.name] = checkbox.checked`

### collectContactData()

Runs immediately before HubSpot submission when the user clicks "Get My Free Quote" or "Request Callback". It re-reads all inputs from **step 9** (contact form) to ensure phone, name, email, etc. are captured even if they were entered earlier and the user navigated away and back.

### collectPackageData()

Runs before HubSpot submission. Populates:

- `formData._packagePanels` — Number of panels
- `formData._packageBattery` — e.g. "1x Duracell 5 kWh" or "None"
- `formData._packageAddons` — e.g. "ev-charger, backup-gateway"
- `formData._packageTotal` — Total price from `calcPackageTotal()`

### Map Pin (install_latitude / install_longitude)

On the package step, a Mapbox map is shown. The user can drag a pin. On drag end, `formData.installLat` and `formData.installLng` are set from the pin's coordinates. If Mapbox is not configured, these may remain unset.

---

## HubSpot Integration

### API Endpoint

```
POST https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}
```

- **portalId:** `143575537`
- **formGuid:** `81021992-c352-46a7-83c9-7729dda910da` (from HubSpot form embed code)

### Request Payload

```json
{
  "fields": [ { "objectTypeId": "0-1", "name": "firstname", "value": "..." }, ... ],
  "context": {
    "pageUri": "https://greenfox.energy/quote",
    "pageName": "Free Solar Quote | GreenFox Energy",
    "hutk": "<hubspotutk cookie if present>"
  },
  "legalConsentOptions": {
    "consent": {
      "consentToProcess": true,
      "text": "I agree to allow GreenFox Energy to store and process my personal data."
    }
  }
}
```

- `objectTypeId: "0-1"` — Contact object in HubSpot
- `hutk` — HubSpot tracking cookie, passed when available for attribution

### Submission Triggers

1. **Get My Free Quote** (order-summary) — `collectContactData()` → `collectPackageData()` → `doHubSpotSubmit('quote_requested')`
2. **Request Callback** (order-summary) — Same, plus `formData._callbackTime` from dropdown, then `doHubSpotSubmit('callback_requested')`

### Response Handling

- **200 OK** — `showSuccess()` (or redirect to vixen-care-plan for existing solar owners)
- **Non-200** — `showSubmitError(errorData)` — Error screen with HubSpot error details in a `<pre>` for debugging

---

## Field Mapping Reference

### Form Data Key → HubSpot Internal Name

| Form key        | HubSpot property      | Notes                                              |
|-----------------|-----------------------|----------------------------------------------------|
| firstName       | firstname             | Default HubSpot                                    |
| lastName        | lastname              | Default HubSpot                                    |
| email           | email                 | Default HubSpot                                    |
| phone           | phone                 | Default HubSpot                                    |
| postcode        | post_code             | Custom (user chose post_code over zip)             |
| notes           | message               | Default HubSpot                                    |
| location        | commercial            | "Yes" (business) or "No" (home)                    |
| propertyType    | property_type         | Detached, Semi-detached, etc.                      |
| systemSize      | home_size             | 2 Bedroom House, 3-4 Bedroom House, etc.           |
| battery         | battery_interested    | Yes, Maybe, No                                    |
| timeline        | purchase_timeline     | ASAP, 1-3 months, 3-6 months, Just exploring      |
| monthlyBill     | monthly_electric_bill | Only if user used calculator (step 4b)             |
| installLat      | install_latitude      | From map pin                                      |
| installLng      | install_longitude     | From map pin                                      |
| _packagePanels  | quoted_panel_count    | Number of panels                                  |
| _packageBattery | quoted_battery        | e.g. "1x Duracell 5 kWh"                          |
| _packageAddons  | quoted_addons         | e.g. "ev-charger, backup-gateway"                 |
| _packageTotal   | quoted_total          | Total price (number)                               |
| _paymentStatus  | enquiry_type          | "quote_requested" or "callback_requested"          |
| _callbackTime   | preferred_callback_time | morning, afternoon, evening, anytime (callback only) |
| (auto)          | lead_source_page      | "Solar Quote Funnel" or "Solar Health-Check Funnel" |

### Value Transformations

Some form values are transformed before sending:

| Form value     | Sent to HubSpot   |
|----------------|-------------------|
| home           | No                |
| business       | Yes               |
| small          | 2 Bedroom House   |
| medium         | 3-4 Bedroom House |
| large          | 5+ Bedroom House  |
| unsure         | Not sure          |
| yes / maybe / no | (unchanged)     |
| asap           | ASAP              |
| 1-3-months     | 1-3 months        |
| 3-6-months     | 3-6 months        |
| just-exploring | Just exploring    |
| detached, semi-detached, etc. | (unchanged) |

### Fields Not Sent

- `consent` — Used for validation only; not sent to HubSpot
- Empty or undefined values — Skipped by `mapToHubSpotFields`

---

## Configuration

### HUBSPOT_CONFIG (quote.js lines 11–14)

```javascript
const HUBSPOT_CONFIG = {
  portalId: '143575537',
  formGuid: '81021992-c352-46a7-83c9-7729dda910da'
};
```

- **Form GUID:** Must come from HubSpot form **embed code** (`formId`), not the share link. Share link IDs can differ from the API form ID.

### MAPBOX_CONFIG (quote.js lines 20–25)

```javascript
const MAPBOX_CONFIG = {
  accessToken: 'YOUR_MAPBOX_TOKEN',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  defaultZoom: 17,
  defaultCenter: [-3.19, 55.95]
};
```

- If token is missing or placeholder, the map shows a fallback message and `installLat`/`installLng` may be unset.

### PRICING (quote.js lines 39–58)

Hardcoded product prices. Future: replace with Supabase-backed dynamic pricing.

---

## HubSpot Form Setup Requirements

The HubSpot form must have **all** fields as **hidden** fields for the API to accept them (required since March 2022):

**Default properties:** firstname, lastname, email, phone, post_code, message

**Custom properties:** commercial, property_type, home_size, battery_interested, purchase_timeline, monthly_electric_bill, lead_source_page, quoted_panel_count, quoted_battery, quoted_addons, quoted_total, enquiry_type, preferred_callback_time, install_latitude, install_longitude

Internal names must match exactly. One typo causes that field to be silently dropped.

---

## Troubleshooting

### Phone number not appearing in HubSpot

- Verify `phone` is a hidden field in the HubSpot form with internal name exactly `phone`
- `collectContactData()` re-reads from step 9 before submit; ensure step 9 inputs exist and have `name="phone"`
- HubSpot may validate phone format; try submitting with digits only (e.g. `07123456789`)

### Form GUID errors

- Use the **embed code** formId, not the share link ID
- Embed code: `hbspt.forms.create({ formId: "..." })` — that UUID is the correct formGuid

### Monthly electricity bill / preferred callback time empty

- **monthly_electric_bill** — Only set when user selects "Not sure" on system size and uses the calculator
- **preferred_callback_time** — Only set when user clicks "Speak to Someone" and selects a time

### Error screen shows HubSpot response

- Check the `<pre class="submit-error__details">` for the exact error JSON
- Common causes: invalid form GUID, field not in form, validation failure on a property

---

## Health-Check Funnel Variant

If the URL has `?type=healthcheck`, `formData._funnelSource` is set to `"Solar Health-Check Funnel"` instead of `"Solar Quote Funnel"`. This allows HubSpot workflows to distinguish the source.
