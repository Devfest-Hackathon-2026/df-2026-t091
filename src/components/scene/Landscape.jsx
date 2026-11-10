// Landscape: main mountain, distant range, forests, boulders, clouds and blowing snow.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { heightAt, rangeHeight, groundAt, slopeAt, surfaceColor, MAIN_HALF, R, H } from '../../lib/terrain.js';

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTerrain(size, segments, heightFn, snowLine, offset = 0) {
  const g = new THREE.PlaneGeometry(size, size, segments, segments);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightFn(pos.getX(i), pos.getZ(i)) + offset);
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = surfaceColor(pos.getY(i), 1 - nrm.getY(i), pos.getX(i), pos.getZ(i), snowLine);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

export function Terrain() {
  const main = useMemo(() => buildTerrain(MAIN_HALF * 2, 240, heightAt, 4.4), []);
  // Distant range sits slightly lower so it never pokes through the main tile.
  const range = useMemo(() => buildTerrain(260, 200, rangeHeight, 15, -0.02), []);
  return (
    <>
      <mesh geometry={main} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={range} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

function useInstances(ref, items, apply) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      apply(o, it);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
}

/** Pine forest on the lower slopes and valley; keeps clear of topic nodes and camps. */
export function Trees({ avoid = [] }) {
  const items = useMemo(() => {
    const rnd = mulberry32(7);
    const out = [];
    for (let k = 0; k < 6000 && out.length < 900; k++) {
      const a = rnd() * Math.PI * 2;
      const r = 3 + Math.sqrt(rnd()) * 26;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = groundAt(x, z);
      if (y > 2.3 + (rnd() - 0.5) * 0.6 || slopeAt(x, z) > 0.33) continue;
      if (avoid.some((p) => Math.hypot(p[0] - x, p[2] - z) < 0.7)) continue;
      // Patchy forests rather than uniform coverage.
      if (Math.sin(x * 0.5) * Math.cos(z * 0.45) + rnd() * 0.9 < 0.1) continue;
      const s = 0.6 + rnd() * 0.8;
      const g = 0.22 + rnd() * 0.12;
      out.push({ x, y, z, s, rot: rnd() * 6.28, color: new THREE.Color(0.08, g, 0.1 + rnd() * 0.05) });
    }
    return out;
  }, [avoid]);

  const crowns = useRef();
  const trunks = useRef();
  useInstances(crowns, items, (o, t) => {
    o.position.set(t.x, t.y + 0.45 * t.s, t.z);
    o.scale.set(t.s, t.s, t.s);
    o.rotation.set(0, t.rot, 0);
  });
  const trunkItems = useMemo(() => items.map((t) => ({ ...t, color: '#5a3b24' })), [items]);
  useInstances(trunks, trunkItems, (o, t) => {
    o.position.set(t.x, t.y + 0.08 * t.s, t.z);
    o.scale.set(t.s, t.s, t.s);
    o.rotation.set(0, 0, 0);
  });

  return (
    <group key={items.length}>
      <instancedMesh ref={crowns} args={[null, null, items.length]} castShadow receiveShadow>
        <coneGeometry args={[0.18, 0.7, 7]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[null, null, items.length]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.18, 5]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** Scattered boulders on the mid slopes. */
export function Rocks() {
  const items = useMemo(() => {
    const rnd = mulberry32(42);
    const out = [];
    for (let k = 0; k < 3000 && out.length < 220; k++) {
      const a = rnd() * Math.PI * 2;
      const r = 1.5 + rnd() * (R + 3);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = heightAt(x, z);
      if (y < 0.8 || y > 5.2) continue;
      const v = 0.3 + rnd() * 0.15;
      out.push({ x, y, z, s: 0.06 + rnd() * 0.18, r: [rnd() * 3, rnd() * 3, rnd() * 3], color: new THREE.Color(v, v * 0.95, v * 0.9) });
    }
    return out;
  }, []);
  const ref = useRef();
  useInstances(ref, items, (o, t) => {
    o.position.set(t.x, t.y + t.s * 0.3, t.z);
    o.scale.set(t.s * 1.3, t.s, t.s);
    o.rotation.set(...t.r);
  });
  return (
    <instancedMesh ref={ref} args={[null, null, items.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  );
}

/** Soft drifting clouds ringing the mountain. */
export function Clouds({ color = '#ffffff', opacity = 0.85 }) {
  const group = useRef();
  const { clouds, geo } = useMemo(() => {
    const rnd = mulberry32(99);
    const clouds = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.5;
      const r = 17 + rnd() * 12;
      return {
        pos: [Math.cos(a) * r, 6 + rnd() * 4, Math.sin(a) * r],
        puffs: Array.from({ length: 6 + Math.floor(rnd() * 6) }, () => ({
          p: [(rnd() - 0.5) * 4, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.6],
          s: 0.7 + rnd() * 0.9,
        })),
      };
    });
    return {
      clouds,
      geo: new THREE.SphereGeometry(1, 16, 12),
    };
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 1, depthWrite: false }),
    [color, opacity]
  );
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.008;
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={c.pos}>
          {c.puffs.map((p, j) => (
            <mesh key={j} geometry={geo} material={mat} position={p.p} scale={[p.s * 1.4, p.s * 0.7, p.s]} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Wind-blown snow around the upper mountain. */
export function Snow({ count = 700 }) {
  const ref = useRef();
  const { positions, speeds } = useMemo(() => {
    const rnd = mulberry32(5);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 6;
      positions.set([Math.cos(a) * r, H * 0.5 + rnd() * 6, Math.sin(a) * r], i * 3);
      speeds[i] = 0.3 + rnd() * 0.6;
    }
    return { positions, speeds };
  }, [count]);

  useFrame(({ clock }, dt) => {
    const attr = ref.current?.geometry.attributes.position;
    if (!attr) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
      y -= speeds[i] * dt;
      x += (0.6 + Math.sin(t * 0.7 + i) * 0.3) * dt; // wind
      z += Math.cos(t * 0.5 + i * 0.3) * 0.15 * dt;
      if (y < heightAt(x, z) || Math.hypot(x, z) > 7) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 6;
        x = Math.cos(a) * r - 2;
        z = Math.sin(a) * r;
        y = H * 0.6 + Math.random() * 5;
      }
      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}
