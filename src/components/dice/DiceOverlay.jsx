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
  d4: { border: '#eab308', glow: 'rgba(234, 179, 8, 0.75)', baseColor: 0x1f1908, label: 'D4' },
  d6: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.75)', baseColor: 0x240808, label: 'D6' },
  d8: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.75)', baseColor: 0x261406, label: 'D8' },
  d10: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.75)', baseColor: 0x062215, label: 'D10' },
  d10percentile: { border: '#ec4899', glow: 'rgba(236, 72, 153, 0.75)', baseColor: 0x240618, label: 'D%' },
  d12: { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.75)', baseColor: 0x1d082d, label: 'D12' },
  d20: { border: '#00f0ff', glow: 'rgba(0, 240, 255, 0.75)', baseColor: 0x051b2a, label: 'D20' },
  d100: { border: '#ec4899', glow: 'rgba(236, 72, 153, 0.75)', baseColor: 0x240618, label: 'D100' },
};

/**
 * Generate high-resolution canvas texture with engraved glowing numbers.
 * When isHighlighted=true, renders an intensely illuminated radiant halo and targeting aura for the winning face.
 */
function createEngravedFaceTexture(label, dieType, isBoxFace = false, isHighlighted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;

  ctx.clearRect(0, 0, 256, 256);

  if (isBoxFace) {
    // Brushed metallic sci-fi background panel for cube
    const bgGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 130);
    bgGrad.addColorStop(0, isHighlighted ? '#1e293b' : '#0f172a');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 256);

    // Beveled cybernetic border
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = isHighlighted ? 12 : 6;
    ctx.shadowColor = theme.border;
    ctx.shadowBlur = isHighlighted ? 22 : 0;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.shadowBlur = 0;

    // Corner notches
    ctx.fillStyle = theme.border;
    ctx.fillRect(6, 6, 14, 14);
    ctx.fillRect(236, 6, 14, 14);
    ctx.fillRect(6, 236, 14, 14);
    ctx.fillRect(236, 236, 14, 14);
  }

  // Radiant illuminated aura on the winning face
  if (isHighlighted && !isBoxFace) {
    // Glowing neon background disc
    const halo = ctx.createRadialGradient(128, 128, 20, 128, 128, 115);
    halo.addColorStop(0, theme.glow || 'rgba(0, 240, 255, 0.65)');
    halo.addColorStop(0.5, 'rgba(7, 15, 30, 0.85)');
    halo.addColorStop(0.85, theme.border);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(128, 128, 115, 0, Math.PI * 2);
    ctx.fill();

    // Outer neon targeting ring
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 6;
    ctx.shadowColor = theme.border;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Engraved number typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const strLabel = String(label);
  const fontSize = strLabel.length >= 2 ? (strLabel.length >= 3 ? 84 : 98) : 124;
  ctx.font = `900 ${fontSize}px "Orbitron", monospace, sans-serif`;

  // 1. Deep carved physical shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillText(strLabel, 131, 132);

  // 2. Etched groove border
  ctx.strokeStyle = isHighlighted ? theme.border : 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = isHighlighted ? 12 : 8;
  ctx.strokeText(strLabel, 128, 128);

  // 3. Glowing neon core
  ctx.shadowColor = theme.border;
  ctx.shadowBlur = isHighlighted ? 32 : 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(strLabel, 128, 128);

  // 4. Inner highlight stroke
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = isHighlighted ? 5 : 3;
  ctx.strokeText(strLabel, 128, 128);
  ctx.shadowBlur = 0;

  // Disambiguation line under 6 and 9 (or 60/90)
  if (label === 6 || label === 9 || label === '6' || label === '9' || label === '60' || label === '90') {
    ctx.fillStyle = theme.border;
    ctx.fillRect(80, 192, 96, 8);
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
  const z_world = cameraLookDir.clone().normalize();
  let y_world = new THREE.Vector3(0, 1, 0).projectOnPlane(z_world);
  if (y_world.lengthSq() < 0.001) {
    y_world = new THREE.Vector3(0, 0, 1).projectOnPlane(z_world);
  }
  y_world.normalize();
  const x_world = new THREE.Vector3().crossVectors(y_world, z_world).normalize();
  const mWorld = new THREE.Matrix4().makeBasis(x_world, y_world, z_world);

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

  const mDieInv = mDie.clone().transpose();
  const mTarget = new THREE.Matrix4().multiplyMatrices(mWorld, mDieInv);

  return new THREE.Quaternion().setFromRotationMatrix(mTarget);
}

/**
 * Build authentic D10 Pentagonal Trapezohedron geometry.
 * Uses exact 20-triangle canonical mesh so all 10 faces are uniform, flat, and outward-facing.
 */
function createD10Data(labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
  const vertices = [];
  for (let i = 0, b = 0; i < 10; ++i, b += (Math.PI * 2) / 10) {
    vertices.push(new THREE.Vector3(Math.cos(b) * 2.1, Math.sin(b) * 2.1, 0.105 * (i % 2 ? 1 : -1) * 2.1));
  }
  vertices.push(new THREE.Vector3(0, 0, -2.1 * 1.15)); // index 10: bottom pole
  vertices.push(new THREE.Vector3(0, 0, 2.1 * 1.15));  // index 11: top pole

  const rawFaces = [
    [5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
    [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
    [1, 0, 2, -1], [1, 2, 3, -1], [3, 2, 4, -1], [3, 4, 5, -1], [5, 4, 6, -1],
    [5, 6, 7, -1], [7, 6, 8, -1], [7, 8, 9, -1], [9, 8, 0, -1], [9, 0, 1, -1]
  ];

  const positions = [];
  const faces = [];

  rawFaces.forEach((f) => {
    const vA = vertices[f[0]];
    const vB = vertices[f[1]];
    const vC = vertices[f[2]];
    const norm = new THREE.Vector3().subVectors(vB, vA).cross(new THREE.Vector3().subVectors(vC, vA)).normalize();
    const cent = new THREE.Vector3().add(vA).add(vB).add(vC).multiplyScalar(1 / 3);

    if (norm.dot(cent) < 0) {
      positions.push(vA.x, vA.y, vA.z, vC.x, vC.y, vC.z, vB.x, vB.y, vB.z);
    } else {
      positions.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z);
    }

    if (f[3] !== -1) {
      const finalNorm = norm.dot(cent) < 0 ? norm.clone().negate() : norm.clone();
      let up = new THREE.Vector3(0, 1, 0).projectOnPlane(finalNorm);
      if (up.lengthSq() < 0.001) up = new THREE.Vector3(0, 0, 1).projectOnPlane(finalNorm);
      up.normalize();
      faces.push({ center: cent, normal: finalNorm, up, label: labels[f[3]] });
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

/**
 * Build authentic D12 Dodecahedron geometry.
 * Explicitly constructs 12 congruent regular pentagonal faces without crossing internal diagonals.
 */
function createD12Data() {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const scale = 1.35;

  const rawVerts = [
    [0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p],
    [p, 0, q], [p, 0, -q], [-p, 0, q], [-p, 0, -q],
    [q, p, 0], [q, -p, 0], [-q, p, 0], [-q, -p, 0],
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ];
  const vertices = rawVerts.map((v) => new THREE.Vector3(v[0] * scale, v[1] * scale, v[2] * scale));

  const rawFaces = [
    [2, 14, 4, 12, 0, 1],
    [15, 9, 11, 19, 3, 2],
    [16, 10, 17, 7, 6, 3],
    [6, 7, 19, 11, 18, 4],
    [6, 18, 2, 0, 16, 5],
    [18, 11, 9, 14, 2, 6],
    [1, 17, 10, 8, 13, 7],
    [1, 13, 5, 15, 3, 8],
    [13, 8, 12, 4, 5, 9],
    [5, 4, 14, 9, 15, 10],
    [0, 12, 8, 10, 16, 11],
    [3, 19, 7, 17, 1, 12]
  ];

  const positions = [];
  const faces = [];

  rawFaces.forEach((f) => {
    const pentVerts = [vertices[f[0]], vertices[f[1]], vertices[f[2]], vertices[f[3]], vertices[f[4]]];
    const center = new THREE.Vector3();
    pentVerts.forEach((v) => center.add(v));
    center.multiplyScalar(0.2);

    const e1 = new THREE.Vector3().subVectors(pentVerts[1], pentVerts[0]);
    const e2 = new THREE.Vector3().subVectors(pentVerts[2], pentVerts[0]);
    let norm = new THREE.Vector3().crossVectors(e1, e2).normalize();
    if (norm.dot(center) < 0) norm.negate();

    // 5 coplanar triangles connecting center to pentagon edges
    for (let i = 0; i < 5; i++) {
      const vA = pentVerts[i];
      const vB = pentVerts[(i + 1) % 5];
      const triNorm = new THREE.Vector3().subVectors(vB, vA).cross(new THREE.Vector3().subVectors(center, vA)).normalize();
      if (triNorm.dot(center) > 0) {
        positions.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, center.x, center.y, center.z);
      } else {
        positions.push(vB.x, vB.y, vB.z, vA.x, vA.y, vA.z, center.x, center.y, center.z);
      }
    }

    let up = new THREE.Vector3(0, 1, 0).projectOnPlane(norm);
    if (up.lengthSq() < 0.001) up = new THREE.Vector3(0, 0, 1).projectOnPlane(norm);
    up.normalize();

    faces.push({ center, normal: norm, up, label: f[5] });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

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
    { verts: [apex, b0, b1], label: 1, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b0).add(b1).multiplyScalar(1 / 3)).normalize() },
    { verts: [apex, b1, b2], label: 2, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b1).add(b2).multiplyScalar(1 / 3)).normalize() },
    { verts: [apex, b2, b0], label: 3, up: apex.clone().sub(new THREE.Vector3().add(apex).add(b2).add(b0).multiplyScalar(1 / 3)).normalize() },
    { verts: [b0, b2, b1], label: 4, up: new THREE.Vector3(0, 0, 1) },
  ];

  const positions = [];
  const faces = [];

  triFaces.forEach((f) => {
    f.verts.forEach((v) => positions.push(v.x, v.y, v.z));
    const center = new THREE.Vector3().add(f.verts[0]).add(f.verts[1]).add(f.verts[2]).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();
    faces.push({ center, normal, up: f.up, label: f.label });
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
    { verts: [top, e0, e1], label: 1, up: top },
    { verts: [top, e1, e2], label: 2, up: top },
    { verts: [top, e2, e3], label: 3, up: top },
    { verts: [top, e3, e0], label: 4, up: top },
    { verts: [bot, e1, e0], label: 5, up: bot.clone().negate() },
    { verts: [bot, e2, e1], label: 6, up: bot.clone().negate() },
    { verts: [bot, e3, e2], label: 7, up: bot.clone().negate() },
    { verts: [bot, e0, e3], label: 8, up: bot.clone().negate() },
  ];

  const positions = [];
  const faces = [];

  triFaces.forEach((f) => {
    f.verts.forEach((v) => positions.push(v.x, v.y, v.z));
    const center = new THREE.Vector3().add(f.verts[0]).add(f.verts[1]).add(f.verts[2]).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();
    const up = f.up.clone().sub(center).normalize();
    faces.push({ center, normal, up, label: f.label });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

/**
 * Build D20 Icosahedron faces.
 */
function createD20Data() {
  const geometry = new THREE.IcosahedronGeometry(2.3);
  const pos = geometry.attributes.position;
  const faces = [];

  for (let i = 0; i < pos.count; i += 3) {
    const vA = new THREE.Vector3().fromBufferAttribute(pos, i);
    const vB = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const normal = new THREE.Vector3()
      .subVectors(vC, vB)
      .cross(new THREE.Vector3().subVectors(vA, vB))
      .normalize();
    const center = new THREE.Vector3().add(vA).add(vB).add(vC).multiplyScalar(1 / 3);

    let up = new THREE.Vector3(0, 1, 0).projectOnPlane(normal);
    if (up.lengthSq() < 0.001) up = new THREE.Vector3(0, 0, 1).projectOnPlane(normal);
    up.normalize();

    faces.push({
      center,
      normal,
      up,
      label: i / 3 + 1,
    });
  }

  return { geometry, faces };
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00f0ff, 3.2);
    keyLight.position.set(12, 18, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff00aa, 2.4);
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
          // Always increment elapsed time so highlight pulsing continues smoothly after landing
          die.userData.elapsed = (die.userData.elapsed || 0) + dt;

          if (die.userData.animating) {
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
              const progress = Math.min(1, Math.max(0, (die.userData.elapsed - 0.75) / 0.6));
              const ease = 1 - Math.pow(1 - progress, 3);
              if (die.userData.targetQuaternion) {
                die.quaternion.slerpQuaternions(die.userData.settleStartQuat, die.userData.targetQuaternion, ease);
              }
              die.userData.linVel.multiplyScalar(0.7);
            } else {
              // Phase 3: Settle completely
              die.userData.animating = false;
              if (die.userData.targetQuaternion) {
                die.quaternion.copy(die.userData.targetQuaternion);
              }
            }
          }

          // Face illumination / highlight on settlement (1.35s onwards)
          if (die.userData.elapsed >= 1.35) {
            // Activate highlight once on settlement
            if (!die.userData.highlightActivated) {
              die.userData.highlightActivated = true;
              if (die.userData.winningPlate) {
                die.userData.winningPlate.material.map = createEngravedFaceTexture(
                  die.userData.winningLabel,
                  die.userData.dieType,
                  die.userData.dieType === 'd6',
                  true
                );
                die.userData.winningPlate.material.emissive = new THREE.Color(
                  DIE_THEMES[die.userData.dieType]?.border || 0x00f0ff
                );
                die.userData.winningPlate.material.emissiveIntensity = 2.4;
                die.userData.winningPlate.material.needsUpdate = true;
              }
            }

            // Continuous rhythmic cybernetic pulse after landing
            const settleTime = die.userData.elapsed - 1.35;
            const pulse = 1.0 + 0.12 * Math.sin(settleTime * 6.0);

            if (die.userData.winningPlate) {
              die.userData.winningPlate.scale.set(pulse, pulse, 1);
            }
            if (die.userData.faceSpotlight) {
              die.userData.faceSpotlight.intensity = Math.min(8.0, 4.5 + 3.0 * pulse);
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

  // Construct exact 3D Polyhedral Die with engraved numbers and illuminated winning face
  const createDieMesh = (dieType, seed, targetResult) => {
    const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;
    const dieRoot = new THREE.Group();

    // Camera forward vector from settled die position (0, -1.8, -1) to camera (0, 1.5, 18)
    const cameraLookDir = new THREE.Vector3(0, 0.171, 0.985);

    if (dieType === 'd6') {
      // ──────────────── D6 CUBE (BoxGeometry) ────────────────
      const size = 2.4;
      const geometry = new THREE.BoxGeometry(size, size, size);

      // Three.js box order: +X (1), -X (6), +Y (2), -Y (5), +Z (3), -Z (4)
      const targetNum = Number(targetResult) || 1;
      const materials = [
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(1, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(6, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(2, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(5, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(3, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: createEngravedFaceTexture(4, 'd6', true, false), roughness: 0.2, metalness: 0.8 }),
      ];

      const cubeMesh = new THREE.Mesh(geometry, materials);
      dieRoot.add(cubeMesh);

      // Wireframe perimeter edge accents (12 edges)
      const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      dieRoot.add(new THREE.LineSegments(edgeGeo, edgeMat));

      const d6Faces = {
        1: { normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(1.2, 0, 0) },
        6: { normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(-1.2, 0, 0) },
        2: { normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), center: new THREE.Vector3(0, 1.2, 0) },
        5: { normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), center: new THREE.Vector3(0, -1.2, 0) },
        3: { normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, 0, 1.2) },
        4: { normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, 0, -1.2) },
      };

      const targetFace = d6Faces[targetNum] || d6Faces[1];
      dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetFace.normal, targetFace.up, cameraLookDir);

      // Flush overlay plate on the winning face that lights up and pulses
      const hlGeo = new THREE.PlaneGeometry(2.35, 2.35);
      const hlMat = new THREE.MeshStandardMaterial({
        map: createEngravedFaceTexture(targetNum, 'd6', true, false),
        transparent: true,
        roughness: 0.2,
        metalness: 0.8,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const hlMesh = new THREE.Mesh(hlGeo, hlMat);
      hlMesh.position.copy(targetFace.center).add(targetFace.normal.clone().multiplyScalar(0.005));

      const z_plate = targetFace.normal.clone().normalize();
      let y_plate = targetFace.up.clone().projectOnPlane(z_plate);
      if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 1, 0).projectOnPlane(z_plate);
      y_plate.normalize();
      const x_plate = new THREE.Vector3().crossVectors(y_plate, z_plate).normalize();
      hlMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x_plate, y_plate, z_plate));

      dieRoot.add(hlMesh);
      dieRoot.userData.winningPlate = hlMesh;
      dieRoot.userData.winningLabel = targetNum;
      dieRoot.userData.dieType = 'd6';

      // Focused neon spotlight illuminating the winning face
      const faceSpot = new THREE.PointLight(theme.border, 0, 10, 1.3);
      faceSpot.position.copy(targetFace.center).add(targetFace.normal.clone().multiplyScalar(2.2));
      dieRoot.add(faceSpot);
      dieRoot.userData.faceSpotlight = faceSpot;
    } else {
      // ──────────────── POLYHEDRA (D4, D8, D10, D10-PERCENTILE, D12, D20) ────────────────
      let geometry;
      let faces = [];
      let planeSize = 1.25;

      switch (dieType) {
        case 'd4': {
          const data = createD4Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.35;
          break;
        }
        case 'd8': {
          const data = createD8Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.25;
          break;
        }
        case 'd10': {
          // Standard D10 (0..9)
          const data = createD10Data(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.15;
          break;
        }
        case 'd10percentile': {
          // Tens percentile die (00, 10, 20, 30, 40, 50, 60, 70, 80, 90)
          const data = createD10Data(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.15;
          break;
        }
        case 'd12': {
          // Authentic 12-sided dodecahedron with 12 clean pentagonal faces
          const data = createD12Data();
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.25;
          break;
        }
        case 'd20':
        default: {
          const data = createD20Data();
          geometry = data.geometry;
          faces = data.faces;
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

      // Glowing outer perimeter edges (ONLY true geometric polygon edges, no crossing diagonals)
      const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      dieRoot.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // Match target face
      const targetStr = String(targetResult);
      const targetFace =
        faces.find((f) => String(f.label) === targetStr) ||
        faces.find((f) => Number(f.label) === Number(targetResult)) ||
        faces[0];

      // Attach laser-etched engraved number plates flush on each face
      faces.forEach((f) => {
        const plateGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        const plateMat = new THREE.MeshStandardMaterial({
          map: createEngravedFaceTexture(f.label, dieType, false, false),
          transparent: true,
          roughness: 0.2,
          metalness: 0.85,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.copy(f.center).add(f.normal.clone().multiplyScalar(0.003));

        // Align plate orientation naturally with the face's up vector
        const z_plate = f.normal.clone().normalize();
        let y_plate = f.up.clone().projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 1, 0).projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 0, 1).projectOnPlane(z_plate);
        y_plate.normalize();
        const x_plate = new THREE.Vector3().crossVectors(y_plate, z_plate).normalize();
        plate.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x_plate, y_plate, z_plate));

        dieRoot.add(plate);

        // Store reference to winning plate for illumination on settlement
        if (f === targetFace) {
          dieRoot.userData.winningPlate = plate;
          dieRoot.userData.winningLabel = f.label;
          dieRoot.userData.dieType = dieType;
        }
      });

      // Target face settling orientation: points directly at camera
      if (targetFace) {
        dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetFace.normal, targetFace.up, cameraLookDir);

        // Dedicated neon spotlight focused directly on the settled face
        const faceSpot = new THREE.PointLight(theme.border, 0, 10, 1.3);
        faceSpot.position.copy(targetFace.center).add(targetFace.normal.clone().multiplyScalar(2.2));
        dieRoot.add(faceSpot);
        dieRoot.userData.faceSpotlight = faceSpot;
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

    const notationStr = rollData.diceNotation || rollData.notation || '1d20';
    const isD100 = notationStr.toLowerCase().includes('d100');
    const seed = rollData.physics?.seed || Math.random() * 1000;

    if (isD100) {
      // ──────────────── D100 PERCENTILE (Throws 2 dice: tens percentile & ones) ────────────────
      const tensVal = rollData.tensResult || '00';
      const onesVal = rollData.onesResult !== undefined ? String(rollData.onesResult) : '0';

      // Left die: Tens percentile die (00, 10, 20... 90)
      const dieTens = createDieMesh('d10percentile', seed, tensVal);
      dieTens.position.x = -2.4;
      diceGroup.add(dieTens);

      // Right die: Units die (0..9)
      const dieOnes = createDieMesh('d10', seed + 47, onesVal);
      dieOnes.position.x = 2.4;
      diceGroup.add(dieOnes);
    } else {
      // Standard dice (d4, d6, d8, d10, d12, d20)
      const match = notationStr.match(/(\d*)d(\d+)/i) || [null, '1', '20'];
      const count = Math.min(Number(match[1]) || 1, 6);
      const dieSides = `d${match[2] || '20'}`;
      const results = rollData.results || [10];

      for (let i = 0; i < count; i++) {
        const targetNum = results[i] || 1;
        const dieMesh = createDieMesh(dieSides, seed + i * 47, targetNum);
        dieMesh.position.x += (i - (count - 1) / 2) * 3.4;
        diceGroup.add(dieMesh);
      }
    }

    // REVEAL BANNER ONLY AFTER DIE HAS STOPPED AND SETTLED (1.38 seconds)
    bannerTimerRef.current = setTimeout(() => {
      setActiveRollBanner({
        playerName: rollData.playerName,
        notation: rollData.diceNotation || rollData.notation,
        results: rollData.results,
        tensResult: rollData.tensResult,
        onesResult: rollData.onesResult,
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
    const isD100 = rollStr.toLowerCase().includes('d100');
    const appliedMod = customMod !== null ? customMod : modifier;
    const seed = Math.floor(Math.random() * 1000000);

    let rollPayload;

    if (isD100) {
      // ──────────────── D100 Roll Mechanics ────────────────
      const raw100 = Math.floor(Math.random() * 100) + 1; // 1 to 100
      const total = raw100 + appliedMod;

      let tensVal;
      let onesVal;
      if (raw100 === 100) {
        tensVal = '00';
        onesVal = '0';
      } else {
        const tensInt = Math.floor(raw100 / 10) * 10;
        tensVal = String(tensInt).padStart(2, '0');
        onesVal = String(raw100 % 10);
      }

      const formattedNotation = `1d100${appliedMod ? (appliedMod >= 0 ? `+${appliedMod}` : appliedMod) : ''}`;

      rollPayload = {
        userId: user?.uid || 'guest',
        playerName: profile?.displayName || user?.displayName || 'Void Operative',
        notation: formattedNotation,
        diceNotation: formattedNotation,
        results: [raw100],
        tensResult: tensVal,
        onesResult: onesVal,
        total,
        modifier: appliedMod,
        purpose: purpose === 'action' ? 'Percentile Check (d100)' : purpose,
        physicsSeed: seed,
      };
    } else {
      // Standard dice
      const match = rollStr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
      let count = 1;
      let sides = 20;
      let notMod = 0;

      if (match) {
        count = Math.min(Math.max(1, parseInt(match[1], 10) || 1), 6);
        sides = parseInt(match[2], 10) || 20;
        if (match[3]) notMod = parseInt(match[3], 10);
      }

      const totalMod = customMod !== null ? customMod : modifier + notMod;
      const results = [];
      for (let i = 0; i < count; i++) {
        if (sides === 10) {
          // D10 numbers 0..9 (or 1..10)
          results.push(String(Math.floor(Math.random() * 10)));
        } else {
          results.push(Math.floor(Math.random() * sides) + 1);
        }
      }
      const sum = results.reduce((a, b) => a + (Number(b) || 0), 0);
      const total = sum + totalMod;
      const formattedNotation = `${count}d${sides}${totalMod ? (totalMod >= 0 ? `+${totalMod}` : totalMod) : ''}`;

      rollPayload = {
        userId: user?.uid || 'guest',
        playerName: profile?.displayName || user?.displayName || 'Void Operative',
        notation: formattedNotation,
        diceNotation: formattedNotation,
        results,
        total,
        modifier: totalMod,
        purpose,
        physicsSeed: seed,
      };
    }

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
                {activeRollBanner.tensResult !== undefined ? (
                  <>
                    Percentile: [{activeRollBanner.tensResult} + {activeRollBanner.onesResult}]
                  </>
                ) : (
                  <>
                    Die Result: [{activeRollBanner.results?.join(', ')}]
                  </>
                )}
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

        {/* Die Selector Buttons including D100 */}
        <div className="glass-panel px-3 py-1.5 flex items-center gap-1.5 border-white/10">
          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
            <button
              key={d}
              onClick={() => handleRoll(d === 'd100' ? '1d100' : `1${d}`)}
              disabled={isRolling}
              className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-all
                         ${d === 'd20'
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                           : d === 'd100'
                             ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
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
                    <span className="text-[10px] text-gray-400">
                      {r.purpose || r.notation}{' '}
                      {r.tensResult !== undefined ? `[${r.tensResult}, ${r.onesResult}]` : `[${r.results?.join(',')}]`}
                    </span>
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
