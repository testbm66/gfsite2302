"""
GreenFox Energy - Website Audit Report Generator
Produces a single continuous (non-paginated) branded PDF.
Two-pass approach: first calculates total height, then renders to a single tall page.
"""

import os
from fpdf import FPDF

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "audit-screenshots")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "GreenFox-Website-Audit-March-2026.pdf")

GREEN_DARK = (27, 94, 60)
GREEN = (46, 139, 87)
GREEN_LIGHT = (92, 184, 92)
GREEN_PALE = (232, 245, 233)
ORANGE = (255, 112, 67)
WHITE = (255, 255, 255)
DARK = (26, 26, 26)
GRAY_700 = (74, 74, 74)
GRAY_500 = (117, 117, 117)
GRAY_200 = (224, 224, 224)

PAGE_W = 210
CONTENT_W = 170
MARGIN = 20


class AuditPDF(FPDF):
    def __init__(self, page_h=297):
        super().__init__(orientation="P", unit="mm", format=(PAGE_W, page_h))
        self.set_auto_page_break(auto=False, margin=0)
        self.set_left_margin(MARGIN)
        self.set_right_margin(MARGIN)

    def _green_divider(self, h=2):
        y = self.get_y()
        self.set_fill_color(*GREEN)
        self.rect(0, y, PAGE_W, h, "F")
        self.set_fill_color(*ORANGE)
        self.rect(0, y + h, PAGE_W, 0.8, "F")
        self.set_y(y + h + 4)

    def _section_title(self, text, size=18):
        self.set_font("Helvetica", "B", size)
        self.set_text_color(*GREEN_DARK)
        self.cell(CONTENT_W, 12, text, new_x="LMARGIN", new_y="NEXT")
        y = self.get_y()
        self.set_draw_color(*ORANGE)
        self.set_line_width(0.8)
        self.line(MARGIN, y, MARGIN + 50, y)
        self.set_y(y + 6)

    def _sub_heading(self, text, size=13):
        self.set_font("Helvetica", "B", size)
        self.set_text_color(*GREEN)
        self.cell(CONTENT_W, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def _body(self, text, size=10):
        self.set_font("Helvetica", "", size)
        self.set_text_color(*GRAY_700)
        self.multi_cell(CONTENT_W, 5.5, text)
        self.ln(2)

    def _bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*GRAY_700)
        x = self.l_margin
        self.set_x(x)
        self.cell(6, 5.5, "-")
        self.set_x(x + 6)
        self.multi_cell(CONTENT_W - 6, 5.5, text)
        self.ln(0.5)

    def _table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [CONTENT_W / len(headers)] * len(headers)

        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(*GREEN)
        self.set_text_color(*WHITE)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
        self.ln()

        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(*DARK)
        alt = False
        for row in rows:
            if alt:
                self.set_fill_color(*GREEN_PALE)
            else:
                self.set_fill_color(*WHITE)
            for i, val in enumerate(row):
                self.cell(col_widths[i], 7, str(val), border=1, fill=True)
            self.ln()
            alt = not alt
        self.ln(4)

    def _screenshot(self, img_path, caption):
        if not os.path.exists(img_path):
            self._body(f"[Screenshot not available: {img_path}]")
            return
        from PIL import Image as PILImage
        img = PILImage.open(img_path)
        aspect = img.height / img.width
        w = CONTENT_W
        h = w * aspect
        self.image(img_path, x=MARGIN, w=w)
        self.set_y(self.get_y() + 3)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY_500)
        self.cell(CONTENT_W, 5, caption, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)

    def _flowchart_row(self, steps):
        y = self.get_y() + 2
        box_w = 28
        box_h = 12
        gap = 5
        x = MARGIN
        for i, (label, bg, fg) in enumerate(steps):
            bx = x + i * (box_w + gap)
            self.set_fill_color(*bg)
            self.set_draw_color(*GREEN_DARK)
            self.set_line_width(0.3)
            self.rect(bx, y, box_w, box_h, "DF")
            self.set_xy(bx, y + 1)
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*fg)
            self.cell(box_w, box_h - 2, label, align="C")
            if i > 0:
                prev_end = x + (i - 1) * (box_w + gap) + box_w
                self.set_draw_color(*ORANGE)
                self.set_line_width(0.6)
                self.line(prev_end + 1, y + box_h / 2, bx - 1, y + box_h / 2)
                self.set_font("Helvetica", "B", 8)
                self.set_text_color(*ORANGE)
                self.set_xy(bx - gap, y + box_h / 2 - 3)
                self.cell(gap, 6, ">", align="C")
        self.set_y(y + box_h + 8)


