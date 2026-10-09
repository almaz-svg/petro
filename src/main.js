import { content, assets } from "./content.js";

for (const element of document.querySelectorAll("[data-copy]")) {
  const text = content[element.dataset.copy];
  if (typeof text === "string") element.textContent = text;
}
// Lines reveal in order as each pinned frame enters the viewport.
for (const element of document.querySelectorAll("[data-reveal]")) {
  const lines = element.innerText.split("\n");
  element.replaceChildren(
    ...lines.map((text, index) => {
      const line = document.createElement("span");
      line.className = "reveal-line";
      line.style.setProperty("--line-index", index);
      line.textContent = text;
      return line;
    }),
  );
}
const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
});
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menu.getAttribute("aria-expanded") !== "true")
    return;
  const returnFocus = navigation.contains(document.activeElement);
  closeMenu();
  if (returnFocus) menu.focus();
});
for (const link of navigation.querySelectorAll("a"))
  link.addEventListener("click", () => {
    closeMenu();
    for (const item of navigation.querySelectorAll("a"))
      item.removeAttribute("aria-current");
    link.setAttribute("aria-current", "location");
  });

const fallback = document.querySelector("#model-fallback");
const still = document.querySelector("#model-still");
const host = document.querySelector("#scene-host");
const status = document.querySelector("#viewer-status");
const toggle = document.querySelector("#rotation-toggle");
const viewButtons = [...document.querySelectorAll("[data-view]")];
const stage = document.querySelector("#experience-stage");
const journey = document.querySelector("#journey");
const tracks = [...document.querySelectorAll(".track")];
const explore = document.querySelector("#explore");
const details = document.querySelector("#details");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let scene = null,
  paused = motion.matches,
  unavailable = false,
  ended = false;
let lifecycle = 0,
  scrollFrame = 0,
  lastInteractive = null;
