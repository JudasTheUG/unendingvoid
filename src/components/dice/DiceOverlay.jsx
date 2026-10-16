import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useDiceSync, publishRoll } from '../../hooks/useDiceSync';

// Synthesize a realistic sci-fi mechanical clatter sound using Web Audio API
function playDiceClatterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    for (let i = 0; i < 4; i++) {
      const delay = i * 0.08 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(180 + Math.random() * 140, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + delay + 0.09);

      gain.gain.setValueAtTime(0.14, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.1);
    }
  } catch (err) {
    // Audio might be blocked prior to user interaction
  }
}

// Color palettes per die type
const DIE_THEMES = {
  d4: { border: '#eab308', glow: 'rgba(234, 179, 8, 0.6)', baseColor: 0x1f1908, label: 'D4' },
  d6: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)', baseColor: 0x240808, label: 'D6' },
  d8: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)', baseColor: 0x261406, label: 'D8' },
  d10: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.6)', baseColor: 0x062215, label: 'D10' },
  d12: { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', baseColor: 0x1d082d, label: 'D12' },
  d20: { border: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)', baseColor: 0x051b2a, label: 'D20' },
};

/**
 * Generate high-resolution canvas texture with engraved glowing numbers.
 * For polyhedra (d4, d8, d10, d12, d20), the background is 100% transparent so
 * the laser-etched engraved number sits directly on the die's metallic surface.
 * For d6 (cube), draws a complete brushed sci-fi panel mapped to the BoxGeometry face.
 */