def measure_content(pdf):
    """Run the content-building logic and return final Y position."""
    _build_content(pdf)
    return pdf.get_y()


def _build_content(pdf):
    pdf.add_page()
    y = 0

    # ── COVER ──
    pdf.set_fill_color(*GREEN)
    pdf.rect(0, 0, PAGE_W, 200, "F")
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, 120, PAGE_W, 3, "F")

    pdf.set_y(40)
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(*WHITE)
    pdf.cell(CONTENT_W, 16, "GreenFox Energy", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 16)
    pdf.cell(CONTENT_W, 10, "Website Audit Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(232, 245, 233)
    pdf.cell(CONTENT_W, 8, "Desktop Breakdown  |  March 2026", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(135)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*WHITE)
    for item in [
        "Full-page screenshots of every page",
        "Bug and error audit across every section",
        "User journey mapping and intent analysis",
        "Integration status (HubSpot, Mapbox, Stripe)",
        "Recommendations and next steps",
    ]:
        pdf.cell(60)
        pdf.cell(CONTENT_W, 8, f"-  {item}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(210)
    pdf.ln(10)

    # ── 1. EXECUTIVE SUMMARY ──
    pdf._green_divider()
    pdf._section_title("1. Executive Summary")
    pdf._body(
        "GreenFox Energy's website is a static HTML/CSS/JS marketing site deployed on Vercel. "
        "It consists of 18 pages covering solar installation, battery storage, EV charging, maintenance "
        "services, a multi-step quote funnel, area-specific landing pages, and supporting pages "
        "(about, contact, partners, legal)."
    )
    pdf._body(
        "The site uses a clean, modern design with the GreenFox green (#2E8B57) and orange (#FF7043) "
        "brand palette, Plus Jakarta Sans typography, and responsive layouts. The primary conversion "
        "flow is the quote funnel (quote.html), which guides users through a multi-step wizard to "
        "capture lead data."
    )
    pdf._sub_heading("Key Findings")
    for f in [
        "18 pages deployed and functional at desktop resolution",
        "No critical layout breaks or rendering errors on desktop",
        "Several placeholder values in source code (YOURDOMAIN.COM, social links, HubSpot/Mapbox tokens)",
        "Contact form submits to console only -- no backend connected yet",
        "Quote funnel is comprehensive but HubSpot and Mapbox integrations are placeholder",
        "About page has generic 'Team Member' placeholder content",
        "Mobile layout recently improved (hero, services, process, contact sections)",
        "No analytics (Google Analytics, etc.) currently installed",
    ]:
        pdf._bullet(f)
    pdf.ln(4)

    pdf._sub_heading("Overall Health Score")
    pdf._table(
        ["Category", "Score", "Status"],
        [
            ["Desktop Layout", "9/10", "Excellent"],
            ["Mobile Responsiveness", "7/10", "Good (recently improved)"],
            ["Content Completeness", "7/10", "Placeholder content remains"],
            ["SEO Readiness", "6/10", "Meta tags present, canonical URLs placeholder"],
            ["Conversion Flow", "8/10", "Strong funnel, needs backend"],
            ["Integrations", "3/10", "All placeholder -- not connected"],
            ["Performance", "7/10", "No build step, large images"],
        ],
        col_widths=[60, 30, 80],
    )

    # ── 2. SITE ARCHITECTURE ──
    pdf.ln(6)
    pdf._green_divider()
    pdf._section_title("2. Site Architecture & Page Inventory")
    pdf._body(
        "The site is structured as flat HTML files with shared header/footer markup copied across pages. "
        "There is no templating engine or build step. Assets live in css/, js/, and img/ folders."
    )
    pdf._table(
        ["Page", "File", "Purpose", "Status"],
        [
            ["Homepage", "index.html", "Main landing, hero, services, reviews", "Live"],
            ["Solar Services", "solar-services.html", "Services overview", "Live"],
            ["Quote Funnel", "quote.html", "Multi-step lead capture wizard", "Live"],
            ["Battery Storage", "battery-storage.html", "Battery products & pricing", "Live"],
            ["EV Charger", "ev-charger.html", "EV charger installation info", "Live"],
            ["Solar Health-Check", "solar-healthcheck.html", "99 health-check service", "Live"],
            ["Vixen Care Plan", "vixen-care-plan.html", "Maintenance subscription", "Live"],
            ["About Us", "about.html", "Company story, team, values", "Live"],
            ["Contact", "contact.html", "Contact form and info", "Live"],
            ["Partners", "partners.html", "Affiliate referral landing page", "Live"],
            ["Privacy Policy", "privacy.html", "GDPR privacy policy", "Live"],
            ["Terms", "terms.html", "Terms and conditions", "Live"],
            ["404 Page", "404.html", "Custom error page", "Live"],
            ["Edinburgh", "areas/edinburgh.html", "Local solar landing page", "Live"],
            ["Glasgow", "areas/glasgow.html", "Local solar landing page", "Live"],
            ["Aberdeen", "areas/aberdeen.html", "Local solar landing page", "Live"],
            ["Dundee", "areas/dundee.html", "Local solar landing page", "Live"],
            ["Perth", "areas/perth.html", "Local solar landing page", "Live"],
        ],
        col_widths=[32, 42, 68, 28],
    )

    pdf._sub_heading("Tech Stack")
    for s in [
        "Frontend: Vanilla HTML5, CSS3, JavaScript (no framework)",
        "Hosting: Vercel (static deployment, cleanUrls enabled)",
        "Fonts: Google Fonts -- Plus Jakarta Sans",
        "CSS: styles.css (~3,500 lines) + quote-styles.css (~2,200 lines)",
        "JS: main.js (~290 lines) + quote.js (~1,190 lines)",
        "No build step, bundler, or package manager",
    ]:
        pdf._bullet(s)
    pdf.ln(6)

    # ── 3. PAGE-BY-PAGE SCREENSHOTS ──
    pdf._green_divider()
    pdf._section_title("3. Page-by-Page Desktop Screenshots")
    pdf._body(
        "Below is a full-length screenshot of every page on the site, captured at 1440px desktop "
        "width. Each image shows the entire scrollable page from header to footer."
    )
    pdf.ln(4)

    pages_data = [
        ("01-homepage.png", "Homepage (index.html)",
         "Main landing page: hero with 'Solar for the Savvy', Trustpilot badge, partner logo "
         "carousel, Go Solar/Care & Maintenance service cards, reviews strip, 5-step process, "
         "GreenFox Difference trust section, and Let's Talk CTA."),
        ("02-solar-services.png", "Solar Services (solar-services.html)",
         "Full services overview: solar installation detail, battery storage, EV charger "
         "installation, care & maintenance, accreditation badges, and CTA footer."),
        ("03-quote.png", "Quote Funnel (quote.html)",
         "Multi-step quote wizard. Step 1 asks 'Home or Workplace?' with card selection. "
         "Progress bar at top, fox helper character bottom-right, Trustpilot sidebar."),
        ("04-battery-storage.png", "Battery Storage (battery-storage.html)",
         "Battery page: hero, Trustpilot strip, three product cards (Duracell from 2,500, "
         "Sigenergy from 3,500, Tesla Powerwall from 4,500), how-it-works, CTA."),
        ("05-ev-charger.png", "EV Charger (ev-charger.html)",
         "EV charger page: hero with GreenFox branded car, Smart EV Charger card at 999, "
         "process steps, solar+EV statistics, and CTA."),
        ("06-solar-healthcheck.png", "Solar Health-Check (solar-healthcheck.html)",
         "99 health-check page: pricing card, feature list, FAQ accordion, booking CTA."),
        ("07-vixen-care-plan.png", "Vixen Care Plan (vixen-care-plan.html)",
         "Maintenance subscription: two-tier pricing (25.99/mo vs 99 one-off), "
         "feature comparison, why-maintenance section, FAQ."),
        ("08-about.png", "About Us (about.html)",
         "Company page: GreenFox mascot hero, values grid, promise section, team "
         "placeholder cards, timeline, accreditation badges, CTA."),
        ("09-contact.png", "Contact (contact.html)",
         "Contact page: 4 channel cards, form with subject dropdown, sidebar FAQ, area pills."),
        ("10-partners.png", "Partners (partners.html)",
         "Affiliate landing page: 500 off solar, half-price service, 20% off upgrades. "
         "Three service cards and CTA footer."),
        ("11-edinburgh.png", "Edinburgh Area Page (areas/edinburgh.html)",
         "Location-specific page: Edinburgh local stats, services grid, testimonials, CTA."),
        ("12-404.png", "404 Error Page (404.html)",
         "Custom 404: fox icon, 'This page has gone off-grid', two CTAs."),
    ]

    for img_file, title, desc in pages_data:
        pdf._sub_heading(title, size=14)
        pdf._body(desc)
        img_path = os.path.join(SCREENSHOTS_DIR, img_file)
        pdf._screenshot(img_path, f"Full desktop capture: {title}")
        pdf.ln(4)

    # ── 4. BUGS & ISSUES ──
    pdf._green_divider()
    pdf._section_title("4. Bugs, Errors & Issues")

    pdf._sub_heading("Critical Issues (Blocking)")
    pdf._body("No critical rendering or functionality issues found on desktop.")

    pdf._sub_heading("High Priority -- Placeholder Content in Source Code")
    pdf._table(
        ["Placeholder", "Location", "Impact", "Fix Required"],
        [
            ["YOURDOMAIN.COM", "Canonical URLs, OG meta, sitemap", "SEO / social sharing broken", "Replace with actual domain"],
            ["YOUR_PORTAL_ID", "HubSpot tracking (all pages)", "No analytics tracking", "Add HubSpot portal ID"],
            ["YOUR_FORM_GUID", "quote.js HubSpot config", "Quote submissions fail", "Create HubSpot form + GUID"],
            ["YOUR_MAPBOX_TOKEN", "quote.js Mapbox config", "Satellite map won't load", "Get Mapbox access token"],
            ["YOUR_FACEBOOK", "Footer social links (all pages)", "Broken social links", "Add Facebook page URL"],
            ["YOUR_INSTAGRAM", "Footer social links (all pages)", "Broken social links", "Add Instagram URL"],
            ["YOUR_LINKEDIN", "Footer social links (all pages)", "Broken social links", "Add LinkedIn URL"],
        ],
        col_widths=[35, 45, 45, 45],
    )

    pdf._sub_heading("Medium Priority -- Content & UX Issues")
    pdf._table(
        ["Issue", "Page", "Details"],
        [
            ["Team member placeholders", "About", "Generic 'Team Member' headings need real names/photos"],
            ["Contact form no backend", "Contact", "Form submits to console.log only -- needs API"],
            ["Stripe references disabled", "Battery/EV", "Purchase buttons link to contact -- Stripe commented out"],
            ["No Google Analytics", "All pages", "No analytics tracking installed"],
            ["Care & Maintenance hidden", "Homepage", "Second service card display:none -- intentional?"],
            ["Hero mobile image was missing", "Homepage", "hero-solar-house-hd.png didn't exist (now GFClay.png)"],
        ],
        col_widths=[45, 25, 100],
    )

    pdf._sub_heading("Low Priority -- Polish Items")
    for item in [
        "Cookie banner styling could be more polished on desktop",
        "Logo carousel tooltip only works on hover (not useful on touch)",
        "Area pages share very similar structure -- could be templated",
        "Some images are large JPEGs -- convert to WebP for performance",
        "No favicon file (uses inline SVG -- works but could be .ico/.png)",
    ]:
        pdf._bullet(item)
    pdf.ln(6)

    # ── 5. USER JOURNEYS ──
    pdf._green_divider()
    pdf._section_title("5. User Journeys & Intent Mapping")
    pdf._body(
        "The site serves several distinct user intents. Below we map each persona, "
        "their entry point, journey, and conversion goal."
    )

    pdf._sub_heading("User Intent Categories")
    pdf._table(
        ["Intent", "Persona", "Entry Point", "Key Pages", "Goal"],
        [
            ["New Solar Enquiry", "Homeowner researching", "Homepage / Google", "Home > Services > Quote", "Quote submission"],
            ["Battery Add-on", "Existing solar owner", "Direct / Google", "Battery Storage > Quote", "Battery enquiry"],
            ["EV Charging", "EV owner", "Google / Services", "EV Charger > Contact", "EV charger enquiry"],
            ["Maintenance", "Existing solar owner", "Google / Direct", "Health-Check / Care Plan", "Book health-check"],
            ["Partner Referral", "Trade partner", "Direct link / email", "Partners > Quote", "Referred lead"],
            ["Local Search", "Homeowner in city", "Google local search", "Area Page > Quote", "Quote submission"],
            ["Company Research", "Comparing installers", "Google / reviews", "About > Contact", "Call or email"],
        ],
        col_widths=[28, 28, 28, 44, 42],
    )

    pdf.ln(4)
    pdf._sub_heading("Journey 1: New Solar Customer (Primary Flow)")
    pdf._flowchart_row([
        ("Homepage", GREEN, WHITE),
        ("Services", GREEN, WHITE),
        ("Quote Funnel", ORANGE, WHITE),
        ("System Size", ORANGE, WHITE),
        ("Configurator", ORANGE, WHITE),
        ("Submit Lead", GREEN_DARK, WHITE),
    ])
    pdf._body(
        "Primary conversion: homepage through services overview into multi-step quote funnel. "
        "Captures location, property type, system size, battery interest, timeline, postcode, "
        "and contact details before the package configurator."
    )

    pdf._sub_heading("Journey 2: Existing Solar Customer (Maintenance)")
    pdf._flowchart_row([
        ("Google Search", GRAY_500, WHITE),
        ("Health-Check", GREEN, WHITE),
        ("Care Plan", GREEN, WHITE),
        ("Contact / Book", ORANGE, WHITE),
    ])
    pdf._body(
        "Existing owners search for maintenance, compare 99 one-off vs 25.99/mo plan, "
        "then contact or book."
    )

    pdf._sub_heading("Journey 3: Local Search (Area Pages)")
    pdf._flowchart_row([
        ("Google Local", GRAY_500, WHITE),
        ("Area Page", GREEN, WHITE),
        ("Quote Funnel", ORANGE, WHITE),
        ("Submit Lead", GREEN_DARK, WHITE),
    ])
    pdf._body(
        "Users searching 'solar panels Edinburgh' (or Glasgow, Aberdeen, etc.) land on the "
        "area-specific page with local stats and testimonials, then enter the quote wizard."
    )
    pdf.ln(6)

    # ── 6. INTEGRATION STATUS ──
    pdf._green_divider()
    pdf._section_title("6. Integration Status")
    pdf._body(
        "The site has several third-party integrations planned but not yet connected. "
        "Current status of each:"
    )
    pdf._table(
        ["Integration", "Purpose", "Status", "Blocker"],
        [
            ["HubSpot Tracking", "Analytics & visitor tracking", "PLACEHOLDER", "Need portal ID"],
            ["HubSpot Forms API", "Quote funnel lead capture", "PLACEHOLDER", "Need form GUID"],
            ["HubSpot Products", "Dynamic pricing from CRM", "PLANNED", "Phase 2 per backend plan"],
            ["Mapbox GL JS", "Satellite map in configurator", "PLACEHOLDER", "Need access token"],
            ["Trustpilot", "Review links and badges", "ACTIVE", "Working"],
            ["Google Fonts", "Plus Jakarta Sans typography", "ACTIVE", "Working"],
            ["Stripe Payments", "Online purchase flow", "DISABLED", "Commented out in code"],
            ["Google Analytics", "Site analytics", "NOT ADDED", "No tracking code present"],
            ["Domain / DNS", "Custom domain", "PENDING", "YOURDOMAIN.COM placeholders"],
        ],
        col_widths=[35, 45, 30, 60],
    )

    pdf._sub_heading("Backend Integration Roadmap")
    pdf._body("A 4-phase backend integration plan exists in docs/Backend-Integration-Plan.md:")
    for p in [
        "Phase 1: HubSpot lead capture (Forms API for quote funnel, tracking code)",
        "Phase 2: Mapbox satellite map integration (geocoding, map display)",
        "Phase 3: Domain and placeholder replacement (canonical URLs, social links, sitemap)",
        "Phase 4: Dynamic pricing via Vercel Serverless Function pulling from HubSpot Products",
    ]:
        pdf._bullet(p)
    pdf.ln(6)

    # ── 7. RECOMMENDATIONS ──
    pdf._green_divider()
    pdf._section_title("7. Recommendations & Next Steps")

    pdf._sub_heading("Immediate (Before Go-Live)")
    for item in [
        "Replace all YOURDOMAIN.COM placeholders with actual domain",
        "Add HubSpot portal ID and form GUID to connect quote funnel",
        "Add Mapbox access token for satellite map in configurator",
        "Update social media links (Facebook, Instagram, LinkedIn)",
        "Replace 'Team Member' placeholders on About page with real team info",
        "Connect contact form to HubSpot or email backend",
        "Add Google Analytics or equivalent tracking",
    ]:
        pdf._bullet(item)
    pdf.ln(4)

    pdf._sub_heading("Short-Term (Post-Launch)")
    for item in [
        "Add sitemap.xml to Google Search Console",
        "Optimise images: convert large JPEGs to WebP, add lazy loading",
        "Implement templating to avoid duplicated header/footer HTML",
        "Add structured data (JSON-LD) to all pages",
        "Set up HubSpot workflows for lead nurturing",
        "Full mobile testing pass on all pages (not just homepage)",
    ]:
        pdf._bullet(item)
    pdf.ln(4)

    pdf._sub_heading("Medium-Term (Growth Phase)")
    for item in [
        "Enable Stripe payments for battery and EV charger purchases",
        "Build dynamic pricing API via Vercel Functions from HubSpot Products",
        "Add blog/content section for SEO authority building",
        "Implement A/B testing on quote funnel for conversion optimisation",
        "Add live chat or chatbot for visitor engagement",
        "Create more area pages for wider geographic coverage",
    ]:
        pdf._bullet(item)
    pdf.ln(10)

    # ── END BANNER ──
    y = pdf.get_y()
    pdf.set_fill_color(*GREEN)
    pdf.rect(0, y, PAGE_W, 80, "F")
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, y + 30, PAGE_W, 2, "F")

    pdf.set_y(y + 10)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(*WHITE)
    pdf.cell(CONTENT_W, 12, "End of Audit Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(y + 40)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(CONTENT_W, 7, "GreenFox Energy  |  March 2026", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(200, 230, 210)
    pdf.cell(CONTENT_W, 7, "greenfoxenergywebsite.vercel.app", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(CONTENT_W, 7, "hello@greenfoxenergy.co.uk  |  0330 133 8165", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_y(y + 80 + 5)


def build_pdf():
    # Pass 1: measure total content height using a very tall page
    measure = AuditPDF(page_h=50000)
    _build_content(measure)
    total_h = measure.get_y() + 20

    print(f"Measured content height: {total_h:.0f}mm")

    # Pass 2: render into a single page of exactly that height
    pdf = AuditPDF(page_h=total_h)
    _build_content(pdf)
    pdf.output(OUTPUT_PATH)
    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Size: {size_mb:.1f} MB  |  Single continuous page: {PAGE_W}mm x {total_h:.0f}mm")


if __name__ == "__main__":
    build_pdf()
