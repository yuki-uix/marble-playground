import * as THREE from 'three';
import { SLOTS, TARGET, initialBall, type Ball, type Piece } from './physics';
export type SceneHandle = {
  setPieces: (pieces: Piece[], selected: number | null) => void;
  render: (ball: Ball | null, time: number) => void;
  dispose: () => void;
};
export function createScene(
  host: HTMLDivElement,
  onSlot: (index: number) => void,
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 100);
  camera.position.set(2.5, 8.5, 24);
  camera.lookAt(0, 4.7, 0);
  scene.add(new THREE.HemisphereLight(0xe2f4ff, 0x2a4075, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 3.4);
  sun.position.set(-5, 13, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 12, bottom: -8 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x80baff, 1.8);
  fill.position.set(8, 4, 5);
  scene.add(fill);
  const mat = (color: number, metalness = 0, roughness = 0.4) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const blue = mat(0x4567d9),
    edge = mat(0x27459f),
    pink = mat(0xf499c4),
    green = mat(0x63e6b0),
    yellow = mat(0xffd54a, 0.25, 0.22);
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(9.5, 10.9, 0.5, 0, 4.85, -0.52, edge);
  box(9.1, 10.5, 0.18, 0, 4.85, -0.2, blue);
  box(0.17, 10.4, 0.48, -4.53, 4.85, 0.08, edge);
  box(0.17, 10.4, 0.48, 4.53, 4.85, 0.08, edge);
  // Fine engraved grid and mounting sockets are actual scene geometry.
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x8ca9ff,
    transparent: true,
    opacity: 0.16,
  });
  for (let x = -4; x <= 4; x += 0.5) {
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, -0.25, -0.09),
          new THREE.Vector3(x, 10, -0.09),
        ]),
        gridMaterial,
      ),
    );
  }
  for (let y = 0; y <= 10; y += 0.5) {
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-4.4, y, -0.09),
          new THREE.Vector3(4.4, y, -0.09),
        ]),
        gridMaterial,
      ),
    );
  }
  const slots: SizedMesh[] = [];
  type SizedMesh = THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshStandardMaterial
  >;
  SLOTS.forEach((s, i) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24),
      mat(0x9cb8ff),
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(s.x, s.y, 0.01);
    m.userData.slot = i;
    scene.add(m);
    slots.push(m);
  });
  const spawn = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.075, 12, 40),
    yellow,
  );
  spawn.position.set(-3, 9.1, 0.08);
  scene.add(spawn);
  const cup = new THREE.Group();
  cup.position.set(TARGET.x, 0, 0);
  scene.add(cup);
  box(TARGET.width + 0.16, 0.13, 0.65, 0, 0.14, 0.18, green, cup);
  box(0.13, 0.57, 0.65, -TARGET.width / 2, 0.4, 0.18, green, cup);
  box(0.13, 0.57, 0.65, TARGET.width / 2, 0.4, 0.18, green, cup);
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 32, 24),
    yellow,
  );
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  const piecesGroup = new THREE.Group();
  scene.add(piecesGroup);
  const selection = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.025, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffeb9b }),
  );
  selection.visible = false;
  selection.position.z = 0.13;
  scene.add(selection);
  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0xffe69a,
    transparent: true,
    opacity: 0.65,
  });
  const trail = new THREE.Line(new THREE.BufferGeometry(), trailMaterial);
  scene.add(trail);
  let points: THREE.Vector3[] = [];
  let lastTime = -1;
  const confetti = Array.from({ length: 35 }, (_, i) => {
    const m = box(
      0.09,
      0.16,
      0.025,
      0,
      0,
      0.7,
      mat([0xffd54a, 0x63e6b0, 0xf499c4, 0xffffff][i % 4]),
    );
    m.visible = false;
    return m;
  });
  function disposeTree(root: THREE.Object3D) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        for (const material of Array.isArray(m.material)
          ? m.material
          : [m.material])
          material.dispose();
      }
    });
  }
  function setPieces(pieces: Piece[], selected: number | null) {
    // Per-piece materials are owned by this subtree.
    disposeTree(piecesGroup);
    piecesGroup.clear();
    pieces.forEach((p) => {
      const s = SLOTS[p.slot];
      const group = new THREE.Group();
      group.position.set(s.x, s.y, 0.2);
      group.rotation.z = (p.angle * Math.PI) / 180;
      if (p.kind === 'spring') {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.4, 32),
          mat(0xf499c4, 0.1),
        );
        m.rotation.x = Math.PI / 2;
        group.add(m);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.035, 8, 32),
          mat(0xffd5e9),
        );
        ring.position.z = 0.23;
        group.add(ring);
        box(0.12, 0.33, 0.03, 0, 0, 0.23, mat(0xffffff), group);
        box(0.33, 0.12, 0.03, 0, 0, 0.23, mat(0xffffff), group);
      } else {
        box(
          1.76,
          0.2,
          0.42,
          0,
          0,
          0,
          mat(p.kind === 'ramp' ? 0xffcf55 : 0x86c8ff),
          group,
        );
        for (const x of [-0.71, 0.71]) {
          const screw = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 12, 8),
            mat(0xffffff, 0.4),
          );
          screw.position.set(x, 0, 0.23);
          group.add(screw);
        }
      }
      piecesGroup.add(group);
    });
    slots.forEach((s, i) => {
      s.material.color.setHex(
        pieces.some((p) => p.slot === i) ? 0x4e78d7 : 0x9cb8ff,
      );
    });
    selection.visible = selected !== null;
    if (selected !== null)
      selection.position.set(SLOTS[selected].x, SLOTS[selected].y, 0.48);
  }
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hit = new THREE.Vector3();
  function onPointer(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    let nearest = -1,
      d = 0.92;
    SLOTS.forEach((s, i) => {
      const distance = Math.hypot(hit.x - s.x, hit.y - s.y);
      if (distance < d) {
        d = distance;
        nearest = i;
      }
    });
    if (nearest >= 0) onSlot(nearest);
  }
  renderer.domElement.addEventListener('pointerdown', onPointer);
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const aspect = w / h;
    const halfHeight = Math.max(5.9, 5.4 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    setPieces,
    render(ball, time) {
      const b = ball ?? initialBall();
      ballMesh.position.set(b.x, b.y, 0.35);
      ballMesh.rotation.x = b.y;
      ballMesh.rotation.y = b.x;
      spawn.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
      if (!ball || b.time < lastTime) {
        points = [];
        lastTime = -1;
      }
      if (ball && b.time > lastTime + 0.035) {
        points.push(new THREE.Vector3(b.x, b.y, 0.29));
        if (points.length > 450) points.shift();
        lastTime = b.time;
        trail.geometry.dispose();
        trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
      trail.visible = !!ball;
      confetti.forEach((m, i) => {
        m.visible = b.status === 'won';
        if (m.visible) {
          const t = (time * 0.65 + i * 0.17) % 2;
          m.position.set(
            TARGET.x + Math.sin(i * 8.7) * t * 2,
            1.1 + Math.cos(i * 3) * t + 3 * t - 2 * t * t,
            0.8,
          );
          m.rotation.z = time + i;
        }
      });
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointer);
      disposeTree(scene);
      pink.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
