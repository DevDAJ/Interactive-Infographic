import * as THREE from "three";
import { createSceneDecor } from "../animations/scene-decor";

interface MarkerUserData {
	isMarker?: boolean;
	markerId?: string;
	markerLabel?: string;
	ring?: THREE.Mesh;
	glow?: THREE.Mesh;
}

/** Mobile: prevent scroll/zoom stealing drags; stable scene height when URL bar shows/hides */
function injectBounceTouchCss(): void {
	const id = "bounce-light-touch-css";
	if (document.getElementById(id)) return;
	const style = document.createElement("style");
	style.id = id;
	style.textContent = `
#bounceScene.bounce-scene {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
#bounceScene canvas {
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}
@media (max-width: 768px) {
  #bounceScene.bounce-scene {
    min-height: clamp(260px, min(52vh, 52dvh), 480px);
  }
}`;
	document.head.appendChild(style);
}

(() => {
	const bounceMount = document.getElementById("bounceScene");
	if (!bounceMount) return;

	injectBounceTouchCss();

	const sceneRoot = bounceMount;

	const ballEl = document.getElementById("bounceBall");
	const lightEl = document.getElementById("bounceLight");
	const skyEl = document.getElementById("bounceSky");
	const platformEl = document.getElementById("bouncePlatform");
	const rimEl = document.getElementById("bounceRim");
	if (!ballEl || !lightEl || !skyEl || !platformEl || !rimEl) return;

	const inputs = {
		ball: ballEl as HTMLInputElement,
		light: lightEl as HTMLInputElement,
		sky: skyEl as HTMLInputElement,
		platform: platformEl as HTMLInputElement,
		rim: rimEl as HTMLInputElement,
	};

	const W = sceneRoot.clientWidth || 500;
	const H = sceneRoot.clientHeight || 340;

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 12);
	const camLookY = 0.3;
	let camAngle = 0.5;
	let camElevation = 0.35;
	let currentRadius = 5;
	let targetRadius = 5;
	camera.position.set(
		currentRadius * Math.cos(camElevation) * Math.sin(camAngle),
		camLookY + currentRadius * Math.sin(camElevation),
		currentRadius * Math.cos(camElevation) * Math.cos(camAngle),
	);
	camera.lookAt(0, camLookY, 0);

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true,
	});
	renderer.setSize(W, H);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setClearColor(0x000000, 0);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	sceneRoot.appendChild(renderer.domElement);

	const canvas = renderer.domElement;
	canvas.style.touchAction = "none";

	const coarsePointer =
		typeof window.matchMedia === "function" &&
		window.matchMedia("(pointer: coarse)").matches;
	/** Radians per CSS px - fingers move less precisely than mouse */
	const dragSpeed = coarsePointer ? 0.014 : 0.008;

	const hemi = new THREE.HemisphereLight(0x7777cc, 0xcc5555, 1.5);
	scene.add(hemi);

	const dirLight = new THREE.DirectionalLight(0xffe8cc, 8);
	dirLight.position.set(3, 5, 2);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 1024;
	dirLight.shadow.mapSize.height = 1024;
	dirLight.shadow.camera.near = 0.5;
	dirLight.shadow.camera.far = 10;
	dirLight.shadow.camera.left = -6;
	dirLight.shadow.camera.right = 6;
	dirLight.shadow.camera.top = 6;
	dirLight.shadow.camera.bottom = -6;
	dirLight.shadow.bias = -0.002;
	scene.add(dirLight);

	const rimLight = new THREE.DirectionalLight(0xffeecc, 1.5);
	rimLight.position.set(-0.5, 2, -3);
	scene.add(rimLight);

	const ballGeo = new THREE.SphereGeometry(0.85, 52, 52);
	const ballMat = new THREE.MeshStandardMaterial({
		color: 0xf0f0f0,
		roughness: 0.35,
		metalness: 0.05,
	});
	const ball = new THREE.Mesh(ballGeo, ballMat);
	ball.position.y = 0.85;
	ball.castShadow = true;
	scene.add(ball);

	const platformGeo = new THREE.BoxGeometry(30, 0.08, 30);
	const platformMat = new THREE.MeshStandardMaterial({
		color: 0xcc5555,
		roughness: 0.6,
		metalness: 0,
	});
	const platform = new THREE.Mesh(platformGeo, platformMat);
	platform.receiveShadow = true;
	scene.add(platform);

	const bgGroup = new THREE.Group();
	scene.add(bgGroup);
	createSceneDecor(bgGroup);

	function buildEnv(skyHex: string, groundHex: string): THREE.Texture {
		const envScene = new THREE.Scene();
		const domeGeo = new THREE.SphereGeometry(8, 20, 20);
		const domeMat = new THREE.MeshBasicMaterial({
			color: skyHex,
			side: THREE.BackSide,
		});
		envScene.add(new THREE.Mesh(domeGeo, domeMat));

		const discGeo = new THREE.RingGeometry(0.5, 10, 32);
		const discMat = new THREE.MeshBasicMaterial({
			color: groundHex,
			side: THREE.DoubleSide,
		});
		const disc = new THREE.Mesh(discGeo, discMat);
		disc.rotation.x = -Math.PI / 2;
		disc.position.y = -0.1;
		envScene.add(disc);

		const pmrem = new THREE.PMREMGenerator(renderer);
		const envTex = pmrem.fromScene(envScene).texture;
		envTex.name = "bounceEnv";
		pmrem.dispose();
		return envTex;
	}

	function updateEnv() {
		if (scene.environment) {
			scene.environment.dispose();
			scene.environment = null;
		}
		const sky = inputs.sky.value;
		const ground = inputs.platform.value;
		scene.environment = buildEnv(sky, ground);
	}

	const markerGroup = new THREE.Group();
	scene.add(markerGroup);

	function markerPos(
		angleTop: number,
		angleSide: number,
	): { x: number; y: number; z: number } {
		const r = 0.86;
		const x = r * Math.sin(angleTop) * Math.sin(angleSide);
		const y = r * Math.cos(angleTop);
		const z = r * Math.sin(angleTop) * Math.cos(angleSide);
		return { x, y: y + 0.85, z };
	}

	const markerData = [
		{ id: "sky", label: "Sky Light", angleTop: 0.15, angleSide: 0.6 },
		{ id: "rim", label: "Rim Light", angleTop: 0.8, angleSide: 2.8 },
		{ id: "bounce", label: "Bounce", angleTop: 2.2, angleSide: 0.2 },
		{ id: "shadow", label: "Shadow", angleTop: 2.4, angleSide: -2.2 },
	];

	const markerMeshes: THREE.Mesh[] = [];

	markerData.forEach((md) => {
		const p = markerPos(md.angleTop, md.angleSide);
		const g = new THREE.SphereGeometry(0.09, 20, 20);
		const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
		const mesh = new THREE.Mesh(g, m);
		mesh.position.set(p.x, p.y, p.z);
		const ud = mesh.userData as MarkerUserData;
		ud.isMarker = true;
		ud.markerId = md.id;
		ud.markerLabel = md.label;
		markerGroup.add(mesh);
		markerMeshes.push(mesh);

		const ringG = new THREE.RingGeometry(0.1, 0.14, 28);
		const ringM = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const ring = new THREE.Mesh(ringG, ringM);
		ring.position.copy(mesh.position);
		ring.lookAt(0, 0.3, 0);
		markerGroup.add(ring);
		ud.ring = ring;

		const glowG = new THREE.SphereGeometry(0.11, 16, 16);
		const glowM = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.15,
			depthWrite: false,
		});
		const glow = new THREE.Mesh(glowG, glowM);
		glow.position.copy(mesh.position);
		markerGroup.add(glow);
		ud.glow = glow;
	});

	const tooltip = document.createElement("div");
	tooltip.className = "bl-tooltip";
	tooltip.innerHTML =
		'<div class="bl-swatch"></div><div class="bl-info"><span class="bl-label"></span><span class="bl-hex"></span></div>';
	sceneRoot.appendChild(tooltip);

	let activeMarker: THREE.Mesh | null = null;
	let tooltipPinned = false;

	function showTooltip(marker: THREE.Mesh, colorHex: string): void {
		const label = (marker.userData as MarkerUserData).markerLabel ?? "";
		const labelEl = tooltip.querySelector(".bl-label");
		const hexEl = tooltip.querySelector(".bl-hex");
		const swatch = tooltip.querySelector(".bl-swatch") as HTMLElement | null;
		if (labelEl) labelEl.textContent = label;
		if (hexEl) hexEl.textContent = colorHex.toUpperCase();
		if (swatch) swatch.style.background = colorHex;
		tooltip.classList.add("visible");
		activeMarker = marker;
	}

	function hideTooltip() {
		tooltip.classList.remove("visible");
		activeMarker = null;
		tooltipPinned = false;
	}

	function positionTooltip(marker: THREE.Mesh): void {
		const vec = new THREE.Vector3();
		marker.getWorldPosition(vec);
		vec.project(camera);
		const rect = sceneRoot.getBoundingClientRect();
		const x = (vec.x * 0.5 + 0.5) * rect.width;
		const y = (-vec.y * 0.5 + 0.5) * rect.height;
		tooltip.style.left = `${x + 16}px`;
		tooltip.style.top = `${y - tooltip.offsetHeight / 2}px`;
	}

	let isPointerDown = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartAngle = 0;
	let dragStartElevation = 0;
	let pointerMoved = 0;
	let isDragging = false;

	const activePointers = new Map<number, { x: number; y: number }>();
	let lastPinchDist = 0;
	let isPinching = false;

	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	function tryCapturePointer(e: PointerEvent): void {
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {
			/* unsupported or redundant */
		}
	}

	function tryReleasePointer(e: PointerEvent): void {
		try {
			if (canvas.hasPointerCapture(e.pointerId)) {
				canvas.releasePointerCapture(e.pointerId);
			}
		} catch {
			/* noop */
		}
	}

	function onPointerDown(e: PointerEvent): void {
		if (e.pointerType === "mouse" && e.button !== 0) return;

		tryCapturePointer(e);

		activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (activePointers.size === 2) {
			isPinching = true;
			isPointerDown = false;
			isDragging = false;
			pointerMoved = 0;
			const p = Array.from(activePointers.values());
			lastPinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
			return;
		}

		if (activePointers.size === 1) {
			isPointerDown = true;
			pointerMoved = 0;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragStartAngle = camAngle;
			dragStartElevation = camElevation;
		}
	}

	function onPointerMove(e: PointerEvent): void {
		if (activePointers.has(e.pointerId)) {
			const pt = activePointers.get(e.pointerId);
			if (pt) {
				pt.x = e.clientX;
				pt.y = e.clientY;
			}
		}

		if (activePointers.size === 2) {
			if (e.cancelable && e.pointerType === "touch") e.preventDefault();
			const p = Array.from(activePointers.values());
			const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
			if (lastPinchDist > 0 && dist > 0) {
				targetRadius *= lastPinchDist / dist;
				targetRadius = Math.max(1.8, Math.min(6.5, targetRadius));
			}
			lastPinchDist = dist;
			return;
		}

		if (!isPointerDown) {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
				pointer.x = (x / rect.width) * 2 - 1;
				pointer.y = -(y / rect.height) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);
				const markerHits = raycaster.intersectObjects(markerMeshes);
				const first = markerHits[0]?.object;
				if (first && (first.userData as MarkerUserData).isMarker) {
					const hit = first as THREE.Mesh;
					canvas.style.cursor = "pointer";
					if (activeMarker !== hit && !tooltipPinned) {
						showTooltip(hit, getPixelColorAt(hit));
					}
				} else {
					canvas.style.cursor = "";
					if (!tooltipPinned) hideTooltip();
				}
			} else {
				canvas.style.cursor = "";
				if (!tooltipPinned) hideTooltip();
			}
			return;
		}

		if (!activePointers.has(e.pointerId)) return;

		if (e.cancelable && e.pointerType === "touch") e.preventDefault();

		const dx = e.clientX - dragStartX;
		const dy = e.clientY - dragStartY;
		pointerMoved = Math.abs(dx) + Math.abs(dy);
		if (pointerMoved > 4) {
			isDragging = true;
			camAngle = dragStartAngle + dx * dragSpeed;
			camElevation = Math.max(
				0.05,
				Math.min(1.2, dragStartElevation - dy * dragSpeed),
			);
		}
	}

	function onPointerEnd(e: PointerEvent): void {
		tryReleasePointer(e);

		const hadPinch = isPinching;

		activePointers.delete(e.pointerId);
		if (activePointers.size < 2) {
			isPinching = false;
			lastPinchDist = 0;
		}

		if (isPointerDown && !isDragging && !hadPinch) {
			handleClick(e);
		}

		if (activePointers.size === 0) {
			isPointerDown = false;
			isDragging = false;
		}
	}

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerup", onPointerEnd);
	canvas.addEventListener("pointercancel", onPointerEnd);

	sceneRoot.addEventListener(
		"wheel",
		(e: WheelEvent) => {
			e.preventDefault();
			targetRadius += e.deltaY * 0.004;
			targetRadius = Math.max(1.8, Math.min(6.5, targetRadius));
		},
		{ passive: false },
	);

	function handleClick(e: PointerEvent): void {
		const rect = canvas.getBoundingClientRect();
		pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);
		const markerHits = raycaster.intersectObjects(markerMeshes);
		if (markerHits.length > 0) {
			const hitObj = markerHits[0].object;
			if ((hitObj.userData as MarkerUserData).isMarker) {
				const hit = hitObj as THREE.Mesh;
				tooltipPinned = true;
				showTooltip(hit, getPixelColorAt(hit));
				return;
			}
		}
		hideTooltip();
	}

	function getPixelColorAt(hit: THREE.Mesh): string {
		markerGroup.visible = false;
		renderer.render(scene, camera);
		markerGroup.visible = true;
		const pos = new THREE.Vector3();
		const ud = hit.userData as MarkerUserData;
		const md = markerData.find((d) => d.id === ud.markerId);
		if (md) {
			const br = 0.85;
			pos.set(
				br * Math.sin(md.angleTop) * Math.sin(md.angleSide),
				br * Math.cos(md.angleTop) + 0.85,
				br * Math.sin(md.angleTop) * Math.cos(md.angleSide),
			);
		} else {
			hit.getWorldPosition(pos);
		}
		pos.project(camera);
		const w = renderer.domElement.width;
		const h = renderer.domElement.height;
		const px = Math.floor((pos.x * 0.5 + 0.5) * w);
		const py = Math.floor((-pos.y * 0.5 + 0.5) * h);
		const pixel = new Uint8Array(4);
		const gl = renderer.getContext();
		gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		return (
			"#" +
			[pixel[0], pixel[1], pixel[2]]
				.map((v) => v.toString(16).padStart(2, "0"))
				.join("")
		);
	}

	function syncColors(): void {
		ballMat.color.set(inputs.ball.value);
		dirLight.color.set(inputs.light.value);
		hemi.color.set(inputs.sky.value);
		hemi.groundColor.set(inputs.platform.value);
		platformMat.color.set(inputs.platform.value);
		rimLight.color.set(inputs.rim.value);
		Object.values(inputs).forEach((el) => {
			el.style.background = el.value;
		});
		updateEnv();
	}

	Object.values(inputs).forEach((el) => {
		el.addEventListener("input", syncColors);
	});

	const presets = {
		sunset: {
			ball: "#f0e0c8",
			light: "#ff8844",
			sky: "#553388",
			platform: "#cc5555",
			rim: "#ffbb99",
		},
		studio: {
			ball: "#f0f0f0",
			light: "#ffffff",
			sky: "#8899cc",
			platform: "#666666",
			rim: "#ddeeff",
		},
		forest: {
			ball: "#e8f0e8",
			light: "#eeffcc",
			sky: "#559966",
			platform: "#2d7a2d",
			rim: "#ccffbb",
		},
		ocean: {
			ball: "#e0ecf5",
			light: "#cce0ff",
			sky: "#3377aa",
			platform: "#004488",
			rim: "#88ccff",
		},
	} as const;

	document.querySelectorAll(".preset-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const key = btn.getAttribute("data-preset");
			if (!key || !(key in presets)) return;
			const p = presets[key as keyof typeof presets];
			inputs.ball.value = p.ball;
			inputs.light.value = p.light;
			inputs.sky.value = p.sky;
			inputs.platform.value = p.platform;
			inputs.rim.value = p.rim;
			syncColors();
		});
	});

	updateEnv();

	let markerTime = 0;

	function animate() {
		requestAnimationFrame(animate);

		currentRadius += (targetRadius - currentRadius) * 0.08;

		camera.position.x =
			currentRadius * Math.cos(camElevation) * Math.sin(camAngle);
		camera.position.z =
			currentRadius * Math.cos(camElevation) * Math.cos(camAngle);
		camera.position.y = camLookY + currentRadius * Math.sin(camElevation);
		camera.lookAt(0, camLookY, 0);

		markerTime += 0.03;
		markerMeshes.forEach((m, i) => {
			const ud = m.userData as MarkerUserData;
			const ring = ud.ring;
			if (ring) {
				ring.lookAt(camera.position);
				(ring.material as THREE.MeshBasicMaterial).opacity =
					0.25 + Math.sin(markerTime + i * 2) * 0.2;
			}
			const glow = ud.glow;
			if (glow) {
				(glow.material as THREE.MeshBasicMaterial).opacity =
					0.08 + Math.sin(markerTime + i * 2 + 1) * 0.07;
			}
			const isActive = activeMarker === m;
			(m.material as THREE.MeshBasicMaterial).color.set(
				isActive ? 0xffffff : 0x88bbff,
			);
			m.scale.setScalar(isActive ? 1.2 : 1);
		});

		if (activeMarker) positionTooltip(activeMarker);

		renderer.render(scene, camera);
	}
	animate();

	function resize() {
		const w = sceneRoot.clientWidth;
		const h = sceneRoot.clientHeight;
		if (w === 0 || h === 0) return;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	}
	window.addEventListener("resize", resize);
	window.visualViewport?.addEventListener("resize", resize);
	window.visualViewport?.addEventListener("scroll", resize);
	window.addEventListener("orientationchange", resize);
	new ResizeObserver(resize).observe(bounceMount);

	queueMicrotask(resize);
	requestAnimationFrame(() => requestAnimationFrame(resize));
})();
