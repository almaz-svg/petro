export function mountGallery(section, items) {
  if (!section || !items.length) return;
  const rail = section.querySelector('#gallery-rail');
  let current = -1, startX = 0, startY = 0, frame = 0;
  const cards = items.map((item, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', `${index + 1} / ${items.length}: ${item.alt || item.title}`);
    const media = document.createElement(item.type === 'video' ? 'video' : 'img');
    media.src = item.src;
    media.style.objectPosition = item.position || 'center';
    if (item.type === 'video') {
      media.controls = true;
      media.playsInline = true;
      media.preload = 'metadata';
      if (item.poster) media.poster = item.poster;
    } else {
      media.alt = item.alt || item.title;
      media.loading = 'lazy';
      media.draggable = false;
    }
    card.append(media);
    rail.append(card);
    return card;
  });
  section.style.setProperty('--gallery-length', items.length);
  function select(index) {
    const next = Math.max(0, Math.min(items.length - 1, index));
    if (next === current) return;
    current = next;
    cards.forEach((card, i) => {
      card.style.setProperty('--card-offset', i - current);
      card.classList.toggle('is-active', i === current);
      card.inert = i !== current;
      const video = card.querySelector('video');
      if (video && i !== current) video.pause();
    });
    section.querySelector('#gallery-title').textContent = items[current].title;
    section.querySelector('#gallery-description').textContent = items[current].description;
    section.querySelector('#gallery-count').textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    section.querySelector('#gallery-prev').disabled = current === 0;
    section.querySelector('#gallery-next').disabled = current === items.length - 1;
  }
  function sync() {
    frame = 0;
    const distance = window.scrollY - section.offsetTop;
    const step = Math.max(1, window.innerHeight * 0.8);
    select(Math.floor(Math.max(0, distance) / step));
    if (distance < -window.innerHeight || distance > section.offsetHeight)
      cards.forEach(card => card.querySelector('video')?.pause());
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  function go(index) {
    const next = Math.max(0, Math.min(items.length - 1, index));
    select(next);
    window.scrollTo({ top: section.offsetTop + next * window.innerHeight * 0.8 + 2, behavior: 'instant' });
  }
  section.querySelector('#gallery-prev').addEventListener('click', () => go(current - 1));
  section.querySelector('#gallery-next').addEventListener('click', () => go(current + 1));
  section.addEventListener('keydown', event => {
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); go(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  rail.addEventListener('touchstart', event => {
    startX = event.changedTouches[0].clientX; startY = event.changedTouches[0].clientY;
  }, { passive: true });
  rail.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cards.forEach(card => card.querySelector('video')?.pause());
  });
  sync();
}
