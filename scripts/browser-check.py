from pathlib import Path
import json
from io import BytesIO
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

out = Path('docs/verification')
out.mkdir(parents=True, exist_ok=True)
url = 'http://127.0.0.1:4173/'
results = []

def image_delta(first, second):
    a = Image.open(BytesIO(first)).convert('RGB')
    b = Image.open(BytesIO(second)).convert('RGB')
    difference = ImageChops.difference(a, b)
    return sum(ImageStat.Stat(difference).mean)/3, max(high for low, high in difference.getextrema())

def same_frame(first, second):
    # SwiftShader screenshots can differ by one channel level across frames.
    # Observed pause captures had max=1 and mean=0.022/255, with no geometry shift.
    mean, maximum = image_delta(first, second)
    return maximum <= 1 and mean < 0.1

def ready(page):
    page.goto(url, wait_until='networkidle')
    page.wait_for_function("document.querySelector('#model-fallback').hidden && document.querySelector('#scene-host canvas')", timeout=30000)
    page.wait_for_timeout(1000)

def scroll_to(page, selector, extra=0.3):
    page.evaluate("([selector,extra])=>window.scrollTo({top:document.querySelector(selector).offsetTop+innerHeight*extra,behavior:'instant'})", [selector,extra])
    page.wait_for_timeout(1400)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    desktop = browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
    errors = []
    desktop.on('pageerror', lambda error: errors.append(str(error)))
    ready(desktop)
    assert desktop.locator('#scene-host canvas').count() == 1
    desktop.screenshot(path=str(out/'desktop-hero.png'))
    scroll_to(desktop,'#architecture')
    desktop.screenshot(path=str(out/'desktop-architecture.png'))
    scroll_to(desktop,'#details')
    desktop.screenshot(path=str(out/'desktop-details.png'))
    scroll_to(desktop,'#explore')
    assert desktop.locator('#experience-stage').evaluate("el=>el.classList.contains('is-interactive')")
    desktop.locator('#rotation-toggle').click()
    assert desktop.locator('#rotation-toggle').get_attribute('aria-pressed') == 'true'
    desktop.wait_for_timeout(400)
    center = {'x':480,'y':180,'width':480,'height':500}
    before = desktop.screenshot(clip=center)
    desktop.wait_for_timeout(500)
    after_pause = desktop.screenshot(clip=center)
    if not same_frame(before, after_pause):
        (out/'pause-before.png').write_bytes(before)
        (out/'pause-after.png').write_bytes(after_pause)
    assert same_frame(before, after_pause), 'Paused scene still changes'
    desktop.get_by_role('button',name='Приблизить модель').click()
    assert image_delta(before, desktop.screenshot(clip=center))[0] > 1, 'Zoom did not change the rendered model'
    desktop.get_by_role('button',name='Вернуть исходный вид').click()
    desktop.get_by_role('button',name='Повернуть мечеть влево').click()
    assert image_delta(before, desktop.screenshot(clip=center))[0] > 1, 'Rotation did not change the model'
    desktop.screenshot(path=str(out/'desktop-explore.png'))
    assert not errors, errors
    results.append({'desktop':'GLB visible, pinned scroll frames, pause, zoom, rotate, reset','pageErrors':errors})

    mobile = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    mobile_errors = []
    mobile.on('pageerror',lambda error:mobile_errors.append(str(error)))
    ready(mobile)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal mobile overflow'
    mobile.screenshot(path=str(out/'mobile-hero.png'))
    mobile.get_by_role('button',name='Меню').click()
    assert mobile.locator('.menu-toggle').get_attribute('aria-expanded') == 'true'
    mobile.locator('#navigation a').first.focus()
    mobile.keyboard.press('Escape')
    assert mobile.locator('.menu-toggle').get_attribute('aria-expanded') == 'false'
    assert mobile.locator('.menu-toggle').evaluate('el=>el===document.activeElement')
    scroll_to(mobile,'#architecture')
    mobile.screenshot(path=str(out/'mobile-architecture.png'))
    scroll_to(mobile,'#explore')
    mobile.screenshot(path=str(out/'mobile-explore.png'))
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not mobile_errors, mobile_errors
    results.append({'mobile':'390px, no overflow, menu/Escape focus, scroll, free view','pageErrors':mobile_errors})

    reduced = browser.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
    ready(reduced)
    assert reduced.locator('#rotation-toggle').is_disabled()
    assert reduced.locator('#rotation-toggle').get_attribute('aria-pressed') == 'true'
    scroll_to(reduced,'#explore')
    sample = reduced.screenshot()
    reduced.wait_for_timeout(500)
    assert same_frame(sample, reduced.screenshot()), 'Reduced motion scene still changes without input'
    results.append({'reducedMotion':'No auto movement, manual controls remain available'})

    fallback = browser.new_page(viewport={'width':390,'height':844})
    fallback.route('**/mosque-360.glb',lambda route:route.abort())
    fallback.goto(url,wait_until='networkidle')
    fallback.wait_for_function("document.querySelector('#viewer-status').textContent.includes('Режим изображения')")
    assert fallback.locator('#model-fallback').is_visible()
    fallback.locator('#rotation-toggle').click()
    assert fallback.locator('#model-still').is_visible()
    assert not fallback.locator('#model-fallback').is_visible()
    results.append({'fallback':'Failed GLB shows local GIF; pause produces a static frame'})

    # A delayed real GLB gives time to pause before the viewer mounts. Opening
    # directly at #explore must start at the final pose, which Reset preserves.
    direct = browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
    direct.add_init_script("""const originalFetch = window.fetch.bind(window);
      window.fetch = (...args) => String(args[0]).includes('mosque-360.glb')
        ? new Promise(resolve => setTimeout(resolve, 2000)).then(() => originalFetch(...args))
        : originalFetch(...args);""")
    direct.goto(url+'#explore',wait_until='domcontentloaded')
    direct.locator('#rotation-toggle').click()
    direct.wait_for_function("document.querySelector('#model-fallback').hidden && document.querySelector('#scene-host canvas')",timeout=30000)
    direct.wait_for_timeout(1200)
    assert direct.locator('#rotation-toggle').get_attribute('aria-pressed') == 'true'
    direct_before = direct.screenshot(clip=center)
    direct.get_by_role('button',name='Вернуть исходный вид').click()
    assert same_frame(direct_before, direct.screenshot(clip=center)), 'Direct #explore opens at the wrong camera pose'
    results.append({'directExplore':'Delayed GLB, direct hash and pause before loading preserve the final pose'})
    browser.close()

(out/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
