// Resting points: expedition camps with tents, a flag and a campfire that lights up when reached.
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { STRINGS } from '../../lib/i18n.js';

function Tent({ position, rotation = 0, color, lit }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh castShadow receiveShadow position-y={0.16} rotation-y={Math.PI / 4}>
        <coneGeometry args={[0.24, 0.32, 4]} />
        <meshStandardMaterial color={lit ? color : '#7d8590'} roughness={0.8} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.07, 0.15]} rotation-x={-0.45}>
        <planeGeometry args={[0.08, 0.12]} />
        <meshStandardMaterial color={lit ? '#ffcf7a' : '#3b4048'} emissive={lit ? '#ff9a2e' : '#000'} emissiveIntensity={lit ? 0.8 : 0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Campfire({ lit, boost = 1 }) {
  const flame = useRef();
  const light = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.1;
    if (flame.current) flame.current.scale.set(1, f, 1);
    if (light.current) light.current.intensity = 2.4 * f * boost;
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position-y={0.03} rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.2, 5]} />
          <meshStandardMaterial color="#4a2f1b" />
        </mesh>
      ))}
      {lit && (
        <>
          <mesh ref={flame} position-y={0.1}>
            <coneGeometry args={[0.06, 0.18, 7]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={2.8 * boost} transparent opacity={0.92} />
          </mesh>
          <pointLight ref={light} position-y={0.28} color="#ff9a3c" distance={3.5 * boost} decay={1.8} />
        </>
      )}
    </group>
  );
}

export function Camp({ camp, position, reached, isNext, lightBoost = 1, lang = 'en', onClick }) {
  const s = STRINGS[lang] || STRINGS.en;
  const flag = useRef();
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 2.4 + position[0]) * 0.3;
  });
  return (
    <group position={position}>
      <Tent position={[-0.22, 0, 0.05]} rotation={0.3} color="#f28c28" lit={reached} />
      <Tent position={[0.2, 0, -0.12]} rotation={-0.4} color="#e8473b" lit={reached} />
      <group position={[0.02, 0, 0.28]}>
        <Campfire lit={reached} boost={lightBoost} />
      </group>
      <mesh position={[0.42, 0.3, 0.1]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
      <mesh ref={flag} position={[0.42, 0.52, 0.1]}>
        <planeGeometry args={[0.22, 0.13]} />
        <meshStandardMaterial color={reached ? '#ffc845' : '#9aa3b0'} emissive={reached ? '#ffb000' : '#000'} emissiveIntensity={reached ? 0.5 : 0} side={THREE.DoubleSide} />
      </mesh>
      <Html center position={[0, 0.9, 0]} distanceFactor={16} zIndexRange={[10, 0]}>
        <div className={`camp-label ${reached ? 'reached' : isNext ? 'next' : ''}`} onClick={(e) => (e.stopPropagation(), onClick?.())}>
          {reached ? '🔥' : '⛺'} {camp.name}
          <small>
            {camp.id === 'base'
              ? s.startingPoint3d
              : reached
                ? s.restPointClick3d
                : s.restAfterDiff3d(camp.difficulty || 4)}
          </small>
        </div>
      </Html>
    </group>
  );
}
