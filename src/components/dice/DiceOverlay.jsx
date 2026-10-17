import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
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
  coin: { border: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.85)', baseColor: 0x1e242b, label: 'LUCIFER COIN' },
};

// Cached 3D Lucifer Pentecostal Coin Geometry
let cachedCoinGeometry = null;
let coinLoadPromise = null;

export function getOrLoadCoinGeometry() {
  if (cachedCoinGeometry) return Promise.resolve(cachedCoinGeometry);
  if (coinLoadPromise) return coinLoadPromise;

  coinLoadPromise = new Promise((resolve) => {
    if (
      typeof window === 'undefined' ||
      typeof window.fetch !== 'function' ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
    ) {
      const fallbackGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.4, 36);
      fallbackGeo.rotateX(Math.PI / 2);
      cachedCoinGeometry = fallbackGeo;
      resolve(fallbackGeo);
      return;
    }

    const loader = new STLLoader();
    loader.load(
      '/models/lucifer-coin.stl',
      (geom) => {
        geom.center();
        geom.computeVertexNormals();
        geom.scale(0.095, 0.095, 0.095);
        cachedCoinGeometry = geom;
        resolve(geom);
      },
      undefined,
      (err) => {
        console.warn('[DiceOverlay] Using procedural fallback for coin:', err);
        const fallbackGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.4, 36);
        fallbackGeo.rotateX(Math.PI / 2);
        cachedCoinGeometry = fallbackGeo;
        resolve(fallbackGeo);
      }
    );
  });

  return coinLoadPromise;
}

/**
 * Generate high-resolution canvas texture with engraved glowing numbers.
 * When isHighlighted=true, renders an intensely illuminated radiant halo and targeting aura for the winning face.
 */
