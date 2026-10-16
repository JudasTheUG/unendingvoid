import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useDiceSync, publishRoll } from '../../hooks/useDiceSync';

// Synthesize a sci-fi mechanical clatter sound using Web Audio API
function playDiceClatterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // Generate multi-pulse white noise bursts to simulate dice tumbling on glass
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.08 + Math.random() * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 120, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + delay + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.09);
    }
  } catch (err) {
    // Audio might be blocked by browser autoplay policy before user gesture
  }
}

/**
 * DiceOverlay - Full-screen WebGL 3D dice physics canvas with deterministic multiplayer sync.
 */
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

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    // Renderer with transparent canvas
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    const magentaLight = new THREE.DirectionalLight(0xff00aa, 2);
    magentaLight.position.set(-10, -10, 10);
    scene.add(magentaLight);

    // Dice Group
    const diceGroup = new THREE.Group();
    scene.add(diceGroup);
    diceGroupRef.current = diceGroup;

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
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

            // Apply friction
            die.userData.rotVel.multiplyScalar(Math.max(0, 1 - 1.2 * dt));

            // Position arc
            die.position.x += die.userData.linVel.x * dt;
            die.position.y += die.userData.linVel.y * dt;
            die.userData.linVel.y -= 9.8 * dt; // gravity

            if (die.position.y < -2) {
              die.position.y = -2;
              die.userData.linVel.y *= -0.4; // bounce
            }

            // Check if settled
            if (die.userData.rotVel.length() < 0.2 && Math.abs(die.userData.linVel.y) < 0.2) {
              die.userData.animating = false;
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

  // Helper to construct a 3D Polyhedral Die mesh
  const createDieMesh = (dieType, seed) => {
    let geometry;
    const radius = 2.0;

    switch (dieType) {
      case 'd4':
        geometry = new THREE.TetrahedronGeometry(radius);
        break;
      case 'd6':
        geometry = new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5);
        break;
      case 'd8':
        geometry = new THREE.OctahedronGeometry(radius);
        break;
      case 'd10':
        geometry = new THREE.DodecahedronGeometry(radius * 0.9);
        break;
      case 'd12':
        geometry = new THREE.DodecahedronGeometry(radius);
        break;
      case 'd20':
      default:
        geometry = new THREE.IcosahedronGeometry(radius);
        break;
    }

    // Material with sci-fi edge wireframe & translucent glowing core
    const material = new THREE.MeshStandardMaterial({
      color: 0x0a192f,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Glowing edge wireframe
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    mesh.add(wire);

    // Set initial toss physics
    const prng = (Math.sin(seed) * 10000) % 1;
    mesh.position.set(-6 + prng * 12, 6, -2);
    mesh.userData = {
      animating: true,
      rotVel: new THREE.Vector3(10 + Math.random() * 15, 12 + Math.random() * 15, 8 + Math.random() * 15),
      linVel: new THREE.Vector3(1 + Math.random() * 2, 2 + Math.random() * 3, -1),
    };

    return mesh;
  };

  // Replay animation on incoming roll or local roll
  const trigger3DVisual = useCallback((rollData) => {
    if (!diceGroupRef.current) return;
    const diceGroup = diceGroupRef.current;

    // Clear old dice
    while (diceGroup.children.length > 0) {
      diceGroup.remove(diceGroup.children[0]);
    }

    playDiceClatterSound();

    const notationStr = rollData.diceNotation || '1d20';
    const match = notationStr.match(/(\d*)d(\d+)/i) || [null, '1', '20'];
    const count = Math.min(Number(match[1]) || 1, 6);
    const sides = `d${match[2] || '20'}`;
    const seed = rollData.physics?.seed || Math.random() * 1000;

    for (let i = 0; i < count; i++) {
      const dieMesh = createDieMesh(sides, seed + i * 42);
      dieMesh.position.x += (i - count / 2) * 2.5;
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
    });

    // Auto-hide banner after 4.5 seconds
    setTimeout(() => {
      setActiveRollBanner(null);
    }, 4500);
  }, []);

  // Listen for real-time multiplayer rolls
  useDiceSync((incomingRoll) => {
    // If roll was authored by someone else, trigger the 3D replay
    if (incomingRoll.playerId !== user?.uid) {
      trigger3DVisual(incomingRoll);
      setRecentRolls((prev) => [incomingRoll, ...prev.slice(0, 19)]);
    }
  });

  // Execute a local roll
  const handleRoll = async (targetNotation, customMod = null) => {
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

    // Roll numbers
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
      purpose: sides === 20 ? 'check' : 'action',
      physicsSeed: seed,
    };

    // Run local 3D tumbling animation immediately
    trigger3DVisual(rollPayload);
    setRecentRolls((prev) => [rollPayload, ...prev.slice(0, 19)]);

    // Publish to Firestore for all connected clients
    try {
      await publishRoll(rollPayload);
    } catch (err) {
      console.warn('[DiceOverlay] Roll publish error (offline/emulator):', err.message);
    } finally {
      setTimeout(() => setIsRolling(false), 1500);
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
                <span className="text-[10px] uppercase font-mono text-gray-400 bg-white/10 px-1.5 rounded">
                  {activeRollBanner.notation}
                </span>
              </div>
              <div className="text-xs text-gray-300 font-mono mt-0.5">
                Rolled: [{activeRollBanner.results?.join(', ')}]
                {activeRollBanner.modifier ? ` (${activeRollBanner.modifier >= 0 ? `+${activeRollBanner.modifier}` : activeRollBanner.modifier})` : ''}
              </div>
            </div>
            <div className="border-l border-white/20 pl-4 text-center">
              <span className="text-[10px] uppercase font-mono text-neon-cyan block">Total</span>
              <span className="font-display text-2xl font-black text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                {activeRollBanner.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dice Control Bar */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        {/* Toggle History */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2.5 rounded-xl glass-panel text-gray-300 hover:text-neon-cyan border-white/10 hover:border-neon-cyan transition-all text-xs font-mono shadow-lg"
          title="Roll History"
        >
          📜
        </button>

        {/* Quick D20 Button */}
        <button
          onClick={() => handleRoll('1d20')}
          disabled={isRolling}
          className="px-4 py-2.5 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-display font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          🎲 Roll D20
        </button>

        {/* Notation Input Popout */}
        <div className="glass-panel px-3 py-1.5 flex items-center gap-2 border-white/10">
          {['d6', 'd8', 'd12'].map((die) => (
            <button
              key={die}
              onClick={() => handleRoll(`1${die}`)}
              disabled={isRolling}
              className="text-[11px] font-mono text-gray-400 hover:text-neon-cyan uppercase transition-colors px-1"
            >
              {die}
            </button>
          ))}
          <input
            type="text"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            className="w-16 bg-void-bg border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:border-neon-cyan focus:outline-none"
            placeholder="2d6+2"
          />
          <button
            onClick={() => handleRoll(notation)}
            disabled={isRolling}
            className="text-xs text-neon-cyan hover:underline font-mono font-bold"
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
                    <span className="text-[10px] text-gray-400">{r.notation} [{r.results?.join(',')}]</span>
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