function updateJourney() {
  scrollFrame = 0;
  if (ended) return;
  const height = window.innerHeight || 1;
  const y = window.scrollY;
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const heroFade = clamp(y / (height * 1.1));
  stage.style.setProperty("--hero-photo-opacity", 1 - heroFade * heroFade * (3 - 2 * heroFade));
  // The city is visible only within Details; scroll backwards reverses the reveal.
  const cityLocal = (y - details.offsetTop) / height;
  const cityDuration = details.offsetHeight / height;
  const smooth = (value) => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const cityOpacity = cityLocal < 0 || cityLocal >= cityDuration ? 0 :
    (0.2 * smooth(cityLocal / 0.25) +
      0.3 * smooth((cityLocal - 0.25) / 0.75)) *
    smooth((cityDuration - cityLocal) / 0.6);
  stage.style.setProperty("--city-opacity", cityOpacity);
  const progress = clamp(
    (y - journey.offsetTop) / Math.max(1, explore.offsetTop),
  );
  const isInteractive =
    y >= explore.offsetTop - height * 0.15 && y < journey.offsetHeight;
  document.documentElement.style.setProperty("--journey-progress", progress);
  document.documentElement.style.setProperty(
    "--header-logo",
    clamp((y / height - 0.25) / 0.4),
  );
  document.documentElement.style.setProperty("--hero-fold", clamp(y / height));
  document.documentElement.style.setProperty(
    "--stage-opacity",
    1 - clamp((y - (journey.offsetHeight - height * 0.6)) / (height * 0.6)),
  );
  stage.classList.toggle("is-interactive", isInteractive && Boolean(scene));
  toggle.hidden = Boolean(scene) && !isInteractive;
  for (const track of tracks) {
    const local = (y - track.offsetTop) / height;
    const duration = track.offsetHeight / height;
    const opacity = Math.min(
      clamp((local + 0.8) / 0.7),
      clamp((duration - local - 0.25) / 0.6),
    );
    track.style.setProperty("--frame-opacity", opacity);
    const showing = opacity > 0.05;
    track.classList.toggle("is-visible", showing);
    // Inactive controls must not intercept input or receive keyboard focus.
    track.inert = !showing;
  }
  let active = tracks[0];
  for (const track of tracks)
    if (track.offsetTop <= y + height * 0.3) active = track;
  for (const link of navigation.querySelectorAll("a")) {
    if (link.hash === "#" + active.id)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  if (scene) {
    scene.setProgress(progress);
    if (lastInteractive !== isInteractive) {
      scene.setInteractive(isInteractive);
      lastInteractive = isInteractive;
      const text = isInteractive
        ? paused
          ? "Вращение на паузе"
          : "Потяните, чтобы повернуть"
        : "Прокрутите, чтобы изменить ракурс";
      if (status.textContent !== text) status.textContent = text;
    }
  }
}
function requestJourneyUpdate() {
  if (!scrollFrame && !ended)
    scrollFrame = requestAnimationFrame(updateJourney);
}
window.addEventListener("scroll", requestJourneyUpdate, { passive: true });
window.addEventListener("resize", requestJourneyUpdate, { passive: true });
document.body.classList.toggle("js-motion", !motion.matches);
fallback.src = assets.fallback;
function updateButton() {
  toggle.disabled = motion.matches;
  toggle.setAttribute("aria-pressed", String(paused));
  toggle.replaceChildren(
    document.createTextNode(
      motion.matches
        ? "Без автовращения"
        : paused
          ? "Продолжить"
          : "Приостановить",
    ),
  );
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = paused ? "▷" : "Ⅱ";
  toggle.append(icon);
}
function setSceneControls(enabled) {
  for (const button of viewButtons) button.disabled = !enabled;
}
function freezeFallback() {
  // drawImage captures a single decoded GIF frame; the original asset stays unchanged.
  if (!fallback.complete || !fallback.naturalWidth) return false;
  const context = still.getContext("2d");
  if (!context) return false;
  still.width = fallback.naturalWidth;
  still.height = fallback.naturalHeight;
  context.drawImage(fallback, 0, 0, still.width, still.height);
  still.hidden = false;
  fallback.hidden = true;
  return true;
}
function updateFallback() {
  if (scene) {
    fallback.hidden = true;
    still.hidden = true;
    return;
  }
  if (paused) {
    fallback.hidden = true;
    if (!freezeFallback()) status.textContent = "Загрузка изображения…";
  } else {
    still.hidden = true;
    fallback.hidden = false;
  }
}
function useFallback() {
  if (ended) return;
  unavailable = true;
  scene?.dispose();
  scene = null;
  host.replaceChildren();
  setSceneControls(false);
  lastInteractive = null;
  toggle.hidden = false;
  stage.classList.remove("is-interactive");
  status.textContent = "Режим изображения · 3D недоступен";
  updateFallback();
  updateButton();
}
fallback.addEventListener("load", () => {
  if (!scene) {
    updateFallback();
    if (unavailable) status.textContent = "Режим изображения · 3D недоступен";
  }
});
fallback.addEventListener("error", () => {
  if (!scene) {
    fallback.hidden = true;
    still.hidden = true;
    status.textContent = "Изображение не загрузилось. Обновите страницу.";
    toggle.disabled = true;
  }
});
updateButton();
setSceneControls(false);
updateFallback();
toggle.addEventListener("click", () => {
  paused = !paused;
  scene?.setRotating(!paused && !motion.matches);
  updateFallback();
  updateButton();
  if (scene)
    status.textContent = lastInteractive
      ? paused
        ? "Вращение на паузе"
        : "Потяните, чтобы повернуть"
      : "Прокрутите, чтобы изменить ракурс";
});
for (const button of viewButtons)
  button.addEventListener("click", () => {
    if (!scene) return;
    switch (button.dataset.view) {
      case "left":
        scene.rotate(-Math.PI / 8);
        break;
      case "right":
        scene.rotate(Math.PI / 8);
        break;
      case "zoom-in":
        scene.zoom(1.15);
        break;
      case "zoom-out":
        scene.zoom(1 / 1.15);
        break;
      case "reset":
        scene.reset();
        break;
    }
  });

function importWithTimeout() {
  let timer;
  return Promise.race([
    import("./scene.js"),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("3D-библиотека не загрузилась")),
        15000,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
async function startScene() {
  const generation = ++lifecycle;
  try {
    const { mountScene } = await importWithTimeout();
    if (ended || generation !== lifecycle) return;
    const controller = await mountScene({
      container: host,
      modelUrl: assets.model,
      reducedMotion: motion.matches,
      onError: () => {
        if (generation === lifecycle) useFallback();
      },
    });
    if (ended || generation !== lifecycle) {
      controller.dispose();
      return;
    }
    scene = controller;
    unavailable = false;
    lastInteractive = null;
    scene.setRotating(!paused && !motion.matches);
    fallback.hidden = true;
    still.hidden = true;
    toggle.disabled = false;
    setSceneControls(true);
    updateButton();
    updateJourney();
  } catch (error) {
    if (ended || generation !== lifecycle) return;
    console.info("3D-просмотр недоступен:", error.message);
    useFallback();
  }
}
function onMotionChange() {
  paused = motion.matches;
  document.body.classList.toggle("js-motion", !motion.matches);
  lastInteractive = null;
  scene?.dispose();
  scene = null;
  host.replaceChildren();
  setSceneControls(false);
  updateFallback();
  updateButton();
  startScene();
}
motion.addEventListener("change", onMotionChange);
function onPageHide() {
  ended = true;
  lifecycle++;
  cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
  lastInteractive = null;
  scene?.dispose();
  scene = null;
  motion.removeEventListener("change", onMotionChange);
}
window.addEventListener("pagehide", onPageHide);
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  ended = false;
  paused = motion.matches || paused;
  motion.addEventListener("change", onMotionChange);
  document.body.classList.toggle("js-motion", !motion.matches);
  updateButton();
  updateFallback();
  updateJourney();
  startScene();
});
updateJourney();
startScene();

const previewImage = document.querySelector(".preview-link img");
function freezePreview() {
  if (!previewImage?.complete || !previewImage.naturalWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.drawImage(previewImage, 0, 0, 640, 640);
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "preview-still";
  previewImage.replaceWith(canvas);
}
previewImage?.addEventListener("load", freezePreview, { once: true });
freezePreview();
