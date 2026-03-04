"""Take true full-page screenshots of all site pages using Playwright."""
import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3456"
OUT = os.path.join(os.path.dirname(__file__), "audit-screenshots")

PAGES = [
    ("01-homepage.png", "/index.html"),
    ("02-solar-services.png", "/solar-services.html"),
    ("03-quote.png", "/quote.html"),
    ("04-battery-storage.png", "/battery-storage.html"),
    ("05-ev-charger.png", "/ev-charger.html"),
    ("06-solar-healthcheck.png", "/solar-healthcheck.html"),
    ("07-vixen-care-plan.png", "/vixen-care-plan.html"),
    ("08-about.png", "/about.html"),
    ("09-contact.png", "/contact.html"),
    ("10-partners.png", "/partners.html"),
    ("11-edinburgh.png", "/areas/edinburgh.html"),
    ("12-404.png", "/404.html"),
]

os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    for filename, path in PAGES:
        url = BASE + path
        print(f"  {filename} -> {url}")
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Dismiss cookie banner if present
        try:
            cookie_btn = page.locator("text=Accept").first
            if cookie_btn.is_visible(timeout=500):
                cookie_btn.click()
                page.wait_for_timeout(300)
        except Exception:
            pass

        out_path = os.path.join(OUT, filename)
        page.screenshot(path=out_path, full_page=True)

        from PIL import Image
        img = Image.open(out_path)
        size_kb = os.path.getsize(out_path) // 1024
        print(f"    => {img.width}x{img.height}px  ({size_kb} KB)")

    browser.close()

print("\nDone! All screenshots saved to:", OUT)
