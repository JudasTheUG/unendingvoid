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
      const delay = i * 0.07 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(160 + Math.random() * 120, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + delay + 0.08);

      gain.gain.setValueAtTime(0.14, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.09);
    }
  } catch (err) {
    // Audio might be blocked prior to user interaction
  }
}

// Color palettes per die type
const DIE_THEMES = {
  d4: { border: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', baseColor: 0x231a04 },
  d6: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', baseColor: 0x240808 },
  d8: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', baseColor: 0x251406 },
  d10: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', baseColor: 0x052014 },
  d12: { border: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', baseColor: 0x190828 },
  d20: { border: '#00f0ff', glow: 'rgba(0, 240, 255, 0.5)', baseColor: 0x061e28 },
};

// Generate high-resolution canvas texture with legible glowing numbers
function createNumberTexture(number, dieType) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;

  // Background
  ctx.fillStyle = '#08101e';
  ctx.fillRect(0, 0, 256, 256);

  // Border & Glow
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 232, 232);

  // Inner border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, 204, 204);

  // Number text
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = theme.border;
  ctx.shadowBlur = 18;
  ctx.font = 'bold 105px monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 128, 128);

  // Underline for 6 and 9
  if (number === 6 || number === 9) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = theme.border;
    ctx.beginPath();
    ctx.moveTo(90, 195);
    ctx.lineTo(166, 195);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Generate circular badge texture for polyhedral faces
function createFaceSpriteTexture(number, dieType) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;

  ctx.clearRect(0, 0, 128, 128);

  // Circular background
  ctx.fillStyle = 'rgba(8, 16, 30, 0.88)';
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();

  // Glowing ring
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 6;
  ctx.shadowColor = theme.border;
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 12;
  ctx.fillText(String(number), 64, 66);

  if (number === 6 || number === 9) {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 102);
    ctx.lineTo(80, 102);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function DiceOverlay({ user, profile, modifier = 0 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const diceGroupRef = useRef(null);
  const animFrameRef = useRef(null);

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
    camera.position.set(0, 0, 19);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    cyanLight.position.set(10, 15, 10);
    scene.add(cyanLight);

    const magentaLight = new THREE.DirectionalLight(0xff00aa, 1.8);
    magentaLight.position.set(-10, -10, 10);
    scene.add(magentaLight);

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
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (diceGroup && diceGroup.children.length > 0) {
        diceGroup.children.forEach((die) => {
          if (die.userData.animating) {
            die.rotation.x += die.userData.rotVel.x * dt;
            die.rotation.y += die.userData.rotVel.y * dt;
            die.rotation.z += die.userData.rotVel.z * dt;

            die.userData.rotVel.multiplyScalar(Math.max(0, 1 - 1.2 * dt));
            die.position.x += die.userData.linVel.x * dt;
            die.position.y += die.userData.linVel.y * dt;
            die.userData.linVel.y -= 9.8 * dt;

            if (die.position.y < -2) {
              die.position.y = -2;
              die.userData.linVel.y *= -0.35;
            }

            if (die.userData.rotVel.length() < 0.25 && Math.abs(die.userData.linVel.y) < 0.25) {
              die.userData.animating = false;
              // Orient to target result smoothly
              if (die.userData.targetQuaternion) {
                die.quaternion.slerp(die.userData.targetQuaternion, 0.2);
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

  // Helper to construct exact 3D Polyhedral Die with visible face numbers
  const createDieMesh = (dieType, seed, targetResult) => {
    const theme = DIE_THEMES[dieType] || DIE_THEMES.d20;
    const dieRoot = new THREE.Group();

    if (dieType === 'd6') {
      // D6 cube with 6 textured faces
      const size = 2.4;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const materials = [
        new THREE.MeshStandardMaterial({ map: createNumberTexture(1, 'd6'), roughness: 0.3, metalness: 0.6 }),
        new THREE.MeshStandardMaterial({ map: createNumberTexture(6, 'd6'), roughness: 0.3, metalness: 0.6 }),
        new THREE.MeshStandardMaterial({ map: createNumberTexture(2, 'd6'), roughness: 0.3, metalness: 0.6 }),
        new THREE.MeshStandardMaterial({ map: createNumberTexture(5, 'd6'), roughness: 0.3, metalness: 0.6 }),
        new THREE.MeshStandardMaterial({ map: createNumberTexture(3, 'd6'), roughness: 0.3, metalness: 0.6 }),
        new THREE.MeshStandardMaterial({ map: createNumberTexture(4, 'd6'), roughness: 0.3, metalness: 0.6 }),
      ];
      const cubeMesh = new THREE.Mesh(geometry, materials);
      dieRoot.add(cubeMesh);
    } else {
      // Polyhedral Die (d4, d8, d10, d12, d20)
      let geometry;
      let faceCount = 20;
      const radius = 2.1;

      switch (dieType) {
        case 'd4':
          geometry = new THREE.TetrahedronGeometry(radius);
          faceCount = 4;
          break;
        case 'd8':
          geometry = new THREE.OctahedronGeometry(radius);
          faceCount = 8;
          break;
        case 'd10':
          // Decahedral bipyramid approximation
          geometry = new THREE.CylinderGeometry(0.01, radius * 1.1, 2.6, 5);
          faceCount = 10;
          break;
        case 'd12':
          geometry = new THREE.DodecahedronGeometry(radius);
          faceCount = 12;
          break;
        case 'd20':
        default:
          geometry = new THREE.IcosahedronGeometry(radius);
          faceCount = 20;
          break;
      }

      // Base body mesh with dark sci-fi material
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: theme.baseColor,
        roughness: 0.25,
        metalness: 0.85,
        emissive: new THREE.Color(theme.border),
        emissiveIntensity: 0.2,
      });

      const bodyMesh = new THREE.Mesh(geometry, baseMaterial);
      dieRoot.add(bodyMesh);

      // Glowing wireframe edge accents
      const wireGeo = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(theme.border),
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
      });
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      dieRoot.add(wire);

      // Attach glowing number badges to each face normal
      // For polyhedra, we extract outward vertex normals to position numbers
      const posAttr = geometry.attributes.position;
      const uniqueNormals = [];

      for (let i = 0; i < posAttr.count; i += 3) {
        const vA = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        const vB = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
        const vC = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

        const center = new THREE.Vector3()
          .add(vA)
          .add(vB)
          .add(vC)
          .divideScalar(3);

        const normal = center.clone().normalize();

        // Ensure distinct face center
        const exists = uniqueNormals.some((n) => n.distanceTo(normal) < 0.25);
        if (!exists && uniqueNormals.length < faceCount) {
          uniqueNormals.push(normal);
        }
      }

      // Add number decals on face positions
      uniqueNormals.forEach((normal, idx) => {
        const num = idx + 1;
        const spriteMat = new THREE.SpriteMaterial({
          map: createFaceSpriteTexture(num, dieType),
          transparent: true,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.copy(normal).multiplyScalar(radius * 1.02);
        sprite.scale.set(1.2, 1.2, 1.2);
        dieRoot.add(sprite);
      });
    }

    // Initial random launch physics
    const prng = (Math.sin(seed) * 10000) % 1;
    dieRoot.position.set(-6 + prng * 12, 6, -2);
    dieRoot.userData = {
      animating: true,
      rotVel: new THREE.Vector3(12 + Math.random() * 16, 14 + Math.random() * 16, 10 + Math.random() * 16),
      linVel: new THREE.Vector3(1 + Math.random() * 2, 2.5 + Math.random() * 2.5, -1),
    };

    return dieRoot;
  };

  // Trigger 3D tumble visual for local or networked roll
  const trigger3DVisual = useCallback((rollData) => {
    if (!diceGroupRef.current) return;
    const diceGroup = diceGroupRef.current;

    while (diceGroup.children.length > 0) {
      diceGroup.remove(diceGroup.children[0]);
    }

    playDiceClatterSound();

    const notationStr = rollData.diceNotation || '1d20';
    const match = notationStr.match(/(\d*)d(\d+)/i) || [null, '1', '20'];
    const count = Math.min(Number(match[1]) || 1, 6);
    const dieSides = `d${match[2] || '20'}`;
    const seed = rollData.physics?.seed || Math.random() * 1000;
    const results = rollData.results || [10];

    for (let i = 0; i < count; i++) {
      const targetNum = results[i] || 1;
      const dieMesh = createDieMesh(dieSides, seed + i * 47, targetNum);
      dieMesh.position.x += (i - count / 2) * 2.8;
      diceGroup.add(dieMesh);
    }

    // Display banner
    setActiveRollBanner({
      playerName: rollData.playerName,
      notation: rollData.diceNotation,
      results: rollData.results,
      total: rollData.total,
      modifier: rollData.modifier,
      purpose: rollData.purpose,
      isAttack: rollData.purpose === 'attack',
      isDamage: rollData.purpose === 'damage',
    });

    setTimeout(() => {
      setActiveRollBanner(null);
    }, 4500);
  }, []);

  // Listen for real-time multiplayer rolls
  useDiceSync((incomingRoll) => {
    if (incomingRoll.playerId !== user?.uid) {
      trigger3DVisual(incomingRoll);
      setRecentRolls((prev) => [incomingRoll, ...prev.slice(0, 19)]);
    }
  });

  // Global trigger listener: allow components to dispatch custom rolls
  useEffect(() => {
    const handleGlobalRollEvent = (e) => {
      const { notation: not, modifier: mod, purpose: purp, label } = e.detail || {};
      handleRoll(not || '1d20', mod !== undefined ? mod : modifier, purp || 'action', label);
    };

    window.addEventListener('unendingvoid:roll', handleGlobalRollEvent);
    return () => window.removeEventListener('unendingvoid:roll', handleGlobalRollEvent);
  }, [modifier]);

  // Execute a local roll
  const handleRoll = async (targetNotation, customMod = null, purpose = 'action', label = '') => {
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

    const rollPayload = {
      userId: user?.uid || 'guest',
      playerName: profile?.displayName || user?.displayName || 'Void Operative',
      notation: `${count}d${sides}${appliedMod ? (appliedMod >= 0 ? `+${appliedMod}` : appliedMod) : ''}`,
      results,
      total,
      modifier: appliedMod,
      purpose: label || purpose || (sides === 20 ? 'check' : 'action'),
      physicsSeed: seed,
    };

    trigger3DVisual(rollPayload);
    setRecentRolls((prev) => [rollPayload, ...prev.slice(0, 19)]);

    try {
      await publishRoll(rollPayload);
    } catch (err) {
      console.warn('[DiceOverlay] Roll sync note:', err.message);
    } finally {
      setTimeout(() => setIsRolling(false), 1200);
    }
  };

  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
      />

      {/* Slide-in Roll Result Banner */}
      {activeRollBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-bounce-short">
          <div className="glass-panel px-6 py-3 border-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-neon-cyan/20 border border-neon-cyan flex items-center justify-center font-display font-black text-neon-cyan text-lg">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-white">
                  {activeRollBanner.playerName}
                </span>
                <span className="text-[10px] uppercase font-mono text-neon-cyan bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                  {activeRollBanner.purpose || activeRollBanner.notation}
                </span>
              </div>
              <div className="text-xs text-gray-300 font-mono mt-0.5">
                Rolled: [{activeRollBanner.results?.join(', ')}]
                {activeRollBanner.modifier
                  ? ` (${activeRollBanner.modifier >= 0 ? `+${activeRollBanner.modifier}` : activeRollBanner.modifier})`
                  : ''}
              </div>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="text-[10px] uppercase font-mono text-gray-400 block">Total</span>
              <span className="font-display text-2xl font-black text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                {activeRollBanner.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dice Bar */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2.5 rounded-xl glass-panel text-gray-300 hover:text-neon-cyan border-white/10 hover:border-neon-cyan transition-all text-xs font-mono shadow-lg"
          title="Roll Ledger"
        >
          📜
        </button>

        {/* Die Selector Pills */}
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
 * Trigger a roll programmatically from any component (e.g. sword attack or skill check).
 */
export function triggerInteractiveRoll(notation, modifier = 0, label = 'Action') {
  window.dispatchEvent(
    new CustomEvent('unendingvoid:roll', {
      detail: { notation, modifier, label },
    })
  );
}
