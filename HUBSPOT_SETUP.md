# HubSpot integration – GreenFox Energy

Your quote funnel (`quote.html`) is already wired to send survey data to HubSpot. Follow these steps to connect your account.

---

## 1. Get your HubSpot Portal ID

1. Log in to **HubSpot**.
2. Click the **settings** (gear) icon in the top right.
3. In the left sidebar, go to **Account & Billing** (or **Account Setup**).
4. Your **Portal ID** is shown there (e.g. `12345678`).  
   You can also see it in the tracking script: `//js.hs-scripts.com/12345678.js` (the number is your Portal ID).

---

## 2. Create custom contact properties (for quiz answers)

So that quiz answers (solar status, property type, timeline, etc.) are stored on contacts:

1. In HubSpot: **Settings** → **Properties** → **Contact properties**.
2. Click **Create property** and add each of these (Internal name must match exactly):

| Label (display name)     | Internal name           | Type   |
|--------------------------|-------------------------|--------|
| Solar status             | `solar_status`          | Dropdown (or Single-line text) |
| Property location        | `property_location`     | Dropdown or Text |
| Property type            | `property_type`         | Dropdown or Text |
| System size interest     | `system_size_interest`  | Dropdown or Text |
| Battery interest         | `battery_interest`      | Dropdown or Text |
| Solar timeline           | `solar_timeline`        | Dropdown or Text |
| Support type needed      | `support_type_needed`   | Dropdown or Text |
| Monthly electricity bill | `monthly_electricity_bill` | Single-line text |
| Lead source page         | `lead_source_page`      | Single-line text |

**Note:** Standard properties `firstname`, `lastname`, `email`, `phone`, `zip` already exist. The funnel also sends `message` (notes).

---

## 3. Create a form in HubSpot

1. Go to **Marketing** → **Lead Capture** → **Forms**.
2. Click **Create form** → **Embedded** (we only use the form’s ID; the form itself is our quiz).
3. Name it e.g. **“Solar Quote Funnel”**.
4. Add fields that match what we send (so HubSpot accepts them):
   - First name, Last name, Email, Phone number (standard).
   - Optionally add the custom properties above as **hidden** fields so they appear in the form definition (some setups require this).
5. Save the form.
6. Get the **Form GUID**:
   - Open the form → **Share** or **Options** → **Embed code**.
   - In the embed URL you’ll see something like:  
     `https://api.hsforms.com/submissions/v3/integration/submit/PORTAL_ID/FORM_GUID`  
     The **Form GUID** is the long string like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

---

## 4. Add your IDs to the website

1. Open **`assets/js/quote.js`**.
2. Find the `HUBSPOT_CONFIG` block at the top (around lines 11–15).
3. Replace the placeholders:

```javascript
const HUBSPOT_CONFIG = {
  portalId: 'YOUR_ACTUAL_PORTAL_ID',   // e.g. '12345678'
  formGuid: 'YOUR_ACTUAL_FORM_GUID'    // e.g. 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
};
```

4. In **`quote.html`** and **`index.html`**, find the HubSpot tracking script:

```html
<script ... src="//js.hs-scripts.com/YOUR_PORTAL_ID.js"></script>
```

Replace `YOUR_PORTAL_ID` with the same Portal ID (e.g. `12345678`).

Save the files and redeploy your site. Submissions from the quote funnel will create/update contacts and store all quiz answers in HubSpot.

---

## What gets sent to HubSpot

On “Get My Free Quote”, the funnel sends:

- **Contact:** First name, Last name, Email, Phone, Postcode (as `zip`), Notes (as `message`).
- **Quiz:** Solar status, Property location, Property type, System size, Monthly electricity bill (if calculator used), Battery interest, Timeline, Support type (if existing solar).
- **Context:** “Lead source page” = “Solar Quote Funnel”, plus page URL and consent.

You can use these properties in **workflows**, **lists**, **reports**, and **emails** (e.g. auto-reply or assign to sales).

---

## Optional: subscription type for marketing emails

If you use HubSpot’s subscription types for email consent, set the correct `subscriptionTypeId` in `quote.js` (inside `submitToHubSpot`, in `legalConsentOptions.communications`). In HubSpot: **Settings** → **Marketing** → **Email** → **Subscription types** to find the ID. If you don’t use this, the default in the code is fine.

---

## Troubleshooting

- **Submissions don’t appear:** Check that Portal ID and Form GUID are correct and that the form in HubSpot includes (or allows) the fields we send.
- **Custom fields missing:** Ensure the contact properties exist and that internal names match the table above (and `quote.js` mapping).
- **Test:** Submit a test quote and look in **Contacts** for the new contact and in **Marketing** → **Forms** for the submission.
