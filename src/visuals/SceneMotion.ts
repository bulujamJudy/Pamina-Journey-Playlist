import p5 from 'p5';

type MotionLayer = {
  element: HTMLElement;
  depth: number;
  isBirds: boolean;
  isTrain: boolean;
  loopSpeed: number;
  loopCopies: HTMLElement[];
};

type TrailPoint = { x: number; y: number; time: number };
type SparkRay = { angle: number; length: number };
type ClickSpark = { x: number; y: number; time: number; rays: SparkRay[] };

const birdTravelMs = 20_000;
const trainBump = (age: number): number => age >= 0 && age < 2_400
  ? Math.cos(age * Math.PI * 2 / 220) * 8 * Math.exp(-age / 320)
  : 0;
const starLayer = () => document.querySelector<HTMLElement>('.scene-layer-4-stars');

export function setSceneAudioLevel(level: number | null): void {
  const star = starLayer();
  if (!star) return;

  // The renderer reports its already-smoothed, sensitivity-adjusted middle bar.
  // Ignore small movements and make stronger peaks read as brief flashes.
  const gatedLevel = Math.max(0, Math.min(1, ((level ?? 0) - 0.12) / 0.7));
  const intensity = Math.pow(gatedLevel, 2.2);
  const brightness = 1 + intensity * 9;
  const saturation = 1 - intensity;
  star.style.filter = `brightness(${brightness.toFixed(2)}) saturate(${saturation.toFixed(2)})`;
}

