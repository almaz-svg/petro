from pathlib import Path
from playwright.sync_api import sync_playwright
import json

out = Path('docs/research')
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
    page.goto('https://oryzo.ai/', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function("getComputedStyle(document.querySelector('#preloader')).display === 'none'", timeout=120000)
    page.wait_for_timeout(1500)
    print(json.dumps({'title':page.title(),'body':page.locator('body').inner_text()[:2500]}, ensure_ascii=False))
    page.screenshot(path=str(out/'oryzo-hero.png'))
    for name,y in [('intro',700),('reveal',1500),('reveal-next',2400)]:
        page.evaluate('(y) => window.scrollTo(0,y)',y)
        page.wait_for_timeout(2200)
        page.screenshot(path=str(out/f'oryzo-{name}.png'))
    browser.close()