function createEngravedFaceTexture(number, dieType, isBoxFace = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;

  ctx.clearRect(0, 0, 256, 256);

  if (isBoxFace) {
    // Brushed metallic sci-fi background panel for cube
    const bgGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 130);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 256);

    // Beveled cybernetic border
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 236);

    // Corner notches
    ctx.fillStyle = theme.border;
    ctx.fillRect(6, 6, 14, 14);
    ctx.fillRect(236, 6, 14, 14);
    ctx.fillRect(6, 236, 14, 14);
    ctx.fillRect(236, 236, 14, 14);
  }

  // Engraved number typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = number >= 10 ? 100 : 124;
  ctx.font = `900 ${fontSize}px "Orbitron", monospace, sans-serif`;

  // 1. Deep carved physical shadow (offset down-right into metal face)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillText(String(number), 131, 132);

  // 2. Etched groove border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = 8;
  ctx.strokeText(String(number), 128, 128);

  // 3. Sci-Fi Glowing core
  ctx.shadowColor = theme.border;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(number), 128, 128);

  // 4. Subtle theme color tint on inner edge
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3;
  ctx.strokeText(String(number), 128, 128);
  ctx.shadowBlur = 0;

  // Disambiguation line under 6 and 9
  if (number === 6 || number === 9) {
    ctx.fillStyle = theme.border;
    ctx.fillRect(88, 192, 80, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Calculates a target settling Quaternion that orients faceNormal directly towards
 * the camera and aligns faceUp with camera/world up (0, 1, 0).
 */
function computeSettlingQuaternion(faceNormal, faceUp, cameraLookDir) {
  // World target directions:
  const z_world = cameraLookDir.clone().normalize();
  let y_world = new THREE.Vector3(0, 1, 0).projectOnPlane(z_world);
  if (y_world.lengthSq() < 0.001) {
    y_world = new THREE.Vector3(0, 0, 1).projectOnPlane(z_world);
  }
  y_world.normalize();
  const x_world = new THREE.Vector3().crossVectors(y_world, z_world).normalize();
  const mWorld = new THREE.Matrix4().makeBasis(x_world, y_world, z_world);

  // Die local face directions:
  const z_die = faceNormal.clone().normalize();
  let y_die = faceUp.clone().projectOnPlane(z_die);
  if (y_die.lengthSq() < 0.001) {
    y_die = new THREE.Vector3(0, 1, 0).projectOnPlane(z_die);
  }
  if (y_die.lengthSq() < 0.001) {
    y_die = new THREE.Vector3(0, 0, 1).projectOnPlane(z_die);
  }
  y_die.normalize();
  const x_die = new THREE.Vector3().crossVectors(y_die, z_die).normalize();
  const mDie = new THREE.Matrix4().makeBasis(x_die, y_die, z_die);

  // M_target = M_world * M_die^T
  const mDieInv = mDie.clone().transpose();
  const mTarget = new THREE.Matrix4().multiplyMatrices(mWorld, mDieInv);

  return new THREE.Quaternion().setFromRotationMatrix(mTarget);
}

/**
 * Build authentic D10 Pentagonal Trapezohedron geometry with 10 kite faces.
 */
function createD10Data() {
  const topApex = new THREE.Vector3(0, 2.3, 0);
  const botApex = new THREE.Vector3(0, -2.3, 0);
  const R = 2.0;

  const upperVerts = [];
  const lowerVerts = [];
  for (let k = 0; k < 5; k++) {
    const theta = (k * 2 * Math.PI) / 5;
    upperVerts.push(new THREE.Vector3(R * Math.cos(theta), 0.45, R * Math.sin(theta)));
    const phi = theta + Math.PI / 5;
    lowerVerts.push(new THREE.Vector3(R * Math.cos(phi), -0.45, R * Math.sin(phi)));
  }

  const positions = [];
  const faces = [];

  // Upper 5 kite faces (mapped to numbers 1, 3, 5, 7, 9)
  for (let k = 0; k < 5; k++) {
    const prevLower = lowerVerts[(k - 1 + 5) % 5];
    const currUpper = upperVerts[k];
    const currLower = lowerVerts[k];

    // Triangle 1: topApex, prevLower, currUpper
    positions.push(
      topApex.x, topApex.y, topApex.z,
      prevLower.x, prevLower.y, prevLower.z,
      currUpper.x, currUpper.y, currUpper.z
    );
    // Triangle 2: topApex, currUpper, currLower
    positions.push(
      topApex.x, topApex.y, topApex.z,
      currUpper.x, currUpper.y, currUpper.z,
      currLower.x, currLower.y, currLower.z
    );

    const center = new THREE.Vector3()
      .add(topApex)
      .add(prevLower)
      .add(currUpper)
      .add(currLower)
      .multiplyScalar(0.25);

    const normal = center.clone().normalize();
    const up = topApex.clone().sub(center).normalize();

    faces.push({ center, normal, up, number: k * 2 + 1 });
  }

  // Lower 5 kite faces (mapped to numbers 2, 4, 6, 8, 10)
  for (let k = 0; k < 5; k++) {
    const currUpper = upperVerts[k];
    const currLower = lowerVerts[k];
    const nextUpper = upperVerts[(k + 1) % 5];

    // Triangle 1: botApex, currUpper, currLower
    positions.push(
      botApex.x, botApex.y, botApex.z,
      currUpper.x, currUpper.y, currUpper.z,
      currLower.x, currLower.y, currLower.z
    );
    // Triangle 2: botApex, currLower, nextUpper
    positions.push(
      botApex.x, botApex.y, botApex.z,
      currLower.x, currLower.y, currLower.z,
      nextUpper.x, nextUpper.y, nextUpper.z
    );

    const center = new THREE.Vector3()
      .add(botApex)
      .add(currUpper)
      .add(currLower)
      .add(nextUpper)
      .multiplyScalar(0.25);

    const normal = center.clone().normalize();
    const up = botApex.clone().sub(center).negate().normalize();

    faces.push({ center, normal, up, number: (k + 1) * 2 });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  // Sort faces 1..10
  faces.sort((a, b) => a.number - b.number);

  return { geometry, faces };
}

/**
 * Build authentic D4 Tetrahedron (Pyramid) geometry with 4 triangular faces.
 */
function createD4Data() {
  const apex = new THREE.Vector3(0, 2.2, 0);
  const R = 2.4;
  const bY = -0.73;

  const b0 = new THREE.Vector3(R * Math.cos(0), bY, R * Math.sin(0));
  const b1 = new THREE.Vector3(R * Math.cos((2 * Math.PI) / 3), bY, R * Math.sin((2 * Math.PI) / 3));
  const b2 = new THREE.Vector3(R * Math.cos((4 * Math.PI) / 3), bY, R * Math.sin((4 * Math.PI) / 3));

  const triFaces = [
    { verts: [apex, b0, b1], number: 1, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b0).add(b1).multiplyScalar(1 / 3)).normalize() },
    { verts: [apex, b1, b2], number: 2, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b1).add(b2).multiplyScalar(1 / 3)).normalize() },
    { verts: [apex, b2, b0], number: 3, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b2).add(b0).multiplyScalar(1 / 3)).normalize() },
    { verts: [b0, b2, b1], number: 4, up: new THREE.Vector3(0, 0, 1) }, // Bottom base
  ];

  const positions = [];
  const faces = [];

  triFaces.forEach((f) => {
    f.verts.forEach((v) => positions.push(v.x, v.y, v.z));
    const center = new THREE.Vector3().add(f.verts[0]).add(f.verts[1]).add(f.verts[2]).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();
    faces.push({ center, normal, up: f.up, number: f.number });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

/**
 * Build authentic D8 Octahedron geometry with 8 triangular faces.
 */
function createD8Data() {
  const top = new THREE.Vector3(0, 2.2, 0);
  const bot = new THREE.Vector3(0, -2.2, 0);
  const e0 = new THREE.Vector3(2.2, 0, 0);
  const e1 = new THREE.Vector3(0, 0, 2.2);
  const e2 = new THREE.Vector3(-2.2, 0, 0);
  const e3 = new THREE.Vector3(0, 0, -2.2);

  const triFaces = [
    { verts: [top, e0, e1], number: 1, up: top },
    { verts: [top, e1, e2], number: 2, up: top },
    { verts: [top, e2, e3], number: 3, up: top },
    { verts: [top, e3, e0], number: 4, up: top },
    { verts: [bot, e1, e0], number: 5, up: bot.clone().negate() },
    { verts: [bot, e2, e1], number: 6, up: bot.clone().negate() },
    { verts: [bot, e3, e2], number: 7, up: bot.clone().negate() },
    { verts: [bot, e0, e3], number: 8, up: bot.clone().negate() },
  ];

  const positions = [];
  const faces = [];

  triFaces.forEach((f) => {
    f.verts.forEach((v) => positions.push(v.x, v.y, v.z));
    const center = new THREE.Vector3().add(f.verts[0]).add(f.verts[1]).add(f.verts[2]).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();
    const up = f.up.clone().sub(center).normalize();
    faces.push({ center, normal, up, number: f.number });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

/**
 * Extract unique face centers, normals, and up vectors from standard Three.js polyhedra.
 */
function extractPolyhedronFaces(geometry, expectedFaces) {
  const pos = geometry.attributes.position;
  const rawFaces = [];

  for (let i = 0; i < pos.count; i += 3) {
    const vA = new THREE.Vector3().fromBufferAttribute(pos, i);
    const vB = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const center = new THREE.Vector3().add(vA).add(vB).add(vC).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();

    // Group triangles that share face normal (e.g. Dodecahedron 3 triangles per pentagon)
    const existing = rawFaces.find((f) => f.normal.distanceTo(normal) < 0.18);
    if (existing) {
      existing.centers.push(center);
    } else {
      rawFaces.push({ normal, centers: [center] });
    }
  }

  // Calculate averaged center per grouped face
  const faces = rawFaces.slice(0, expectedFaces).map((rf, idx) => {
    const avgCenter = new THREE.Vector3();
    rf.centers.forEach((c) => avgCenter.add(c));
    avgCenter.multiplyScalar(1 / rf.centers.length);
    const normal = avgCenter.clone().normalize();

    // Up vector pointing towards +Y
    let up = new THREE.Vector3(0, 1, 0).projectOnPlane(normal);
    if (up.lengthSq() < 0.001) {
      up = new THREE.Vector3(0, 0, 1).projectOnPlane(normal);
    }
    up.normalize();

    return {
      center: avgCenter,
      normal,
      up,
      number: idx + 1,
    };
  });

  return faces;
}

export default function DiceOverlay({ user, profile, modifier = 0 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const diceGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const [activeRollBanner, setActiveRollBanner] = useState(null);
  const [notation, setNotation] = useState('1d20');
  const [isRolling, setIsRolling] = useState(false);
  const [recentRolls, setRecentRolls] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // High quality sci-fi metallic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00f0ff, 3.0);
    keyLight.position.set(12, 18, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff00aa, 2.2);
    fillLight.position.set(-12, -10, 10);
    scene.add(fillLight);

    const diceGroup = new THREE.Group();
    scene.add(diceGroup);
    diceGroupRef.current = diceGroup;

    const handleResize = () => {
      if (!container) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();
    const animate = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (diceGroup && diceGroup.children.length > 0) {
        diceGroup.children.forEach((die) => {
          if (die.userData.animating) {
            die.userData.elapsed = (die.userData.elapsed || 0) + dt;

            // Physics motion
            die.position.x += die.userData.linVel.x * dt;
            die.position.y += die.userData.linVel.y * dt;
            die.userData.linVel.y -= 14.0 * dt; // gravity

            // Bounce floor at y = -1.8
            if (die.position.y < -1.8) {
              die.position.y = -1.8;
              die.userData.linVel.y *= -0.32;
              die.userData.linVel.x *= 0.7;
            }

            // Phase 1: High kinetic tumbling (0.0s to 0.75s)
            if (die.userData.elapsed < 0.75) {
              const deltaQuat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                  die.userData.rotVel.x * dt,
                  die.userData.rotVel.y * dt,
                  die.userData.rotVel.z * dt
                )
              );
              die.quaternion.multiplyQuaternions(deltaQuat, die.quaternion);
              die.userData.rotVel.multiplyScalar(Math.max(0, 1 - 1.2 * dt));
            } else if (die.userData.elapsed < 1.35) {
              // Phase 2: Smooth ease-out cubic slerp to target face (0.75s to 1.35s)
              if (!die.userData.settleStartQuat) {
                die.userData.settleStartQuat = die.quaternion.clone();
              }
              const progress = Math.min(1, Math.max(0, (die.userData.elapsed - 0.75) / 0.60));
              const ease = 1 - Math.pow(1 - progress, 3);
              if (die.userData.targetQuaternion) {
                die.quaternion.slerpQuaternions(die.userData.settleStartQuat, die.userData.targetQuaternion, ease);
              }
              die.userData.linVel.multiplyScalar(0.7);
            } else {
              // Phase 3: Completely settled and resting
              die.userData.animating = false;
              if (die.userData.targetQuaternion) {
                die.quaternion.copy(die.userData.targetQuaternion);
              }
            }
          }
        });
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Construct exact 3D Polyhedral Die with engraved numbers on faces
  const createDieMesh = (dieType, seed, targetResult) => {
    const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;
    const dieRoot = new THREE.Group();

    // Camera forward vector from settled die position (0, -1.8, -1) to camera (0, 1.5, 18)
    const cameraLookDir = new THREE.Vector3(0, 0.171, 0.985);

    if (dieType === 'd6') {
      // ──────────────── D6 CUBE (BoxGeometry) ────────────────
      const size = 2.4;
      const geometry = new THREE.BoxGeometry(size, size, size);

      // 6 materials directly mapped to the 6 flat faces of the box
      // Three.js order: +X (1), -X (6), +Y (2), -Y (5), +Z (3), -Z (4)
      const materials = [
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(1, 'd6', true), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(6, 'd6', true), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(2, 'd6', true), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(5, 'd6', true), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(3, 'd6', true), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(4, 'd6', true), roughness: 0.2, metalness: 0.8 }),
      ];

      const cubeMesh = new THREE.Mesh(geometry, materials);
      dieRoot.add(cubeMesh);

      // Wireframe edge accents
      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      dieRoot.add(new THREE.LineSegments(wireGeo, wireMat));

      // Face definitions for D6
      const d6Faces = {
        1: { normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
        6: { normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
        2: { normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
        5: { normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
        3: { normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
        4: { normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
      };

      const targetFace = d6Faces[targetResult] || d6Faces[1];
      dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetFace.normal, targetFace.up, cameraLookDir);
    } else {
      // ──────────────── POLYHEDRA (D4, D8, D10, D12, D20) ────────────────
      let geometry;
      let faces = [];
      let planeSize = 1.25;

      switch (dieType) {
        case 'd4': {
          // True Triangular Pyramid / Tetrahedron (4 faces)
          const data = createD4Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.35;
          break;
        }
        case 'd8': {
          // Octahedron (8 faces)
          const data = createD8Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.25;
          break;
        }
        case 'd10': {
          // Authentic Pentagonal Trapezohedron (10 kite faces)
          const data = createD10Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.15;
          break;
        }
        case 'd12': {
          // Dodecahedron (12 pentagonal faces)
          geometry = new THREE.DodecahedronGeometry(2.1);
          faces = extractPolyhedronFaces(geometry, 12);
          planeSize = 1.2;
          break;
        }
        case 'd20':
        default: {
          // Icosahedron (20 triangular faces)
          geometry = new THREE.IcosahedronGeometry(2.3);
          faces = extractPolyhedronFaces(geometry, 20);
          planeSize = 1.05;
          break;
        }
      }

      // Dark metallic solid body
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: theme.baseColor,
        roughness: 0.18,
        metalness: 0.88,
        emissive: new THREE.Color(theme.border),
        emissiveIntensity: 0.15,
      });
      const bodyMesh = new THREE.Mesh(geometry, baseMaterial);
      dieRoot.add(bodyMesh);

      // Glowing cybernetic wireframe edges
      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      dieRoot.add(new THREE.LineSegments(wireGeo, wireMat));

      // Attach laser-etched engraved number plates flush on each face
      faces.forEach((f) => {
        const plateGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        const plateMat = new THREE.MeshStandardMaterial({
          map: createEngravedFaceTexture(f.number, dieType, false),
          transparent: true,
          roughness: 0.2,
          metalness: 0.85,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const plate = new THREE.Mesh(plateGeo, plateMat);
        // Position flush against the face
        plate.position.copy(f.center).add(f.normal.clone().multiplyScalar(0.003));

        // Align plate orientation naturally with the face's up vector
        const z_plate = f.normal.clone().normalize();
        let y_plate = f.up.clone().projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 1, 0).projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 0, 1).projectOnPlane(z_plate);
        y_plate.normalize();
        const x_plate = new THREE.Vector3().crossVectors(y_plate, z_plate).normalize();
        const mPlate = new THREE.Matrix4().makeBasis(x_plate, y_plate, z_plate);
        plate.quaternion.setFromRotationMatrix(mPlate);

        dieRoot.add(plate);
      });

      // Target face normal: align the face with targetResult directly to camera
      const targetFace = faces.find((f) => f.number === targetResult) || faces[0];
      if (targetFace) {
        dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetFace.normal, targetFace.up, cameraLookDir);
      }
    }

    // Dynamic initial tumble physics
    const prng = (Math.sin(seed) * 10000) % 1;
    dieRoot.position.set(-5 + prng * 10, 6, -2);
    dieRoot.userData.animating = true;
    dieRoot.userData.elapsed = 0;
    dieRoot.userData.rotVel = new THREE.Vector3(
      15 + Math.random() * 16,
      17 + Math.random() * 16,
      13 + Math.random() * 16
    );
    dieRoot.userData.linVel = new THREE.Vector3(
      1.5 + Math.random() * 2,
      3.0 + Math.random() * 2.5,
      -1
    );

    return dieRoot;
  };

  // Trigger 3D tumble visual for local or networked roll
  const trigger3DVisual = useCallback((rollData) => {
    if (!diceGroupRef.current) return;
    const diceGroup = diceGroupRef.current;

    // Reset previous banner immediately so total is NEVER spoiled prematurely
    setActiveRollBanner(null);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);

    while (diceGroup.children.length > 0) {
      diceGroup.remove(diceGroup.children[0]);
    }

    playDiceClatterSound();

    // Parse dice notation accurately (e.g. "1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "2d6+3")
    const notationStr = rollData.diceNotation || rollData.notation || '1d20';
    const match = notationStr.match(/(\d*)d(\d+)/i) || [null, '1', '20'];
    const count = Math.min(Number(match[1]) || 1, 6);
    const dieSides = `d${match[2] || '20'}`;
    const seed = rollData.physics?.seed || Math.random() * 1000;
    const results = rollData.results || [10];

    for (let i = 0; i < count; i++) {
      const targetNum = results[i] || 1;
      const dieMesh = createDieMesh(dieSides, seed + i * 47, targetNum);
      dieMesh.position.x += (i - (count - 1) / 2) * 3.4;
      diceGroup.add(dieMesh);
    }

    // REVEAL BANNER ONLY AFTER DIE HAS STOPPED AND SETTLED (1.38 seconds)
    bannerTimerRef.current = setTimeout(() => {
      setActiveRollBanner({
        playerName: rollData.playerName,
        notation: rollData.diceNotation || rollData.notation,
        results: rollData.results,
        total: rollData.total,
        modifier: rollData.modifier,
        purpose: rollData.purpose,
      });

      // Auto-hide banner after 5.5 seconds
      bannerTimerRef.current = setTimeout(() => {
        setActiveRollBanner(null);
      }, 5500);
    }, 1380);
  }, []);

  // Listen for real-time multiplayer rolls
  useDiceSync((incomingRoll) => {
    if (incomingRoll.playerId !== user?.uid) {
      trigger3DVisual(incomingRoll);
      setRecentRolls((prev) => [incomingRoll, ...prev.slice(0, 19)]);
    }
  });

  // Global trigger listener: allow any component to roll custom dice
  useEffect(() => {
    const handleGlobalRollEvent = (e) => {
      const { notation: not, modifier: mod, label } = e.detail || {};
      handleRoll(not || '1d20', mod !== undefined ? mod : modifier, label || 'action');
    };

    window.addEventListener('unendingvoid:roll', handleGlobalRollEvent);
    return () => window.removeEventListener('unendingvoid:roll', handleGlobalRollEvent);
  }, [modifier]);

  // Execute a local roll
  const handleRoll = async (targetNotation, customMod = null, purpose = 'action') => {
    if (isRolling) return;
    setIsRolling(true);

    const rollStr = targetNotation || notation;
    const match = rollStr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    let count = 1;
    let sides = 20;
    let notMod = 0;

    if (match) {
      count = Math.min(Math.max(1, parseInt(match[1], 10) || 1), 6);
      sides = parseInt(match[2], 10) || 20;
      if (match[3]) notMod = parseInt(match[3], 10);
    }

    const appliedMod = customMod !== null ? customMod : (modifier + notMod);

    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    const sum = results.reduce((a, b) => a + b, 0);
    const total = sum + appliedMod;
    const seed = Math.floor(Math.random() * 1000000);
    const formattedNotation = `${count}d${sides}${appliedMod ? (appliedMod >= 0 ? `+${appliedMod}` : appliedMod) : ''}`;

    const rollPayload = {
      userId: user?.uid || 'guest',
      playerName: profile?.displayName || user?.displayName || 'Void Operative',
      notation: formattedNotation,
      diceNotation: formattedNotation,
      results,
      total,
      modifier: appliedMod,
      purpose,
      physicsSeed: seed,
    };

    trigger3DVisual(rollPayload);
    setRecentRolls((prev) => [rollPayload, ...prev.slice(0, 19)]);

    try {
      await publishRoll(rollPayload);
    } catch (err) {
      console.warn('[DiceOverlay] Roll sync note:', err.message);
    } finally {
      setTimeout(() => setIsRolling(false), 1450);
    }
  };

  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      />

      {/* Slide-in Roll Result Banner (REVEALED ONLY AFTER DICE HAS SETTLED) */}
      {activeRollBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-bounce-short">
          <div className="glass-panel px-6 py-3 border-neon-cyan shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center font-display font-black text-neon-cyan text-xl shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-white">
                  {activeRollBanner.playerName}
                </span>
                <span className="text-[10px] uppercase font-mono text-neon-cyan bg-white/10 px-2 py-0.5 rounded border border-white/15">
                  {activeRollBanner.purpose || activeRollBanner.notation}
                </span>
              </div>
              <div className="text-xs text-gray-300 font-mono mt-1">
                Die Result: [{activeRollBanner.results?.join(', ')}]
                {activeRollBanner.modifier
                  ? ` (${activeRollBanner.modifier >= 0 ? `+${activeRollBanner.modifier}` : activeRollBanner.modifier})`
                  : ''}
              </div>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">Total</span>
              <span className="font-display text-3xl font-black text-neon-cyan drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                {activeRollBanner.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Dice Bar */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2.5 rounded-xl glass-panel text-gray-300 hover:text-neon-cyan border-white/10 hover:border-neon-cyan transition-all text-xs font-mono shadow-lg"
          title="Roll Ledger"
        >
          📜
        </button>

        {/* Die Selector Buttons */}
        <div className="glass-panel px-3 py-1.5 flex items-center gap-1.5 border-white/10">
          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map((d) => (
            <button
              key={d}
              onClick={() => handleRoll(`1${d}`)}
              disabled={isRolling}
              className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-all
                         ${d === 'd20'
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                           : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {d}
            </button>
          ))}

          <input
            type="text"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            className="w-16 bg-void-bg border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:border-neon-cyan focus:outline-none ml-1"
            placeholder="2d6+3"
          />
          <button
            onClick={() => handleRoll(notation)}
            disabled={isRolling}
            className="text-xs text-neon-cyan hover:underline font-mono font-bold px-1"
          >
            Roll
          </button>
        </div>
      </div>

      {/* Roll History Drawer */}
      {showHistory && (
        <div className="fixed bottom-20 right-5 w-80 max-h-96 glass-panel p-4 z-50 shadow-2xl border-white/20 animate-fade-in flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="font-display text-xs text-gray-300 uppercase tracking-widest">
              📜 Quantum Roll Ledger
            </span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 text-xs font-mono">
            {recentRolls.length === 0 ? (
              <p className="text-gray-500 italic py-4 text-center">No rolls logged yet.</p>
            ) : (
              recentRolls.map((r, i) => (
                <div key={i} className="bg-white/5 p-2 rounded border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-neon-cyan font-bold block">{r.playerName}</span>
                    <span className="text-[10px] text-gray-400">{r.purpose || r.notation} [{r.results?.join(',')}]</span>
                  </div>
                  <span className="font-display font-black text-sm text-white">
                    {r.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Trigger a roll programmatically from anywhere in the app with exact die type and label.
 */
export function triggerInteractiveRoll(notation, modifier = 0, label = 'Action') {
  window.dispatchEvent(
    new CustomEvent('unendingvoid:roll', {
      detail: { notation, modifier, label },
    })
  );
}