export function initializeSceneMotion(): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const layers: MotionLayer[] = Array.from(document.querySelectorAll<HTMLElement>('.scene-layer[data-parallax-depth]'))
    .map((element) => ({
      element,
      depth: Number(element.dataset.parallaxDepth),
      isBirds: element.id === 'scene-layer-4-birds',
      isTrain: element.classList.contains('scene-layer-0'),
      loopSpeed: element.classList.contains('scene-layer-2') ? 14
        : element.classList.contains('scene-layer-3') ? 2 : 0,
      loopCopies: Array.from(element.querySelectorAll<HTMLElement>('.scene-loop-copy')),
    }));

  let targetX = 0;
  let targetY = 0;
  let cursorX = -100;
  let cursorY = -100;
  let cursorTargetX = -100;
  let cursorTargetY = -100;
  let cursorActive = false;
  const trail: TrailPoint[] = [];
  const sparks: ClickSpark[] = [];
  let clickBumpStartedAt = -Infinity;
  const onPointerMove = (event: PointerEvent) => {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    if (!cursorActive) {
      cursorX = event.clientX;
      cursorY = event.clientY;
      trail.length = 0;
    }
    cursorTargetX = event.clientX;
    cursorTargetY = event.clientY;
    cursorActive = true;
    targetX = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2));
    targetY = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2));
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    clickBumpStartedAt = performance.now();
    if (!finePointer.matches || event.pointerType === 'touch') return;
    sparks.push({
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      rays: Array.from({ length: 10 }, (_, index) => ({
        angle: (Math.PI * 2 * index / 10) + (Math.random() - 0.5) * 0.28,
        length: 18 + Math.random() * 28,
      })),
    });
  };
  const resetPointer = () => { targetX = 0; targetY = 0; cursorActive = false; };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('blur', resetPointer);

  let elapsedMs = 0;
  let currentX = 0;
  let currentY = 0;
  let birdX = window.innerWidth;
  let birdPaused = false;
  let birdPauseRemaining = 0;

  const sketch = (p: p5) => {
    p.setup = () => {
      const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
      canvas.elt.classList.add('scene-motion-canvas');
      canvas.elt.setAttribute('aria-hidden', 'true');
      p.pixelDensity(1);
    };

    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight);

    p.draw = () => {
      const dt = Math.min(p.deltaTime || 16, 64);
      elapsedMs += dt;
      p.clear();
      const cursorBlend = 1 - Math.exp(-dt / 32);
      cursorX = p.lerp(cursorX, cursorTargetX, cursorBlend);
      cursorY = p.lerp(cursorY, cursorTargetY, cursorBlend);
      if (cursorActive) {
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(cursorX - last.x, cursorY - last.y) > 1.5) {
          trail.push({ x: cursorX, y: cursorY, time: p.millis() });
        }
      }
      while (trail.length && p.millis() - (trail[0]?.time ?? 0) > 320) trail.shift();

      (p.drawingContext as CanvasRenderingContext2D).lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const from = trail[i - 1];
        const to = trail[i];
        if (!from || !to) continue;
        const ageFade = Math.max(0, 1 - (p.millis() - to.time) / 320);
        const tailFade = (i / (trail.length - 1)) ** 1.4;
        p.stroke(255, 220 * ageFade * tailFade);
        p.strokeWeight(0.8 + 2.2 * tailFade);
        p.line(from.x, from.y, to.x, to.y);
      }

      const sparkNow = performance.now();
      for (let index = sparks.length - 1; index >= 0; index--) {
        const spark = sparks[index];
        if (!spark) continue;
        const progress = (sparkNow - spark.time) / 520;
        if (progress >= 1) { sparks.splice(index, 1); continue; }
        const travel = 1 - (1 - progress) ** 1.4;
        const alpha = 255 * (1 - progress) ** 1.5;
        p.noStroke();
        p.fill(255, alpha);
        for (const ray of spark.rays) {
          const x = spark.x + Math.cos(ray.angle) * ray.length * travel;
          const y = spark.y + Math.sin(ray.angle) * ray.length * travel;
          p.circle(x, y, 2.2);
        }
      }

      const blend = 1 - Math.exp(-dt / 180);
      currentX = p.lerp(currentX, targetX, blend);
      currentY = p.lerp(currentY, targetY, blend);
      const horizontalRange = Math.min(window.innerWidth * 0.012, 10);
      const verticalRange = Math.min(window.innerHeight * 0.012, 10);

      if (birdPaused) {
        birdPauseRemaining -= dt;
        if (birdPauseRemaining <= 0) birdPaused = false;
      } else {
        const birds = layers.find((layer) => layer.isBirds);
        const birdWidth = birds?.element.getBoundingClientRect().width ?? 457;
        const distance = window.innerWidth + birdWidth + window.innerWidth * 0.02;
        const exitX = -birdWidth - window.innerWidth * 0.02;
        birdX -= (distance / birdTravelMs) * dt;
        if (birdX <= exitX) {
          birdX = window.innerWidth;
          birdPaused = true;
          birdPauseRemaining = p.random(5_000, 10_000);
        }
      }

      for (const layer of layers) {
        const parallaxX = -currentX * horizontalRange * layer.depth;
        const parallaxY = -currentY * verticalRange * layer.depth;
        const loopWidth = layer.element.clientWidth;
        const loopOffset = layer.loopSpeed && loopWidth > 0
          ? (elapsedMs * layer.loopSpeed / 1_000) % loopWidth
          : 0;
        const trainShakeY = layer.isTrain
          ? Math.sin(elapsedMs * Math.PI * 2 / 1_900) * 2.4
            + trainBump(elapsedMs - 8_000)
            + trainBump(performance.now() - clickBumpStartedAt)
          : 0;

        layer.element.style.setProperty('--parallax-x', `${parallaxX.toFixed(2)}px`);
        layer.element.style.setProperty('--parallax-y', `${parallaxY.toFixed(2)}px`);
        layer.element.style.setProperty('--train-shake-y', `${trainShakeY.toFixed(2)}px`);
        layer.element.style.setProperty('--scene-drift-x', '0px');
        layer.loopCopies.forEach((copy, index) => {
          copy.style.left = `${(index - 1) * loopWidth + loopOffset}px`;
        });
        if (layer.isBirds) layer.element.style.setProperty('--bird-x', `${birdX.toFixed(2)}px`);
      }
    };
  };

  new p5(sketch);
}
