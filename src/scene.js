import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sampleJourney } from "./journey.js";

export async function mountScene({
  container,
  modelUrl,
  onReady,
  onError,
  reducedMotion = false,
}) {
  if (!container) throw new Error("Не найден контейнер 3D-сцены.");
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "display:block;width:100%;height:100%;touch-action:pan-y;";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000);
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.ROTATE;
  controls.minPolarAngle = 0.07;
  controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x50473b, 2.5));
  const key = new THREE.DirectionalLight(0xffdfb2, 3.2);
  key.position.set(5, 9, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe7edf4, 1.5);
  fill.position.set(-5, 3, -4);
  scene.add(fill);
  let model, gltfScenes, bounds;
  let disposed = false,
    lost = false,
    visible = true,
    sized = false,
    interactive = false;
  let rotating = !reducedMotion,
    progress = 0,
    frame = 0,
    previous = 0,
    drawing = false;
  let radius = 1,
    fitDistance = 5,
    initialized = false;
  const center = new THREE.Vector3(),
    size = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3(),
    desiredTarget = new THREE.Vector3();
  const abort = new AbortController();
  const owned = new Set();
  function releaseRoots(roots) {
    const resources = new Set();
    for (const root of Array.isArray(roots) ? roots : [roots]) {
      root?.traverse((object) => {
        if (object.geometry) resources.add(object.geometry);
        if (object.skeleton) resources.add(object.skeleton);
        for (const material of object.material
          ? Array.isArray(object.material)
            ? object.material
            : [object.material]
          : []) {
          resources.add(material);
          for (const value of Object.values(material))
            if (value?.isTexture) resources.add(value);
        }
      });
    }
    resources.forEach((resource) => resource.dispose?.());
  }
  function canRender() {
    return (
      !disposed &&
      !lost &&
      visible &&
      sized &&
      !document.hidden &&
      Boolean(model)
    );
  }
  function render() {
    if (!canRender() || drawing) return;
    drawing = true;
    try {
      renderer.render(scene, camera);
    } finally {
      drawing = false;
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function isMoving() {
    return (
      !interactive &&
      (camera.position.distanceToSquared(desiredPosition) >
        radius * radius * 1e-9 ||
        controls.target.distanceToSquared(desiredTarget) >
          radius * radius * 1e-9)
    );
  }
  function schedule() {
    if (
      canRender() &&
      !frame &&
      (isMoving() || (interactive && rotating && !reducedMotion))
    )
      frame = requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    if (!canRender()) {
      previous = 0;
      return;
    }
    const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 1 / 60;
    previous = time;
    if (!interactive) {
      const blend = reducedMotion ? 1 : 1 - Math.exp(-7 * delta);
      camera.position.lerp(desiredPosition, blend);
      controls.target.lerp(desiredTarget, blend);
      if (!isMoving()) {
        camera.position.copy(desiredPosition);
        controls.target.copy(desiredTarget);
      }
      camera.lookAt(controls.target);
    } else {
      controls.autoRotate = rotating && !reducedMotion;
      controls.update(delta);
    }
    render();
    schedule();
    if (!frame) previous = 0;
  }
  function applyPath(immediate = false) {
    if (!model || disposed || lost) return;
    const pose = sampleJourney(progress);
    desiredTarget
      .copy(center)
      .add(new THREE.Vector3(0, size.y * pose.targetHeight, 0));
    const direction = new THREE.Vector3(
      Math.sin(pose.polar) * Math.sin(pose.yaw),
      Math.cos(pose.polar),
      Math.sin(pose.polar) * Math.cos(pose.yaw),
    );
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), direction)
      .normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    const portrait = camera.aspect < 0.85;
    const fractionX = portrait ? 0.84 : 0.4;
    const fractionY = portrait ? 0.7 : 0.76;
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const offset = new THREE.Vector3(x, y, z).sub(center);
          const depth = offset.dot(direction);
          distance = Math.max(
            distance,
            depth + Math.abs(offset.dot(right)) / (tanH * fractionX),
            depth + Math.abs(offset.dot(up)) / (tanV * fractionY),
          );
        }
    fitDistance = distance * 1.04;
    desiredPosition
      .copy(desiredTarget)
      .addScaledVector(direction, fitDistance * pose.distanceScale);
    camera.near = Math.max(radius / 1000, 0.001);
    camera.far = Math.max(fitDistance * 4 + radius * 10, camera.near * 1000);
    camera.updateProjectionMatrix();

    if (!interactive && (immediate || reducedMotion || !initialized)) {
      camera.position.copy(desiredPosition);
      controls.target.copy(desiredTarget);
      camera.lookAt(desiredTarget);
    }
    initialized = true;
    render();
    schedule();
  }
  function resize() {
    if (disposed || lost) return;
    const width = container.clientWidth,
      height = container.clientHeight;
    sized = width > 0 && height > 0;
    if (!sized) {
      stop();
      return;
    }
    camera.aspect = width / height;
    renderer.setSize(width, height, false);
    camera.updateProjectionMatrix();
    applyPath(true);
    render();
    schedule();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver((entries) => {
    if (disposed || lost) return;
    visible = entries[0]?.isIntersecting ?? true;
    stop();
    render();
    schedule();
  });
  intersectionObserver.observe(container);
  const change = () => {
    render();
    schedule();
  };
  const visibility = () => {
    stop();
    render();
    schedule();
  };
  let rejectAbort;
  const aborted = new Promise((_, reject) => {
    rejectAbort = reject;
  });
  const abortListener = () =>
    rejectAbort(abort.signal.reason || new Error("Загрузка модели отменена."));
  abort.signal.addEventListener("abort", abortListener, { once: true });
  const timeout = setTimeout(
    () => abort.abort(new Error("Загрузка модели превысила 20 секунд.")),
    20000,
  );
  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    clearTimeout(timeout);
    abort.signal.removeEventListener("abort", abortListener);
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    controls.removeEventListener("change", change);
    document.removeEventListener("visibilitychange", visibility);
    canvas.removeEventListener("webglcontextlost", contextLost);
    controls.dispose();
    releaseRoots(gltfScenes || model);
    owned.forEach((resource) => resource.dispose());
    owned.clear();
    scene.clear();
    renderer.dispose();
    canvas.remove();
  }
  const contextLost = (event) => {
    event.preventDefault();
    if (disposed || lost) return;
    lost = true;
    const error = new Error(
      "Потерян графический контекст. Обновите страницу для восстановления просмотра.",
    );
    abort.abort(error);
    dispose();
    onError?.(error);
  };
  controls.addEventListener("change", change);
  document.addEventListener("visibilitychange", visibility);
  canvas.addEventListener("webglcontextlost", contextLost);
  try {
    const loading = (async () => {
      const response = await fetch(modelUrl, { signal: abort.signal });
      if (!response.ok)
        throw new Error("Не удалось загрузить модель: HTTP " + response.status);
      const buffer = await response.arrayBuffer();
      if (abort.signal.aborted) throw abort.signal.reason;
      const result = await new GLTFLoader().parseAsync(
        buffer,
        new URL(".", new URL(modelUrl, document.baseURI)).href,
      );
      if (disposed || lost || abort.signal.aborted) {
        releaseRoots(result.scenes || result.scene);
        throw abort.signal.reason || new Error("Просмотр остановлен.");
      }
      return result;
    })();
    const gltf = await Promise.race([loading, aborted]);
    clearTimeout(timeout);
    abort.signal.removeEventListener("abort", abortListener);
    if (disposed || lost || abort.signal.aborted) {
      releaseRoots(gltf.scenes || gltf.scene);
      throw abort.signal.reason || new Error("Просмотр остановлен.");
    }
    model = gltf.scene;
    gltfScenes = gltf.scenes;
    model.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty())
      throw new Error("Модель не содержит видимой геометрии.");
    bounds.getCenter(center);
    bounds.getSize(size);
    radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    if (!Number.isFinite(radius) || radius <= 0)
      throw new Error("Некорректные размеры модели.");
    scene.add(model);
    resize();
    if (disposed || lost)
      throw (
        abort.signal.reason || new Error("Графический контекст недоступен.")
      );
    // Commit one initial frame before readiness, independently of observer visibility.
    renderer.render(scene, camera);
    if (disposed || lost)
      throw (
        abort.signal.reason || new Error("Графический контекст недоступен.")
      );
    onReady?.();
    return {
      setProgress(value) {
        if (disposed || lost) return;
        progress = sampleJourney(value).progress;
        applyPath();
      },
      setInteractive(value) {
        if (disposed || lost) return;
        const nextInteractive = Boolean(value);
        if (nextInteractive === interactive) return;
        // Commit a pending scroll pose before controls take ownership on direct hash entry.
        if (nextInteractive) {
          camera.position.copy(desiredPosition);
          controls.target.copy(desiredTarget);
          camera.lookAt(desiredTarget);
        }
        interactive = nextInteractive;
        controls.enabled = interactive;
        controls.autoRotate = interactive && rotating && !reducedMotion;
        stop();
        if (!interactive) applyPath();
        else {
          controls.update(0);
          render();
          schedule();
        }
      },
      setRotating(value) {
        if (disposed || lost) return;
        rotating = Boolean(value);
        controls.autoRotate = interactive && rotating && !reducedMotion;
        stop();
        render();
        schedule();
      },
      reset() {
        if (disposed || lost) return;
        applyPath(true);
        camera.position.copy(desiredPosition);
        controls.target.copy(desiredTarget);
        controls.update(0);
        render();
        schedule();
      },
      zoom(factor) {
        if (
          disposed ||
          lost ||
          !interactive ||
          !Number.isFinite(factor) ||
          factor <= 0
        )
          return;
        const offset = camera.position.clone().sub(controls.target);
        const distance = THREE.MathUtils.clamp(
          offset.length() / factor,
          radius * 0.65,
          fitDistance * 2.5,
        );
        camera.position
          .copy(controls.target)
          .add(offset.normalize().multiplyScalar(distance));
        controls.update(0);
        render();
        schedule();
      },
      rotate(angle) {
        if (disposed || lost || !interactive || !Number.isFinite(angle)) return;
        const offset = camera.position
          .clone()
          .sub(controls.target)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        camera.position.copy(controls.target).add(offset);
        controls.update(0);
        render();
        schedule();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
