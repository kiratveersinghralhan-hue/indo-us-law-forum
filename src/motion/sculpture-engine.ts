import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionSettings } from '../config/motion';

gsap.registerPlugin(ScrollTrigger);

export interface SculptureOptions {
  reduced: boolean;
  finePointer: boolean;
  covers?: string[];
  onSelect?: (index: number) => void;
}

// One isolated canvas. Preferences affect animation, never scene eligibility.
export function mountSculpture(
  host: HTMLElement,
  {
    reduced = false,
    finePointer = false,
    covers = [],
    onSelect,
  }: Partial<SculptureOptions> = {},
): () => void {
  let renderer: THREE.WebGLRenderer | undefined;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const cleanups: (() => void)[] = [];
  let frame = 0;
  let disposed = false;
  let failed = false;
  const stage = host.parentElement;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    cleanups
      .splice(0)
      .reverse()
      .forEach((cleanup) => cleanup());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    stage?.removeAttribute('data-webgl');
  };
  try {
    stage?.setAttribute('data-webgl-status', 'loading');
    const css = getComputedStyle(document.documentElement);
    const color = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const ivory = color('--color-ivory', '#ffffff');
    const charcoal = color('--stele-board', '#0d2246');
    const copper = color('--stele-board-selected', '#1d4a8a');
    const isCompact = () => window.innerWidth <= 768 || host.clientWidth < 300;
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      // Keep thin copper rules smooth even at the compact DPR cap.
      antialias: true,
      powerPreference: 'low-power',
    });
    const activeRenderer = renderer;
    activeRenderer.setClearColor(0x000000, 0);
    activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    activeRenderer.toneMappingExposure = motionSettings.exposure;
    const canvas = activeRenderer.domElement;
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    const scene = new THREE.Scene();
    // A long lens keeps the architecture nearly orthographic and monumental.
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(ivory, '#0a1a33', 1.15));
    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(-4, 6, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#c9d7ec', 0.7);
    fill.position.set(5, 0.5, 3);
    scene.add(fill);
    // A cool rim from behind draws the page edges against the navy ground.
    const rim = new THREE.DirectionalLight('#8fb0e0', 1.6);
    rim.position.set(2.5, 3, -6);
    scene.add(rim);
    const sculpture = new THREE.Group();
    sculpture.rotation.set(-0.09, -0.22, -0.035);
    scene.add(sculpture);
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: color('--color-sculpture-paper', '#ffffff'),
      roughness: 0.92,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: charcoal,
      roughness: 0.62,
      metalness: 0.15,
    });
    const copperMaterial = new THREE.MeshStandardMaterial({
      color: copper,
      roughness: 0.5,
      metalness: 0.3,
    });
    const ruleMaterial = new THREE.MeshStandardMaterial({
      color: '#a8bad1',
      roughness: 0.9,
    });
    // The architecture reuses the volume materials: the four-material budget
    // (and its disposal contract) is unchanged.
    const stoneMaterial = darkMaterial;
    const monolithMaterial = paperMaterial;
    const inlayMaterial = paperMaterial;
    [paperMaterial, darkMaterial, copperMaterial, ruleMaterial].forEach(
      (material) => materials.add(material),
    );
    // One shared unit cube, scaled per mesh, serves every architectural part.
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    geometries.add(unitBox);
    function box(
      width: number,
      height: number,
      depth: number,
      material: THREE.Material,
    ) {
      const mesh = new THREE.Mesh(unitBox, material);
      mesh.scale.set(width, height, depth);
      return mesh;
    }
    // The Stele: a stepped stone plinth and an incised monolith hold the
    // publication volumes. Pure geometry; no extra textures or canvases.
    const architecture = new THREE.Group();
    const base = box(4.4, 0.22, 1.8, stoneMaterial);
    base.position.set(0, -1.42, -0.15);
    architecture.add(base);
    const step = box(3.7, 0.14, 1.4, stoneMaterial);
    step.position.set(0, -1.24, -0.15);
    architecture.add(step);
    const inlay = box(3.7, 0.012, 0.012, inlayMaterial);
    inlay.position.set(0, -1.17, 0.55);
    architecture.add(inlay);
    const monolith = box(0.86, 3.75, 0.24, monolithMaterial);
    monolith.position.set(0.5, 0.7, -1.05);
    architecture.add(monolith);
    // Inscription rules and a vertical channel cut into the monolith face.
    for (let line = 0; line < 6; line++) {
      const rule = box(
        line % 3 === 2 ? 0.34 : 0.56,
        0.014,
        0.012,
        darkMaterial,
      );
      rule.position.set(
        0.5 - (line % 3 === 2 ? 0.11 : 0),
        2.3 - line * 0.11,
        -0.925,
      );
      architecture.add(rule);
    }
    const channel = box(0.018, 1.5, 0.012, darkMaterial);
    channel.position.set(0.84, 0.95, -0.925);
    architecture.add(channel);
    sculpture.add(architecture);
    // Three dimensional volumes; selection brings one forward, never a second rotor.
    let selected = Number(stage?.dataset.selectedCover ?? 0);
    const configurations = [
      { x: -1.05, y: 0.02, z: -0.24, ry: -0.24, rz: 0.035 },
      { x: 0.02, y: -0.02, z: 0.02, ry: -0.12, rz: -0.012 },
      { x: 1.08, y: 0.02, z: -0.3, ry: 0.13, rz: -0.035 },
    ];
    const panels = configurations
      .slice(0, Math.max(1, covers.length))
      .map((config, index) => {
        const panel = new THREE.Group();
        const pages = box(1.43, 2.14, 0.13, paperMaterial);
        panel.add(pages);
        const back = box(1.5, 2.22, 0.025, darkMaterial);
        back.position.z = -0.08;
        panel.add(back);
        const front = box(
          1.5,
          2.22,
          0.025,
          index === 0 ? copperMaterial : darkMaterial,
        );
        front.position.z = 0.08;
        panel.add(front);
        const spine = box(0.065, 2.22, 0.18, darkMaterial);
        spine.position.x = -0.735;
        panel.add(spine);
        // Page-edge rules are geometry, not additional textures or canvases.
        for (let line = 0; line < 3; line++) {
          const edge = box(1.41, 0.006, 0.006, ruleMaterial);
          edge.position.set(0, -1.075, -0.04 + line * 0.04);
          panel.add(edge);
        }
        if (covers[index]) {
          const texture = new THREE.TextureLoader().load(
            covers[index],
            () => {
              if (disposed || failed) return;
              const image = texture.image as { width: number; height: number };
              const ratio = image.width / image.height;
              const frameRatio = 1.46 / 2.18;
              // Fit actual artwork inside the cover; never stretch or crop it.
              if (ratio > frameRatio) cover.scale.y = frameRatio / ratio;
              else cover.scale.x = ratio / frameRatio;
              dirty = true;
              schedule();
            },
            undefined,
            () => {
              if (disposed || failed) return;
              failed = true;
              stage?.setAttribute('data-webgl-status', 'artwork-unavailable');
              dispose();
            },
          );
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            8,
            activeRenderer.capabilities?.getMaxAnisotropy() ?? 1,
          );
          textures.add(texture);
          const coverMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.72,
            metalness: 0,
            toneMapped: false,
          });
          materials.add(coverMaterial);
          const geometry = new THREE.PlaneGeometry(1.46, 2.18);
          geometries.add(geometry);
          const cover = new THREE.Mesh(geometry, coverMaterial);
          cover.position.z = 0.095;
          panel.add(cover);
        }
        panel.position.set(
          config.x,
          config.y,
          config.z + (index === selected ? 0.65 : 0),
        );
        panel.rotation.set(0, config.ry, config.rz);
        panel.userData.coverIndex = index;
        sculpture.add(panel);
        return { panel, config };
      });
    const bounds = new THREE.Box3().setFromObject(sculpture);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const progress = { depth: 0, yaw: 0, pitch: 0, fan: 0 };
    const pointer = { x: 0, y: 0 };
    let intersecting = false;
    let dirty = true;
    let lastRendered = 0;
    let lastAnimation = 0;
    let previousWidth = 0,
      previousHeight = 0,
      previousPixelRatio = 0;
    let compact = isCompact();
    let needsFrames = true;
    let compactLimited = false;
    let slowFrames = 0;
    let animationTime = 0;
    let renderedFrames = 0;
    let minFrameTime = 1000 / motionSettings.maxFramesPerSecond;
    const render = (now: number) => {
      frame = 0;
      if (disposed || failed || !intersecting || document.hidden) return;
      const elapsed = now - lastRendered;
      if (reduced || elapsed + 0.5 >= minFrameTime) {
        const frameStarted = performance.now();
        const delta = Math.min((now - lastAnimation) / 1000, 0.08);
        lastAnimation = now;
        // Carry the frame-time remainder instead of drifting onto alternate RAFs.
        lastRendered =
          dirty || elapsed > minFrameTime * 2
            ? now
            : lastRendered +
              Math.max(1, Math.floor((elapsed + 0.5) / minFrameTime)) *
                minFrameTime;
        if (!reduced) {
          animationTime += delta;
          needsFrames = false;
          const approach = (current: number, target: number, damping: number) => {
            const next = THREE.MathUtils.lerp(current, target, damping);
            if (Math.abs(target - next) > 0.0005) needsFrames = true;
            return next;
          };
          const damping = 1 - Math.exp(-5.5 * delta);
          // Full mode only: the stele rises and turns into its resting pose.
          const settle =
            1 -
            Math.pow(
              1 - Math.min(1, animationTime / motionSettings.steleEntrance),
              3,
            );
          if (settle < 1) needsFrames = true;
          sculpture.position.y = (1 - settle) * -0.55;
          sculpture.rotation.x = approach(
            sculpture.rotation.x,
            -0.09 + progress.pitch + pointer.y * motionSettings.pointerRotation,
            damping,
          );
          sculpture.rotation.y = approach(
            sculpture.rotation.y,
            -0.22 +
              (1 - settle) * 0.4 +
              progress.yaw +
              pointer.x * motionSettings.pointerRotation,
            damping,
          );
          sculpture.position.z = approach(
            sculpture.position.z,
            progress.depth,
            damping,
          );
          panels.forEach(({ panel, config }, index) => {
            const forward = index === selected ? 0.65 : -0.12;
            panel.position.z = approach(
              panel.position.z,
              config.z + forward,
              damping,
            );
            panel.position.x = approach(
              panel.position.x,
              config.x * (1 + progress.fan * 0.15),
              damping,
            );
            panel.position.y = approach(
              panel.position.y,
              config.y +
                (index === selected ? 0.15 : 0) +
                (compact
                  ? 0
                  : Math.sin(animationTime * 0.5 + index * 0.9) *
                    motionSettings.floatAmplitude),
              damping,
            );
          });
        }
        try {
          activeRenderer.render(scene, camera);
        } catch {
          failed = true;
          stage?.setAttribute('data-webgl-status', 'render-failed');
          dispose();
          return;
        }
        // Responsive compact interaction bursts; return to the existing 30fps
        // budget after sustained expensive CPU submission, never from one compile.
        if (compact && !reduced && !compactLimited) {
          const cost = performance.now() - frameStarted;
          slowFrames = cost > 1000 / motionSettings.maxFramesPerSecond * 0.7
            ? slowFrames + 1
            : Math.max(0, slowFrames - 1);
          if (slowFrames >= 8) {
            compactLimited = true;
            minFrameTime = 1000 / motionSettings.compactFramesPerSecond;
          }
        }
        dirty = false;
        if (stage?.getAttribute('data-webgl') !== 'ready') {
          stage?.setAttribute('data-webgl', 'ready');
          stage?.setAttribute('data-webgl-status', 'ready');
        }
        if (import.meta.env.DEV) {
          canvas.dataset.renderedFrames = String(++renderedFrames);
          canvas.dataset.depth = sculpture.position.z.toFixed(3);
          canvas.dataset.rotation = `${sculpture.rotation.x.toFixed(3)},${sculpture.rotation.y.toFixed(3)}`;
          canvas.dataset.pointer = `${pointer.x.toFixed(3)},${pointer.y.toFixed(3)}`;
          canvas.dataset.cameraDistance = camera.position.z.toFixed(3);
          canvas.dataset.rendering = reduced ? 'idle' : 'active';
          canvas.dataset.selectedCover = String(selected);
          canvas.dataset.selectionDepth =
            panels[selected]?.panel.position.z.toFixed(3) ?? '0';
        }
      }
      if (!reduced && (!compact || needsFrames))
        frame = requestAnimationFrame(render);
      else if (import.meta.env.DEV) canvas.dataset.rendering = 'idle';
    };
    const schedule = () => {
      const paused = !intersecting || document.hidden;
      if (import.meta.env.DEV)
        canvas.dataset.rendering = paused
          ? 'paused'
          : reduced
            ? 'idle'
            : 'active';
      if (paused || failed || disposed) {
        cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      if (!frame && (!reduced || dirty)) {
        if (!reduced) needsFrames = true;
        lastRendered = performance.now() - minFrameTime;
        lastAnimation = lastRendered;
        frame = requestAnimationFrame(render);
      }
    };
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      compact = isCompact();
      const pixelCap = compact
        ? motionSettings.compactPixelRatio
        : window.innerWidth <= 1024
          ? motionSettings.tabletPixelRatio
          : motionSettings.maxPixelRatio;
      const ratio = Math.min(window.devicePixelRatio || 1, pixelCap);
      if (
        ratio !== previousPixelRatio ||
        width !== previousWidth ||
        height !== previousHeight
      ) {
        if (ratio !== previousPixelRatio) activeRenderer.setPixelRatio(ratio);
        activeRenderer.setSize(width, height, false);
        previousWidth = width;
        previousHeight = height;
        previousPixelRatio = ratio;
      }
      minFrameTime =
        1000 /
        (compact && compactLimited
          ? motionSettings.compactFramesPerSecond
          : motionSettings.maxFramesPerSecond);
      camera.aspect = width / height;
      // Fit the rotated composition to both container dimensions with motion margin.
      const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      camera.position.set(
        center.x,
        center.y,
        Math.max(
          motionSettings.cameraDistance,
          (Math.max(size.y, size.x / camera.aspect) *
            motionSettings.framingPadding) /
            (2 * Math.tan(halfFov)) +
            bounds.max.z,
        ),
      );
      camera.lookAt(center.x, center.y, 0);
      camera.updateProjectionMatrix();
      if (import.meta.env.DEV)
        canvas.dataset.detail = compact ? 'compact' : 'full';
      dirty = true;
      schedule();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener('resize', resize);
    cleanups.push(() => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
    });
    resize();
    const select = (event: Event) => {
      const index = Number((event as CustomEvent<number>).detail);
      if (!Number.isInteger(index) || index < 0 || index >= panels.length)
        return;
      selected = index;
      if (reduced)
        panels.forEach(({ panel, config }, i) => {
          panel.position.z = config.z + (i === selected ? 0.65 : -0.12);
          panel.position.y = config.y + (i === selected ? 0.15 : 0);
        });
      dirty = true;
      schedule();
    };
    const raycaster = new THREE.Raycaster();
    const click = (event: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        panels.map(({ panel }) => panel),
        true,
      )[0];
      if (!hit) return;
      let object: THREE.Object3D = hit.object;
      while (object.parent && object.userData.coverIndex === undefined)
        object = object.parent;
      if (object.userData.coverIndex !== undefined)
        onSelect?.(object.userData.coverIndex as number);
    };
    host.addEventListener('publication-select', select);
    host.addEventListener('click', click);
    cleanups.push(() => {
      host.removeEventListener('publication-select', select);
      host.removeEventListener('click', click);
    });
    if (!reduced) {
      // A GSAP failure must not prevent the real scene from rendering.
      try {
        const scrollTween = gsap.to(progress, {
          depth: motionSettings.scrollDepth,
          yaw: motionSettings.scrollYaw,
          pitch: motionSettings.scrollPitch,
          fan: 1,
          ease: 'none',
          onUpdate: () => {
            dirty = true;
            schedule();
          },
          scrollTrigger: {
            trigger: host.closest('.hero') ?? host,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.35,
          },
        });
        cleanups.push(() => {
          scrollTween.scrollTrigger?.kill();
          scrollTween.kill();
        });
      } catch {
        /* Static depth remains a safe progressive enhancement. */
      }
      if (finePointer) {
        let pointerBounds: DOMRect | null = null;
        const invalidateBounds = () => {
          pointerBounds = null;
        };
        const enter = () => {
          pointerBounds = host.getBoundingClientRect();
        };
        const move = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return;
          const rect = (pointerBounds ??= host.getBoundingClientRect());
          pointer.x = THREE.MathUtils.clamp(
            ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2,
            -1,
            1,
          );
          pointer.y = THREE.MathUtils.clamp(
            ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2,
            -1,
            1,
          );
          dirty = true;
          schedule();
        };
        const reset = () => {
          pointer.x = 0;
          pointer.y = 0;
          dirty = true;
          schedule();
        };
        host.addEventListener('pointermove', move);
        host.addEventListener('pointerenter', enter);
        host.addEventListener('pointerleave', reset);
        window.addEventListener('resize', invalidateBounds);
        window.addEventListener('scroll', invalidateBounds, { passive: true });
        cleanups.push(() => {
          host.removeEventListener('pointermove', move);
          host.removeEventListener('pointerenter', enter);
          host.removeEventListener('pointerleave', reset);
          window.removeEventListener('resize', invalidateBounds);
          window.removeEventListener('scroll', invalidateBounds);
        });
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.01 },
    );
    observer.observe(host);
    document.addEventListener('visibilitychange', schedule);
    cleanups.push(() => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    });
    const contextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      stage?.setAttribute('data-webgl-status', 'context-lost');
      dispose();
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    cleanups.push(() =>
      canvas.removeEventListener('webglcontextlost', contextLost),
    );
  } catch {
    stage?.setAttribute('data-webgl-status', 'unavailable');
    dispose();
  }
  return dispose;
}
