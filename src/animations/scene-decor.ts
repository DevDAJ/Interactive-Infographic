import * as THREE from 'three';
import gsap from 'gsap';

export function createSceneDecor(group: THREE.Group): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const geos = [
    () => new THREE.OctahedronGeometry(0.22),
    () => new THREE.IcosahedronGeometry(0.18),
    () => new THREE.TorusGeometry(0.2, 0.06, 12, 20),
    () => new THREE.TorusKnotGeometry(0.16, 0.06, 40, 8),
    () => new THREE.DodecahedronGeometry(0.15),
    () => new THREE.BoxGeometry(0.2, 0.2, 0.2),
  ];
  const colors = [0x4444aa, 0x44aa44, 0xaa44aa, 0xaaaa44, 0x44aaaa, 0xaa6644];
  const bgShapes: { geo: THREE.BufferGeometry; x: number; y: number; z: number; color: number }[] = [];

  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.5 + Math.random() * 3.0;
    bgShapes.push({
      geo: geos[i % geos.length](),
      x: Math.cos(angle) * radius + (Math.random() - 0.5) * 1.2,
      y: Math.random() * 1.4 - 0.2,
      z: Math.sin(angle) * radius + (Math.random() - 0.5) * 1.2,
      color: colors[i % colors.length],
    });
  }

  bgShapes.forEach((s, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: s.color,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const mesh = new THREE.Mesh(s.geo, mat);
    mesh.position.set(s.x, s.y, s.z);
    group.add(mesh);

    gsap.to(mesh.position, {
      y: s.y + 0.15,
      duration: 1.6 + i * 0.3,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.4,
    });
    gsap.to(mesh.rotation, {
      x: Math.PI * 2,
      duration: 6 + i * 1.2,
      repeat: -1, ease: 'none',
    });
    gsap.to(mesh.rotation, {
      z: Math.PI * 2,
      duration: 8 + i * 1.5,
      repeat: -1, ease: 'none',
    });
    gsap.to(mesh.scale, {
      x: 1.15, y: 1.15, z: 1.15,
      duration: 2.2 + i * 0.4,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.5,
    });
  });
}