function createEngravedFaceTexture(label, dieType, isBoxFace = false, isHighlighted = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;

  ctx.clearRect(0, 0, 256, 256);

  if (isBoxFace) {
    const bgGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 130);
    bgGrad.addColorStop(0, isHighlighted ? '#1e293b' : '#0f172a');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = isHighlighted ? 12 : 6;
    ctx.shadowColor = theme.border;
    ctx.shadowBlur = isHighlighted ? 22 : 0;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.shadowBlur = 0;

    ctx.fillStyle = theme.border;
    ctx.fillRect(6, 6, 14, 14);
    ctx.fillRect(236, 6, 14, 14);
    ctx.fillRect(6, 236, 14, 14);
    ctx.fillRect(236, 236, 14, 14);
  }

  if (isHighlighted && !isBoxFace) {
    const halo = ctx.createRadialGradient(128, 128, 20, 128, 128, 115);
    halo.addColorStop(0, theme.glow || 'rgba(0, 240, 255, 0.65)');
    halo.addColorStop(0.5, 'rgba(7, 15, 30, 0.85)');
    halo.addColorStop(0.85, theme.border);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(128, 128, 115, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 6;
    ctx.shadowColor = theme.border;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  const isReddish = dieType === 'd6' || dieType === 'd8' || dieType === 'd10percentile' || dieType === 'd100';
  const outlineColor = isReddish ? '#ffffff' : '#ff0033';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const strLabel = String(label);
  const fontSize = strLabel.length >= 2 ? (strLabel.length >= 3 ? 84 : 98) : 124;
  ctx.font = `900 ${fontSize}px "Orbitron", monospace, sans-serif`;

  const centerX = 128;
  const centerY = 132;

  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = isHighlighted ? 16 : 12;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  ctx.strokeText(strLabel, centerX, centerY);

  ctx.fillStyle = '#000000';
  ctx.fillText(strLabel, centerX, centerY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Compute the exact rotation quaternion that aligns target face normal directly to camera.
 */
function computeSettlingQuaternion(faceNormal, faceUp, cameraLookDir) {
  const norm = faceNormal.clone().normalize();
  const camDir = cameraLookDir.clone().normalize();

  const q1 = new THREE.Quaternion().setFromUnitVectors(norm, camDir);
  const transformedUp = (faceUp ? faceUp.clone() : new THREE.Vector3(0, 1, 0)).applyQuaternion(q1);

  const desiredUp = new THREE.Vector3(0, 1, 0).projectOnPlane(camDir).normalize();
  const currentUpProjected = transformedUp.projectOnPlane(camDir).normalize();

  const dot = Math.max(-1, Math.min(1, currentUpProjected.dot(desiredUp)));
  const cross = new THREE.Vector3().crossVectors(currentUpProjected, desiredUp);
  const angle = Math.acos(dot) * (cross.dot(camDir) < 0 ? -1 : 1);

  const q2 = new THREE.Quaternion().setFromAxisAngle(camDir, angle);
  return q2.multiply(q1);
}

// ──────────────── GEOMETRY BUILDERS ────────────────
function createD4Data() {
  const r = 2.1;
  const v0 = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(r);
  const v1 = new THREE.Vector3(-1, -1, 1).normalize().multiplyScalar(r);
  const v2 = new THREE.Vector3(-1, 1, -1).normalize().multiplyScalar(r);
  const v3 = new THREE.Vector3(1, -1, -1).normalize().multiplyScalar(r);

  const pos = [
    v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z,
    v0.x, v0.y, v0.z, v3.x, v3.y, v3.z, v2.x, v2.y, v2.z,
    v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v3.x, v3.y, v3.z,
    v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();

  const faces = [
    { label: '1', normal: new THREE.Vector3().add(v0).add(v2).add(v1).normalize(), center: new THREE.Vector3().add(v0).add(v2).add(v1).divideScalar(3), up: v0.clone().sub(v1).normalize() },
    { label: '2', normal: new THREE.Vector3().add(v0).add(v3).add(v2).normalize(), center: new THREE.Vector3().add(v0).add(v3).add(v2).divideScalar(3), up: v0.clone().sub(v2).normalize() },
    { label: '3', normal: new THREE.Vector3().add(v0).add(v1).add(v3).normalize(), center: new THREE.Vector3().add(v0).add(v1).add(v3).divideScalar(3), up: v0.clone().sub(v3).normalize() },
    { label: '4', normal: new THREE.Vector3().add(v1).add(v2).add(v3).normalize(), center: new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3), up: v2.clone().sub(v3).normalize() },
  ];
  return { geometry, faces };
}

function createD8Data() {
  const r = 2.0;
  const geometry = new THREE.OctahedronGeometry(r, 0);
  const posAttr = geometry.getAttribute('position');
  const faces = [];

  for (let i = 0; i < 8; i++) {
    const i0 = i * 3;
    const a = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
    const b = new THREE.Vector3(posAttr.getX(i0 + 1), posAttr.getY(i0 + 1), posAttr.getZ(i0 + 1));
    const c = new THREE.Vector3(posAttr.getX(i0 + 2), posAttr.getY(i0 + 2), posAttr.getZ(i0 + 2));

    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const center = a.clone().add(b).add(c).divideScalar(3);
    const up = a.clone().sub(b.clone().add(c).multiplyScalar(0.5)).normalize();

    faces.push({ label: String(i + 1), normal, center, up });
  }
  return { geometry, faces };
}

function createD10Data(labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
  const R = 2.0;
  const H = 2.2;
  const tipTop = new THREE.Vector3(0, H, 0);
  const tipBottom = new THREE.Vector3(0, -H, 0);

  const topEquator = [];
  const bottomEquator = [];

  for (let i = 0; i < 5; i++) {
    const angleTop = (i * 2 * Math.PI) / 5;
    topEquator.push(new THREE.Vector3(R * Math.cos(angleTop), 0.35, R * Math.sin(angleTop)));

    const angleBottom = ((i + 0.5) * 2 * Math.PI) / 5;
    bottomEquator.push(new THREE.Vector3(R * Math.cos(angleBottom), -0.35, R * Math.sin(angleBottom)));
  }

  const positions = [];
  const faces = [];

  for (let i = 0; i < 5; i++) {
    const t0 = topEquator[i];
    const b0 = bottomEquator[i];
    const t1 = topEquator[(i + 1) % 5];
    const b_prev = bottomEquator[(i + 4) % 5];

    // Upper kite face
    positions.push(
      tipTop.x, tipTop.y, tipTop.z,
      t0.x, t0.y, t0.z,
      b_prev.x, b_prev.y, b_prev.z,
      tipTop.x, tipTop.y, tipTop.z,
      b_prev.x, b_prev.y, b_prev.z,
      t1.x, t1.y, t1.z
    );

    const upNormal = new THREE.Vector3().add(t0).add(b_prev).divideScalar(2).sub(tipTop).cross(t1.clone().sub(t0)).normalize();
    const upCenter = tipTop.clone().add(t0).add(t1).add(b_prev).divideScalar(4);
    const upUp = tipTop.clone().sub(upCenter).normalize();

    faces.push({ label: labels[i * 2] || String(i * 2), normal: upNormal, center: upCenter, up: upUp });

    // Lower kite face
    positions.push(
      tipBottom.x, tipBottom.y, tipBottom.z,
      b0.x, b0.y, b0.z,
      t0.x, t0.y, t0.z,
      tipBottom.x, tipBottom.y, tipBottom.z,
      t1.x, t1.y, t1.z,
      b0.x, b0.y, b0.z
    );

    const downNormal = new THREE.Vector3().add(b0).add(t0).divideScalar(2).sub(tipBottom).cross(t1.clone().sub(b0)).normalize();
    const downCenter = tipBottom.clone().add(b0).add(t0).add(t1).divideScalar(4);
    const downUp = downCenter.clone().sub(tipBottom).normalize();

    faces.push({ label: labels[i * 2 + 1] || String(i * 2 + 1), normal: downNormal, center: downCenter, up: downUp });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

function createD12Data() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const a = 1 / Math.sqrt(3);
  const b = a / phi;
  const c = a * phi;

  const vertices = [
    new THREE.Vector3(a, a, a), new THREE.Vector3(a, a, -a), new THREE.Vector3(a, -a, a), new THREE.Vector3(a, -a, -a),
    new THREE.Vector3(-a, a, a), new THREE.Vector3(-a, a, -a), new THREE.Vector3(-a, -a, a), new THREE.Vector3(-a, -a, -a),
    new THREE.Vector3(0, b, c), new THREE.Vector3(0, b, -c), new THREE.Vector3(0, -b, c), new THREE.Vector3(0, -b, -c),
    new THREE.Vector3(b, c, 0), new THREE.Vector3(b, -c, 0), new THREE.Vector3(-b, c, 0), new THREE.Vector3(-b, -c, 0),
    new THREE.Vector3(c, 0, b), new THREE.Vector3(c, 0, -b), new THREE.Vector3(-c, 0, b), new THREE.Vector3(-c, 0, -b),
  ];

  const scale = 2.1;
  vertices.forEach((v) => v.multiplyScalar(scale));

  const pentagons = [
    [0, 8, 10, 2, 16], [0, 16, 17, 1, 12], [0, 12, 14, 4, 8], [8, 4, 18, 6, 10], [2, 10, 6, 15, 13],
    [2, 13, 3, 17, 16], [1, 17, 3, 11, 9], [1, 9, 5, 14, 12], [4, 14, 5, 19, 18], [6, 18, 19, 7, 15],
    [3, 13, 15, 7, 11], [5, 9, 11, 7, 19],
  ];

  const positions = [];
  const faces = [];

  pentagons.forEach((indices, fIdx) => {
    const center = new THREE.Vector3();
    indices.forEach((i) => center.add(vertices[i]));
    center.divideScalar(5);

    const normal = center.clone().normalize();
    const up = vertices[indices[0]].clone().sub(center).normalize();

    faces.push({ label: String(fIdx + 1), normal, center, up });

    for (let i = 0; i < 5; i++) {
      const vA = vertices[indices[i]];
      const vB = vertices[indices[(i + 1) % 5]];
      positions.push(
        center.x, center.y, center.z,
        vA.x, vA.y, vA.z,
        vB.x, vB.y, vB.z
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return { geometry, faces };
}

function createD20Data() {
  const r = 2.2;
  const geometry = new THREE.IcosahedronGeometry(r, 0);
  const posAttr = geometry.getAttribute('position');
  const faces = [];

  for (let i = 0; i < 20; i++) {
    const i0 = i * 3;
    const a = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
    const b = new THREE.Vector3(posAttr.getX(i0 + 1), posAttr.getY(i0 + 1), posAttr.getZ(i0 + 1));
    const c = new THREE.Vector3(posAttr.getX(i0 + 2), posAttr.getY(i0 + 2), posAttr.getZ(i0 + 2));

    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const center = a.clone().add(b).add(c).divideScalar(3);
    const up = a.clone().sub(b.clone().add(c).multiplyScalar(0.5)).normalize();

    faces.push({ label: String(i + 1), normal, center, up });
  }
  return { geometry, faces };
}

export default function DiceOverlay({ user, profile, isDM = false, modifier = 0 }) {
  const { t } = useTranslation();
  const isViewerDM = Boolean(
    isDM ||
    profile?.role === 'dm' ||
    user?.role === 'dm' ||
    profile?.displayName?.includes('(DM)') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/dm'))
  );
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const diceGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const isDiceHoveredRef = useRef(false);

  const [activeRollBanner, setActiveRollBanner] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [recentRolls, setRecentRolls] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Bottom Dice Multi-Quantity Popover
  const [quantityPopover, setQuantityPopover] = useState(null);
  const [customQuantity, setCustomQuantity] = useState('2');

  // Clear all dice from 3D scene and dismiss banner
  const clearDice = useCallback(() => {
    if (diceGroupRef.current) {
      while (diceGroupRef.current.children.length > 0) {
        diceGroupRef.current.remove(diceGroupRef.current.children[0]);
      }
    }
    setActiveRollBanner(null);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (isDiceHoveredRef.current) {
      document.body.style.cursor = 'default';
      isDiceHoveredRef.current = false;
    }
  }, []);

  // Initialize Three.js scene & preload Lucifer Coin STL
  useEffect(() => {
    getOrLoadCoinGeometry();

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xddeeff, 3.4);
    keyLight.position.set(12, 18, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 2.5);
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
          die.userData.elapsed = (die.userData.elapsed || 0) + dt;

          if (die.userData.animating) {
            die.position.x += die.userData.linVel.x * dt;
            die.position.y += die.userData.linVel.y * dt;
            die.userData.linVel.y -= 14.0 * dt;

            if (die.position.y < -1.8) {
              die.position.y = -1.8;
              die.userData.linVel.y *= -0.32;
              die.userData.linVel.x *= 0.7;
            }

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
              die.userData.animating = false;
              if (die.userData.targetQuaternion) {
                die.quaternion.copy(die.userData.targetQuaternion);
              }
            }
          }

          // Face illumination / highlight on settlement (1.35s onwards)
          if (die.userData.elapsed >= 1.35 && die.userData.isHighlightEligible !== false) {
            if (!die.userData.highlightActivated) {
              die.userData.highlightActivated = true;

              if (die.userData.isCoin && die.userData.silverMat) {
                die.userData.silverMat.emissive = new THREE.Color(0x385c7a);
                die.userData.silverMat.emissiveIntensity = 0.55;
                die.userData.silverMat.needsUpdate = true;
              } else if (die.userData.winningPlate) {
                die.userData.winningPlate.material.map = createEngravedFaceTexture(
                  die.userData.winningLabel,
                  die.userData.dieType,
                  die.userData.dieType === 'd6',
                  true
                );
                die.userData.winningPlate.material.emissive = new THREE.Color(0x000000);
                die.userData.winningPlate.material.emissiveIntensity = 0;
                die.userData.winningPlate.material.opacity = 1.0;
                die.userData.winningPlate.material.needsUpdate = true;
              }
            }

            const settleTime = die.userData.elapsed - 1.35;
            const pulse = 1.0 + 0.12 * Math.sin(settleTime * 6.0);

            if (die.userData.winningPlate) {
              die.userData.winningPlate.scale.set(pulse, pulse, 1);
            }
            if (die.userData.faceSpotlight) {
              die.userData.faceSpotlight.intensity = Math.min(3.6, 2.0 + 1.0 * pulse);
            }
          }
        });
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    const handlePointerDown = (e) => {
      if (!diceGroup || diceGroup.children.length === 0) return;
      if (!cameraRef.current) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(diceGroup.children, true);
      if (intersects.length > 0) {
        clearDice();
      }
    };

    const handlePointerMove = (e) => {
      if (!diceGroup || diceGroup.children.length === 0) {
        if (isDiceHoveredRef.current) {
          document.body.style.cursor = 'default';
          isDiceHoveredRef.current = false;
        }
        return;
      }
      if (!cameraRef.current) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(diceGroup.children, true);
      if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        isDiceHoveredRef.current = true;
      } else if (isDiceHoveredRef.current) {
        document.body.style.cursor = 'default';
        isDiceHoveredRef.current = false;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      if (isDiceHoveredRef.current) {
        document.body.style.cursor = 'default';
        isDiceHoveredRef.current = false;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [clearDice]);

  // Construct 3D Die or Lucifer Silver Coin Mesh
  const createDieMesh = (dieType, seed, targetResult, isHighlightEligible = true) => {
    const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;
    const dieRoot = new THREE.Group();
    const cameraLookDir = new THREE.Vector3(0, 0.171, 0.985);

    dieRoot.userData.isHighlightEligible = isHighlightEligible;

    if (dieType === 'coin') {
      // ──────────────── LUCIFER'S PENTECOSTAL SILVER COIN ────────────────
      const targetSide = String(targetResult).toLowerCase() === 'heads' ? 'heads' : 'tails';
      const isHeads = targetSide === 'heads';

      const coinGeo = cachedCoinGeometry
        ? cachedCoinGeometry.clone()
        : new THREE.CylinderGeometry(2.3, 2.3, 0.45, 36).rotateX(Math.PI / 2);

      // Antique silver metal material
      const silverMat = new THREE.MeshStandardMaterial({
        color: 0xd2dbe4, // Antique Silver
        roughness: 0.28,
        metalness: 0.9,
        emissive: new THREE.Color(0x15222e),
        emissiveIntensity: 0.15,
      });

      const coinMesh = new THREE.Mesh(coinGeo, silverMat);
      dieRoot.add(coinMesh);

      // Silver perimeter edge ring
      const edgeGeo = new THREE.EdgesGeometry(coinGeo, 30);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xdce7f3),
        linewidth: 1,
        transparent: true,
        opacity: 0.4,
      });
      dieRoot.add(new THREE.LineSegments(edgeGeo, edgeMat));

      // In the Lucifer Coin STL:
      // +Z face is the Devil Face (Lucifer / Heads)
      // -Z face is the Crucifix (Cross / Tails)
      const targetNormal = isHeads ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 0, -1);
      const targetUp = new THREE.Vector3(0, 1, 0);
      dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetNormal, targetUp, cameraLookDir);

      dieRoot.userData.isCoin = true;
      dieRoot.userData.coinMesh = coinMesh;
      dieRoot.userData.silverMat = silverMat;
      dieRoot.userData.winningLabel = targetSide;

      if (isHighlightEligible) {
        const spotPos = targetNormal.clone().multiplyScalar(2.6);
        const faceSpot = new THREE.PointLight(0xaad4f5, 0, 12, 1.8);
        faceSpot.position.copy(spotPos);
        dieRoot.add(faceSpot);
        dieRoot.userData.faceSpotlight = faceSpot;
      }
    } else if (dieType === 'd6') {
      // ──────────────── D6 CUBE (BoxGeometry) ────────────────
      const size = 2.4;
      const geometry = new THREE.BoxGeometry(size, size, size);
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

      if (isHighlightEligible) {
        const hlGeo = new THREE.PlaneGeometry(2.35, 2.35);
        const hlMat = new THREE.MeshStandardMaterial({
          map: createEngravedFaceTexture(targetNum, 'd6', true, false),
          transparent: true,
          opacity: 0,
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

        const faceSpot = new THREE.PointLight(theme.border, 0, 10, 1.3);
        faceSpot.position.copy(targetFace.center).add(targetFace.normal.clone().multiplyScalar(2.2));
        dieRoot.add(faceSpot);
        dieRoot.userData.faceSpotlight = faceSpot;
      }
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
          const data = createD10Data(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.15;
          break;
        }
        case 'd10percentile': {
          const data = createD10Data(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
          geometry = data.geometry;
          faces = data.faces;
          planeSize = 1.15;
          break;
        }
        case 'd12': {
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

      const baseMaterial = new THREE.MeshStandardMaterial({
        color: theme.baseColor,
        roughness: 0.18,
        metalness: 0.88,
        emissive: new THREE.Color(theme.border),
        emissiveIntensity: 0.15,
      });
      const bodyMesh = new THREE.Mesh(geometry, baseMaterial);
      dieRoot.add(bodyMesh);

      const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      dieRoot.add(new THREE.LineSegments(edgeGeo, edgeMat));

      const targetStr = String(targetResult);
      const targetFace =
        faces.find((f) => String(f.label) === targetStr) ||
        faces.find((f) => Number(f.label) === Number(targetResult)) ||
        faces[0];

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

        const z_plate = f.normal.clone().normalize();
        let y_plate = f.up.clone().projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 1, 0).projectOnPlane(z_plate);
        if (y_plate.lengthSq() < 0.001) y_plate = new THREE.Vector3(0, 0, 1).projectOnPlane(z_plate);
        y_plate.normalize();
        const x_plate = new THREE.Vector3().crossVectors(y_plate, z_plate).normalize();
        plate.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x_plate, y_plate, z_plate));

        dieRoot.add(plate);

        if (f === targetFace && isHighlightEligible) {
          dieRoot.userData.winningPlate = plate;
          dieRoot.userData.winningLabel = f.label;
          dieRoot.userData.dieType = dieType;
        }
      });

      if (targetFace) {
        dieRoot.userData.targetQuaternion = computeSettlingQuaternion(targetFace.normal, targetFace.up, cameraLookDir);

        if (isHighlightEligible) {
          const faceSpot = new THREE.PointLight(theme.border, 0, 10, 1.3);
          faceSpot.position.copy(targetFace.center).add(targetFace.normal.clone().multiplyScalar(2.2));
          dieRoot.add(faceSpot);
          dieRoot.userData.faceSpotlight = faceSpot;
        }
      }
    }

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

    setActiveRollBanner(null);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);

    while (diceGroup.children.length > 0) {
      diceGroup.remove(diceGroup.children[0]);
    }

    playDiceClatterSound();

    const notationStr = rollData.diceNotation || rollData.notation || '1d20';
    const isD100 = notationStr.toLowerCase().includes('d100');
    const isCoin = rollData.isCoin || notationStr.toLowerCase().includes('coin');
    const seed = rollData.physics?.seed || Math.random() * 1000;
    const rollMode = rollData.rollMode || 'normal';

    if (isCoin) {
      // ──────────────── LUCIFER'S SILVER COIN TOSS ────────────────
      const results = rollData.results || ['HEADS'];
      const count = Math.min(results.length, 10);

      for (let i = 0; i < count; i++) {
        const coinSide = results[i] || 'HEADS';
        const coinMesh = createDieMesh('coin', seed + i * 47, coinSide, true);
        if (count <= 4) {
          coinMesh.position.x += (i - (count - 1) / 2) * 3.4;
        } else {
          const cols = Math.ceil(count / 2);
          const row = Math.floor(i / cols);
          const col = i % cols;
          coinMesh.position.x += (col - (cols - 1) / 2) * 3.0;
          coinMesh.position.y += row === 0 ? 1.2 : -1.2;
        }
        diceGroup.add(coinMesh);
      }
    } else if (isD100) {
      // ──────────────── D100 PERCENTILE (Tens + Units) ────────────────
      const tensVal = rollData.tensResult || '00';
      const onesVal = rollData.onesResult !== undefined ? String(rollData.onesResult) : '0';

      const dieTens = createDieMesh('d10percentile', seed, tensVal, true);
      dieTens.position.x = -2.4;
      diceGroup.add(dieTens);

      const dieOnes = createDieMesh('d10', seed + 47, onesVal, true);
      dieOnes.position.x = 2.4;
      diceGroup.add(dieOnes);
    } else if (rollMode === 'advantage' || rollMode === 'disadvantage') {
      // ──────────────── ADVANTAGE / DISADVANTAGE ────────────────
      const results = rollData.results || [10, 10];
      const winIdx = rollData.winningIndex !== undefined ? rollData.winningIndex : 0;

      const die1 = createDieMesh('d20', seed, results[0], winIdx === 0);
      die1.position.x = -2.2;
      diceGroup.add(die1);

      const die2 = createDieMesh('d20', seed + 73, results[1], winIdx === 1);
      die2.position.x = 2.2;
      diceGroup.add(die2);
    } else {
      // ──────────────── MULTIPLE STANDARD DICE ────────────────
      const match = notationStr.match(/(\d*)d(\d+)/i) || [null, '1', '20'];
      const rawCount = Number(match[1]) || 1;
      const count = Math.min(rawCount, 10);
      const dieSides = `d${match[2] || '20'}`;
      const results = rollData.results || [10];

      for (let i = 0; i < count; i++) {
        const targetNum = results[i] || 1;
        const dieMesh = createDieMesh(dieSides, seed + i * 47, targetNum, true);
        if (count <= 4) {
          dieMesh.position.x += (i - (count - 1) / 2) * 3.2;
        } else {
          const cols = Math.ceil(count / 2);
          const row = Math.floor(i / cols);
          const col = i % cols;
          dieMesh.position.x += (col - (cols - 1) / 2) * 2.8;
          dieMesh.position.y += row === 0 ? 1.2 : -1.2;
        }
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
        isCoin: rollData.isCoin,
        rollMode: rollData.rollMode,
        chosenResult: rollData.chosenResult,
      });

      // Auto-remove dice and outcome banner from UI 5 seconds after outcome is shown
      bannerTimerRef.current = setTimeout(() => {
        clearDice();
      }, 5000);
    }, 1380);
  }, [clearDice]);

  // Listen for real-time multiplayer rolls
  useDiceSync((incomingRoll) => {
    if (incomingRoll.playerId !== user?.uid) {
      const isRollSecretDM = Boolean(
        incomingRoll.isSecret ||
        incomingRoll.role === 'dm' ||
        incomingRoll.isDMRoll ||
        incomingRoll.playerName?.includes('(DM)')
      );

      // DM rolls are strictly private to the DM; player rolls are visible to everyone!
      if (isRollSecretDM && !isViewerDM) {
        return;
      }

      trigger3DVisual(incomingRoll);
      setRecentRolls((prev) => [incomingRoll, ...prev.slice(0, 19)]);
    }
  });

  // Cross-tab & local multiplayer sync listener
  useEffect(() => {
    const handleRemoteRoll = (data) => {
      if (!data || data.playerId === user?.uid) return;

      const isRollSecretDM = Boolean(
        data.isSecret ||
        data.role === 'dm' ||
        data.isDMRoll ||
        data.playerName?.includes('(DM)')
      );

      // DM rolls are strictly private to the DM!
      if (isRollSecretDM && !isViewerDM) {
        return;
      }

      trigger3DVisual(data);
      setRecentRolls((prev) => [data, ...prev.slice(0, 19)]);
    };

    const handleCustomEvent = (e) => {
      handleRemoteRoll(e.detail);
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'unendingvoid:latest_roll' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleRemoteRoll(parsed);
        } catch (err) {}
      }
    };

    window.addEventListener('unendingvoid:multiplayer_roll', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('unendingvoid:multiplayer_roll', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [user?.uid, isViewerDM]);

  // Global trigger listener
  useEffect(() => {
    const handleGlobalRollEvent = (e) => {
      const { notation: not, modifier: mod, label, rollMode: mode, isSecret } = e.detail || {};
      handleRoll(not || '1d20', mod !== undefined ? mod : modifier, label || 'action', mode || 'normal', null, isSecret);
    };

    window.addEventListener('unendingvoid:roll', handleGlobalRollEvent);
    return () => window.removeEventListener('unendingvoid:roll', handleGlobalRollEvent);
  }, [modifier]);

  // Execute roll logic
  const handleRoll = async (
    targetNotation = '1d20',
    customMod = null,
    purpose = 'action',
    rollMode = 'normal',
    quantityOverride = null,
    secretOverride = null
  ) => {
    if (isRolling) return;
    setIsRolling(true);

    const isSecretRoll = secretOverride !== null ? secretOverride : isViewerDM;
    const appliedMod = customMod !== null ? customMod : modifier;
    const seed = Math.floor(Math.random() * 1000000);
    const rollStr = String(targetNotation).toLowerCase();
    const defaultPlayerName = isViewerDM
      ? (profile?.displayName || 'Void Master (DM)')
      : (profile?.displayName || user?.displayName || 'Void Operative');
    const rollRole = isSecretRoll ? 'dm' : (profile?.role || 'player');

    let rollPayload;

    if (rollStr.includes('coin')) {
      // Preload Lucifer Coin STL if not already ready
      await getOrLoadCoinGeometry();

      const count = Math.max(1, Math.min(10, quantityOverride || parseInt(rollStr, 10) || 1));
      const results = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.random() < 0.5 ? 'HEADS' : 'TAILS');
      }

      const headsCount = results.filter((r) => r === 'HEADS').length;
      const tailsCount = results.length - headsCount;
      const totalDisplay = count === 1 ? results[0] : `${headsCount}H / ${tailsCount}T`;
      const formattedNotation = `${count > 1 ? `${count}× ` : ''}🪙 Lucifer's Silver Coin`;

      rollPayload = {
        userId: user?.uid || 'guest',
        playerName: defaultPlayerName,
        role: rollRole,
        isSecret: isSecretRoll,
        isDMRoll: isSecretRoll,
        notation: formattedNotation,
        diceNotation: formattedNotation,
        results,
        total: totalDisplay,
        modifier: 0,
        purpose: purpose === 'action' ? "Lucifer's Coin Toss (Pentecostal)" : purpose,
        isCoin: true,
        physicsSeed: seed,
      };
    } else if (rollStr.includes('d100')) {
      // ──────────────── D100 PERCENTILE ────────────────
      const raw100 = Math.floor(Math.random() * 100) + 1;
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
        playerName: defaultPlayerName,
        role: rollRole,
        isSecret: isSecretRoll,
        isDMRoll: isSecretRoll,
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
    } else if (rollMode === 'advantage' || rollMode === 'disadvantage') {
      // ──────────────── ADVANTAGE / DISADVANTAGE ────────────────
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const results = [r1, r2];

      const isAdv = rollMode === 'advantage';
      const chosenResult = isAdv ? Math.max(r1, r2) : Math.min(r1, r2);
      const winningIndex = isAdv ? (r1 >= r2 ? 0 : 1) : (r1 <= r2 ? 0 : 1);
      const total = chosenResult + appliedMod;

      const modStr = appliedMod ? (appliedMod >= 0 ? `+${appliedMod}` : `${appliedMod}`) : '';
      const formattedNotation = `2d20 (${isAdv ? 'Advantage' : 'Disadvantage'})${modStr}`;

      rollPayload = {
        userId: user?.uid || 'guest',
        playerName: defaultPlayerName,
        role: rollRole,
        isSecret: isSecretRoll,
        isDMRoll: isSecretRoll,
        notation: formattedNotation,
        diceNotation: formattedNotation,
        results,
        chosenResult,
        winningIndex,
        total,
        modifier: appliedMod,
        purpose: `${purpose} (${isAdv ? 'Advantage' : 'Disadvantage'})`,
        rollMode,
        physicsSeed: seed,
      };
    } else {
      // ──────────────── STANDARD & CRITICAL ROLLS ────────────────
      const match = rollStr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
      let count = 1;
      let sides = 20;
      let notMod = 0;

      if (match) {
        count = parseInt(match[1], 10) || 1;
        sides = parseInt(match[2], 10) || 20;
        if (match[3]) notMod = parseInt(match[3], 10);
      }

      if (quantityOverride) {
        count = quantityOverride;
      }

      // CRITICAL HIT DOUBLES DICE COUNT
      if (rollMode === 'critical') {
        count *= 2;
      }

      count = Math.max(1, Math.min(10, count));

      const totalMod = customMod !== null ? customMod : appliedMod + notMod;
      const results = [];
      for (let i = 0; i < count; i++) {
        if (sides === 10) {
          results.push(String(Math.floor(Math.random() * 10)));
        } else {
          results.push(Math.floor(Math.random() * sides) + 1);
        }
      }
      const sum = results.reduce((a, b) => a + (Number(b) || 0), 0);
      const total = sum + totalMod;

      const modStr = totalMod ? (totalMod >= 0 ? `+${totalMod}` : `${totalMod}`) : '';
      const critStr = rollMode === 'critical' ? ' (CRITICAL)' : '';
      const formattedNotation = `${count}d${sides}${modStr}${critStr}`;

      rollPayload = {
        userId: user?.uid || 'guest',
        playerName: defaultPlayerName,
        role: rollRole,
        isSecret: isSecretRoll,
        isDMRoll: isSecretRoll,
        notation: formattedNotation,
        diceNotation: formattedNotation,
        results,
        total,
        modifier: totalMod,
        purpose: rollMode === 'critical' ? `💥 CRITICAL: ${purpose}` : purpose,
        rollMode,
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
      <div ref={mountRef} className="fixed inset-0 pointer-events-none z-40 overflow-hidden" />

      {/* 100% Solid Opaque Roll Result Banner */}
      {activeRollBanner && ((!activeRollBanner.isSecret && !activeRollBanner.isDMRoll && activeRollBanner.role !== 'dm') || isViewerDM) && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-bounce-short">
          <div className={`bg-[#060a14] border-2 ${
            activeRollBanner.isSecret || activeRollBanner.isDMRoll || activeRollBanner.role === 'dm'
              ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.7)]'
              : 'border-neon-cyan shadow-[0_0_40px_rgba(0,240,255,0.7)]'
          } px-6 py-3.5 rounded-2xl flex items-center gap-4 text-white relative`}>
            <div className={`w-12 h-12 rounded-xl ${
              activeRollBanner.isSecret || activeRollBanner.isDMRoll || activeRollBanner.role === 'dm'
                ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-300'
                : 'bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan'
            } flex items-center justify-center font-display font-black text-xl shadow-[0_0_15px_rgba(0,240,255,0.4)]`}>
              {activeRollBanner.isSecret || activeRollBanner.isDMRoll || activeRollBanner.role === 'dm'
                ? '🛡️'
                : (activeRollBanner.isCoin ? '🪙' : '🎲')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-white">
                  {activeRollBanner.playerName}
                </span>
                {(activeRollBanner.isSecret || activeRollBanner.isDMRoll || activeRollBanner.role === 'dm') ? (
                  <span className="text-[10px] uppercase font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40 font-bold flex items-center gap-1">
                    🛡️ {t('dice.dmSecretBanner') || 'DM Roll (Behind Screen)'}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono text-neon-cyan bg-neon-cyan/15 px-2 py-0.5 rounded border border-neon-cyan/35 font-bold">
                    {activeRollBanner.purpose || activeRollBanner.notation}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-200 font-mono mt-1">
                {activeRollBanner.isCoin ? (
                  <>
                    Relic Face: [
                    {activeRollBanner.results?.map((r) => `${r} (${r === 'HEADS' ? 'Devil' : 'Cross'})`).join(', ')}
                    ]
                  </>
                ) : activeRollBanner.tensResult !== undefined ? (
                  <>Percentile: [{activeRollBanner.tensResult} + {activeRollBanner.onesResult}]</>
                ) : activeRollBanner.rollMode === 'advantage' || activeRollBanner.rollMode === 'disadvantage' ? (
                  <>
                    Rolls: [{activeRollBanner.results?.join(', ')}] ➔ Picked:{' '}
                    <strong className="text-neon-cyan font-bold">{activeRollBanner.chosenResult}</strong>
                  </>
                ) : (
                  <>Die Result: [{activeRollBanner.results?.join(', ')}]</>
                )}
                {activeRollBanner.modifier
                  ? ` (${activeRollBanner.modifier >= 0 ? `+${activeRollBanner.modifier}` : activeRollBanner.modifier})`
                  : ''}
              </div>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="text-[9px] uppercase font-mono text-gray-400 block tracking-wider">
                {activeRollBanner.isCoin ? 'Outcome' : 'Total'}
              </span>
              <span className="font-display text-2xl md:text-3xl font-black text-neon-cyan drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                {activeRollBanner.total}
              </span>
            </div>
            <button
              onClick={clearDice}
              className="text-gray-400 hover:text-white ml-2 text-sm px-1.5 py-1 hover:bg-white/10 rounded transition-colors"
              title="Dismiss banner & dice"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Quick Dice Bar */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2.5 rounded-xl bg-[#070b14] text-gray-300 hover:text-neon-cyan border-2 border-slate-700 hover:border-neon-cyan transition-all text-xs font-mono shadow-xl ${showHistory ? 'border-neon-cyan text-neon-cyan' : ''}`}
          title="Toggle Quantum Roll Ledger"
        >
          📜
        </button>

        {/* Die Selector Buttons + Lucifer's Silver Coin */}
        <div className="bg-[#070b14] px-3 py-1.5 flex items-center gap-1.5 border-2 border-slate-700 rounded-xl shadow-xl">
          {isViewerDM && (
            <span
              className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase bg-purple-900/40 text-purple-300 border border-purple-500/50 flex items-center gap-1 shadow-sm shrink-0"
              title="DM Screen Active: Your rolls are hidden from player terminals"
            >
              🛡️ {t('dice.dmPrivateMode') || 'DM Screen (Secret)'}
            </span>
          )}

          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map((d) => (
            <button
              key={d}
              onClick={() => handleRoll(d === 'd100' ? '1d100' : `1${d}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setQuantityPopover({
                  x: e.clientX,
                  y: e.clientY,
                  dieType: d,
                });
                setCustomQuantity('2');
              }}
              disabled={isRolling}
              title={`Left-click: Roll 1${d} · Right-click: Choose quantity`}
              className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-all
                         ${d === 'd20'
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                           : d === 'd100'
                             ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                             : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {d}
            </button>
          ))}

          {/* Lucifer's Silver Coin Button */}
          <button
            onClick={() => handleRoll('coin')}
            onContextMenu={(e) => {
              e.preventDefault();
              setQuantityPopover({
                x: e.clientX,
                y: e.clientY,
                dieType: 'coin',
              });
              setCustomQuantity('2');
            }}
            disabled={isRolling}
            title="Left-click: Flip Lucifer's Silver Coin · Right-click: Flip multiple"
            className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-all bg-slate-300/20 text-slate-200 border border-slate-300/50 shadow-[0_0_10px_rgba(203,213,225,0.35)] hover:scale-105 active:scale-95 flex items-center gap-1"
          >
            <span>🪙</span>
            <span>Silver Coin</span>
          </button>
        </div>
      </div>

      {/* Right-Click Multi-Dice Quantity Popover */}
      {quantityPopover && (
        <div
          style={{
            left: `${Math.min(quantityPopover.x - 60, window.innerWidth - 250)}px`,
            bottom: '65px',
          }}
          className="fixed z-50 w-64 glass-panel p-3 border border-neon-cyan/50 bg-void-bg/95 shadow-[0_0_25px_rgba(0,240,255,0.35)] rounded-xl font-mono text-xs animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <span className="font-display font-bold text-neon-cyan uppercase tracking-wider text-[11px]">
              {quantityPopover.dieType === 'coin'
                ? "🪙 Lucifer's Silver Coin"
                : `🎲 Roll Multiple ${quantityPopover.dieType.toUpperCase()}`}
            </span>
            <button
              onClick={() => setQuantityPopover(null)}
              className="text-gray-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
              Quick Count:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (quantityPopover.dieType === 'coin') {
                      handleRoll('coin', 0, "Lucifer's Coin Toss", 'normal', num);
                    } else if (quantityPopover.dieType === 'd100') {
                      handleRoll('1d100');
                    } else {
                      handleRoll(`${num}${quantityPopover.dieType}`);
                    }
                    setQuantityPopover(null);
                  }}
                  className="py-1 rounded bg-white/10 hover:bg-neon-cyan/20 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/50 font-bold text-xs transition-all"
                >
                  {num}×
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="10"
                value={customQuantity}
                onChange={(e) => setCustomQuantity(e.target.value)}
                className="w-16 bg-[#090e1a] border border-slate-600 rounded px-2 py-1 text-white text-center font-bold text-xs focus:border-neon-cyan focus:outline-none"
              />
              <button
                onClick={() => {
                  const count = Math.max(1, Math.min(10, parseInt(customQuantity, 10) || 1));
                  if (quantityPopover.dieType === 'coin') {
                    handleRoll('coin', 0, "Lucifer's Coin Toss", 'normal', count);
                  } else if (quantityPopover.dieType === 'd100') {
                    handleRoll('1d100');
                  } else {
                    handleRoll(`${count}${quantityPopover.dieType}`);
                  }
                  setQuantityPopover(null);
                }}
                className="flex-1 py-1 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold uppercase text-[11px] transition-all"
              >
                Roll {customQuantity || 1}×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roll History Drawer - 100% Opaque Military Telemetry Ledger */}
      {showHistory && (
        <div className="fixed bottom-20 right-5 w-84 max-h-[26rem] bg-[#070b14] p-4 z-50 shadow-[0_0_35px_rgba(0,0,0,0.95)] border-2 border-slate-700/90 rounded-xl animate-fade-in flex flex-col">
          <div className="flex items-center justify-between bg-[#0d1424] -mx-4 -mt-4 p-3 mb-3 border-b-2 border-slate-700/90 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
              <span className="font-display text-xs text-white uppercase tracking-widest font-black">
                📜 Quantum Roll Ledger
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/60 text-amber-400 border border-amber-500/40">
                Opaque // Telemetry
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 px-1.5 py-0.5 rounded text-xs transition-colors"
                title="Close Ledger"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 text-xs font-mono">
            {recentRolls.filter((r) => {
              const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
              if (isSecret && !isViewerDM) return false;
              return true;
            }).length === 0 ? (
              <div className="py-8 text-center text-gray-500 italic space-y-1">
                <span className="text-xl block opacity-40">📊</span>
                <p>No rolls logged in current session.</p>
              </div>
            ) : (
              recentRolls
                .filter((r) => {
                  const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
                  if (isSecret && !isViewerDM) return false;
                  return true;
                })
                .map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors shadow-sm ${
                      r.isSecret || r.isDMRoll || r.role === 'dm'
                        ? 'bg-[#181126] hover:bg-[#201633] border-purple-500/50'
                        : 'bg-[#0e1628] hover:bg-[#141f36] border-slate-700/70'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold block text-[13px] ${
                          r.isSecret || r.isDMRoll || r.role === 'dm' ? 'text-purple-300' : 'text-neon-cyan'
                        }`}>
                          {r.playerName}
                        </span>
                        {(r.isSecret || r.isDMRoll || r.role === 'dm') && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] uppercase font-bold">
                            🛡️ {t('dice.dmSecretBadge') || 'DM Secret'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-300 block">
                        {r.purpose || r.notation}{' '}
                        <span className="text-amber-400 font-bold">
                          {r.isCoin
                            ? `[${r.results?.join(',')}]`
                            : r.tensResult !== undefined
                              ? `[${r.tensResult}, ${r.onesResult}]`
                              : `[${r.results?.join(',')}]`}
                        </span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-black text-base text-white block">
                        {r.total}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-400">Total</span>
                    </div>
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
 * Trigger a roll programmatically from anywhere in the app with exact die type, modifier, label, rollMode, and secret flag.
 */
export function triggerInteractiveRoll(notation, modifier = 0, label = 'Action', rollMode = 'normal', isSecret = null) {
  window.dispatchEvent(
    new CustomEvent('unendingvoid:roll', {
      detail: { notation, modifier, label, rollMode, isSecret },
    })
  );
}
