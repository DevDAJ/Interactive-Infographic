import gsap from "gsap";
import {
	hexHue,
	hexToRgb,
	hslToRgb,
	normalizeHex,
	rgbToHex,
	rgbToHsl,
} from "../utils/color";
import css from "./harmony-wheel.css?inline";

type SegPulseGroup = SVGGElement & { _pulseT?: ReturnType<typeof setTimeout> };

type HarmonyKind = "complementary" | "analogous" | "triadic";

/**
 * Interactive harmony explorer: Complementary / Analogous / Triadic.
 * Selection: stroke ring + HSL-richer/darker fills; harmony slices stack on top.
 * GSAP smoothly lerps fill colors when the harmony selection changes (no slice rotation).
 */
class HarmonyWheel extends HTMLElement {
	private _harmony: HarmonyKind = "complementary";
	/** Base segment index 0–11 */
	private _segmentIndex = 0;

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}

	static get COLORS() {
		return [
			"#EF2B2B",
			"#FF4500",
			"#FF7F27",
			"#FFD700",
			"#FCE300",
			"#ADFF2F",
			"#00A651",
			"#00CED1",
			"#0051A5",
			"#0000FF",
			"#8A2BE2",
			"#92278F",
		];
	}

	/** Bump saturation & reduce lightness for selected slices (multipliers on 0–1 HSL channels after RGB→HSL). */
	static get _SEL_SAT_MUL() {
		return 1.28;
	}
	static get _SEL_LIGHT_MUL() {
		return 0.78;
	}

	/** Richer, darker variant for selection state. */
	static _selectedFillHex(baseHex: string): string {
		const { r, g, b } = hexToRgb(baseHex);
		let { h, s, l } = rgbToHsl(r, g, b);
		s = Math.min(100, s * HarmonyWheel._SEL_SAT_MUL);
		l = Math.max(0, l * HarmonyWheel._SEL_LIGHT_MUL);
		return rgbToHex(hslToRgb(h, s, l));
	}

	/** Darker, desaturated variant for selection ring stroke (contrasts against bright segments). */
	static _ringColor(hex: string): string {
		const { r, g, b } = hexToRgb(hex);
		let { h, s, l } = rgbToHsl(r, g, b);
		s = Math.min(100, s * 0.35);
		l = Math.max(0, l * 0.42);
		return rgbToHex(hslToRgb(h, s, l));
	}

	/**
	 * @param {number} baseIdx
	 * @param {'complementary' | 'analogous' | 'triadic'} harmony
	 * @returns {number[]}
	 */
	static _harmonyIndices(baseIdx: number, harmony: HarmonyKind): number[] {
		const n = HarmonyWheel.COLORS.length;
		const b = ((baseIdx % n) + n) % n;
		if (harmony === "complementary") return [b, (b + n / 2) % n];
		if (harmony === "analogous") return [(b - 1 + n) % n, b, (b + 1) % n];
		const step = n / 3;
		return [b, (b + step) % n, (b + 2 * step) % n];
	}

	static _harmonyMeta(): Record<HarmonyKind, { title: string; body: string }> {
		return {
			complementary: {
				title: "Complementary",
				body: "Two colors opposite each other on the wheel. They create strong contrast and visual energy - ideal for accents, calls to action, and dynamic layouts. Classic pairs include red ↔ green, blue ↔ orange, and yellow ↔ purple.",
			},
			analogous: {
				title: "Analogous",
				body: "Three hues that sit side by side on the wheel. The effect is calm and cohesive - common in nature (sunsets, forests) and great for branding that needs harmony without high tension.",
			},
			triadic: {
				title: "Triadic",
				body: "Three colors evenly spaced around the wheel (every 120°). You get plenty of vibrancy while staying balanced - one color often leads, with the other two as support.",
			},
		};
	}

	static _segmentPath(
		cx: number,
		cy: number,
		rOuter: number,
		rInner: number,
		a1: number,
		a2: number,
	): string {
		const span = a2 - a1;
		const large = span > Math.PI ? 1 : 0;
		const x1 = cx + rOuter * Math.cos(a1);
		const y1 = cy + rOuter * Math.sin(a1);
		const x2 = cx + rOuter * Math.cos(a2);
		const y2 = cy + rOuter * Math.sin(a2);
		const xi1 = cx + rInner * Math.cos(a1);
		const yi1 = cy + rInner * Math.sin(a1);
		const xi2 = cx + rInner * Math.cos(a2);
		const yi2 = cy + rInner * Math.sin(a2);
		return `M${xi1},${yi1} L${x1},${y1} A${rOuter},${rOuter} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${rInner},${rInner} 0 ${large},0 ${xi1},${yi1}`;
	}

	connectedCallback() {
		this._segmentIndex = parseInt(
			this.getAttribute("start-segment") || "0",
			10,
		);
		if (!Number.isFinite(this._segmentIndex)) this._segmentIndex = 0;
		this._segmentIndex = Math.max(0, Math.min(11, this._segmentIndex));

		const h = this.getAttribute("harmony");
		if (h === "analogous" || h === "triadic" || h === "complementary")
			this._harmony = h;

		this.render();
		this._bind();
		this._syncDesc();
		this._refreshSegmentVisuals(false);
	}

	disconnectedCallback() {
		if (typeof gsap === "undefined") return;
		this.shadowRoot?.querySelectorAll(".seg-fill").forEach((path) => {
			gsap.killTweensOf(path);
		});
	}

	_reduceMotion() {
		return (
			typeof window !== "undefined" &&
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		);
	}

	_geom() {
		const sz = parseInt(this.getAttribute("size") || "320", 10) || 320;
		const cx = sz / 2;
		const cy = sz / 2;
		const r = sz * 0.43;
		const iR = sz * 0.28;
		const n = HarmonyWheel.COLORS.length;
		const seg = (2 * Math.PI) / n;
		return { sz, cx, cy, r, iR, n, seg };
	}

	/**
	 * Smooth fill color on the wedge (not the stroke). Fixes paint-order so stroke is an outline only.
	 * @param {SVGPathElement} path
	 * @param {string} toHex
	 * @param {{ instant?: boolean }} [opts]
	 */
	_tweenPathFill(
		path: SVGPathElement,
		toHex: string,
		opts: { instant?: boolean } = {},
	): void {
		const instant =
			opts.instant === true ||
			typeof gsap === "undefined" ||
			this._reduceMotion();
		const rawFrom =
			path.getAttribute("fill") ||
			path.getAttribute("data-base-fill") ||
			"#000000";
		const fromHex = normalizeHex(rawFrom);
		const targetHex = normalizeHex(toHex);

		if (fromHex === targetHex) return;

		if (instant) {
			if (typeof gsap !== "undefined") gsap.killTweensOf(path);
			path.setAttribute("fill", targetHex);
			return;
		}

		gsap.killTweensOf(path);

		path.setAttribute("fill", fromHex);
		gsap.fromTo(
			path,
			{ attr: { fill: fromHex } },
			{
				attr: { fill: targetHex },
				duration: 0.48,
				ease: "power2.inOut",
			},
		);
	}

	_bind() {
		const root = this.shadowRoot;
		if (!root) return;

		root.querySelectorAll("[data-harmony-btn]").forEach((btn) => {
			btn.addEventListener("click", () => {
				const id = btn.getAttribute("data-harmony-btn");
				if (id === "complementary" || id === "analogous" || id === "triadic") {
					this._harmony = id;
					root.querySelectorAll("[data-harmony-btn]").forEach((b) => {
						b.setAttribute(
							"aria-pressed",
							b.getAttribute("data-harmony-btn") === id ? "true" : "false",
						);
					});
					this._syncDesc();
					this._refreshSegmentVisuals();
				}
			});
		});

		root.querySelectorAll(".seg-group").forEach((g) => {
			g.addEventListener("click", (e) => {
				e.preventDefault();
				const i = parseInt(g.getAttribute("data-seg") || "0", 10);
				if (!Number.isFinite(i)) return;
				this._goToSegment(i);
			});
		});

		root.addEventListener("keydown", (e: Event) => {
			const ke = e as KeyboardEvent;
			const t = ke.target as HTMLElement | null;
			const g = t?.closest(".seg-group");
			if (!g || !root.contains(g)) return;
			if (ke.key === "Enter" || ke.key === " ") {
				ke.preventDefault();
				const i = parseInt(g.getAttribute("data-seg") || "0", 10);
				if (!Number.isFinite(i)) return;
				this._goToSegment(i);
			}
		});
	}

	_goToSegment(i: number): void {
		const next = Math.max(0, Math.min(11, i));
		if (next === this._segmentIndex) {
			this._nudgePulse();
			return;
		}
		this._segmentIndex = next;
		this._refreshSegmentVisuals();
		this._syncDesc();
	}

	_nudgePulse() {
		const root = this.shadowRoot;
		if (!root) return;
		const hi = HarmonyWheel._harmonyIndices(this._segmentIndex, this._harmony);
		hi.forEach((i) => {
			const g = root.querySelector(
				`.seg-group[data-seg="${i}"]`,
			) as SegPulseGroup | null;
			if (!g) return;
			g.classList.remove("pulse");
			void (g as unknown as HTMLElement).offsetWidth;
			g.classList.add("pulse");
			window.clearTimeout(g._pulseT);
			g._pulseT = window.setTimeout(() => g.classList.remove("pulse"), 380);
		});
	}

	_refreshSegmentVisuals(_instant = false): void {
		const root = this.shadowRoot;
		if (!root) return;
		const hi = new Set(
			HarmonyWheel._harmonyIndices(this._segmentIndex, this._harmony),
		);
		const layer = root.querySelector(".wheel-layer");

		root.querySelectorAll(".seg-group").forEach((g) => {
			if (typeof gsap !== "undefined")
				gsap.set(g as gsap.DOMTarget, { clearProps: "transform" });
		});

		root.querySelectorAll(".seg-group").forEach((node) => {
			const g = node as HTMLElement;
			const i = parseInt(g.getAttribute("data-seg") || "0", 10);
			const on = hi.has(i);

			g.classList.toggle("is-active", on);
			if (on) g.style.zIndex = "100";
			else g.style.zIndex = "";
		});

		if (layer) this._stackHarmonyOnTop(layer as SVGElement, hi);
		this._updateRing(_instant);
		this._updateArrows();
	}

	_updateRing(_instant = false): void {
		const root = this.shadowRoot;
		if (!root) return;
		const container = root.querySelector(".sel-ring-wrap");
		if (!container) return;
		const hi = HarmonyWheel._harmonyIndices(this._segmentIndex, this._harmony);
		const sz = parseInt(this.getAttribute("size") || "320", 10) || 320;
		const cx = sz / 2;
		const cy = sz / 2;
		const r = sz * 0.43;
		const iR = sz * 0.28;
		const ringR = r + sz * 0.012;
		const ringIR = iR - sz * 0.012;
		const colors = HarmonyWheel.COLORS;
		const n = colors.length;
		const seg = (2 * Math.PI) / n;
		const ringD = HarmonyWheel._segmentPath(
			cx,
			cy,
			ringR,
			ringIR,
			-Math.PI / 2,
			-Math.PI / 2 + seg,
		);
		const sortedHi = [...hi].sort((a, b) => a - b);
		const ringTag = () => {
			const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
			g.classList.add("sel-ring-item");
			const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
			p.classList.add("sel-ring");
			p.setAttribute("d", ringD);
			g.appendChild(p);
			g.style.transformOrigin = `${cx}px ${cy}px`;
			return g;
		};

		const existing = [
			...container.querySelectorAll(".sel-ring-item"),
		] as SVGGElement[];

		while (existing.length < sortedHi.length) {
			const g = ringTag();
			g.style.opacity = "0";
			g.style.transform = `rotate(0deg)`;
			container.appendChild(g);
			existing.push(g);
		}
		while (existing.length > sortedHi.length) {
			const el = existing.pop();
			if (!el) break;
			el.style.opacity = "0";
			setTimeout(() => {
				if (el.parentNode) el.remove();
			}, 500);
		}

		sortedHi.forEach((segIdx, idx) => {
			const el = existing[idx];
			if (!el) return;
			const angle = (segIdx * seg * 180) / Math.PI;
			const baseColor = colors[segIdx];
			const ringColor = HarmonyWheel._ringColor(baseColor);
			const path = el.querySelector(".sel-ring");
			if (path) {
				const ringPath = path as SVGElement;
				ringPath.style.stroke = ringColor;
				ringPath.style.setProperty("--ring-color", ringColor);
			}
			el.style.transformOrigin = `${cx}px ${cy}px`;
			el.style.transform = `rotate(${angle}deg)`;
			el.style.opacity = "1";
		});
	}

	_updateArrows() {
		const root = this.shadowRoot;
		if (!root) return;
		const container = root.querySelector(".selection-arrows");
		if (!container) return;
		const hi = HarmonyWheel._harmonyIndices(this._segmentIndex, this._harmony);
		const sz = parseInt(this.getAttribute("size") || "320", 10) || 320;
		const cx = sz / 2;
		const cy = sz / 2;
		const iR = sz * 0.28;
		const colors = HarmonyWheel.COLORS;
		const n = colors.length;
		const seg = (2 * Math.PI) / n;
		const arrowLen = iR - sz * 0.03;
		const headLen = sz * 0.035;
		const headW = sz * 0.028;
		const arrowTipY = cy - arrowLen;
		const headBaseY = arrowTipY + headLen;
		const headPoints = `${cx},${arrowTipY} ${cx - headW / 2},${headBaseY} ${cx + headW / 2},${headBaseY}`;
		const sw = Math.max(2, sz / 100);
		const sortedHi = [...hi].sort((a, b) => a - b);
		const arrowTag = (_parent?: SVGElement | null) => {
			const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
			g.classList.add("arrow-item");
			const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
			l.classList.add("arrow-line");
			l.setAttribute("x1", String(cx));
			l.setAttribute("y1", String(cy));
			l.setAttribute("x2", String(cx));
			l.setAttribute("y2", String(headBaseY));
			l.setAttribute("stroke-width", String(sw));
			l.setAttribute("stroke-linecap", "round");
			const hd = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"polygon",
			);
			hd.classList.add("arrow-head");
			hd.setAttribute("points", headPoints);
			g.appendChild(l);
			g.appendChild(hd);
			g.style.transformOrigin = `${cx}px ${cy}px`;
			if (_parent) _parent.appendChild(g);
			return g;
		};

		const existing = [
			...container.querySelectorAll(".arrow-item"),
		] as SVGGElement[];

		while (existing.length < sortedHi.length) {
			const g = arrowTag();
			g.style.opacity = "0";
			g.style.transform = `rotate(0deg)`;
			container.appendChild(g);
			existing.push(g);
		}
		while (existing.length > sortedHi.length) {
			const el = existing.pop();
			if (!el) break;
			el.style.opacity = "0";
			setTimeout(() => {
				if (el.parentNode) el.remove();
			}, 400);
		}

		sortedHi.forEach((segIdx, idx) => {
			const el = existing[idx];
			if (!el) return;
			const angleDeg = ((segIdx * seg + seg / 2) * 180) / Math.PI;
			const color = colors[segIdx];
			const line = el.querySelector(".arrow-line");
			const head = el.querySelector(".arrow-head");
			if (line) (line as SVGElement).style.stroke = color;
			if (head) (head as SVGElement).style.fill = color;
			el.style.transformOrigin = `${cx}px ${cy}px`;
			el.style.transform = `rotate(${angleDeg}deg)`;
			el.style.opacity = "1";
		});
	}

	/**
	 * Paint selected harmony slices above the rest (SVG stacking + DOM order).
	 * @param {SVGElement} layer
	 * @param {Set<number>} hi
	 */
	_stackHarmonyOnTop(layer: SVGElement, hi: Set<number>): void {
		const nodes = [...layer.querySelectorAll(".seg-group")];
		nodes.sort((a, b) => {
			const ia = parseInt(a.getAttribute("data-seg") || "0", 10);
			const ib = parseInt(b.getAttribute("data-seg") || "0", 10);
			const aOn = hi.has(ia);
			const bOn = hi.has(ib);
			if (aOn !== bOn) return aOn ? 1 : -1;
			return ia - ib;
		});
		nodes.forEach((n) => {
			layer.appendChild(n as SVGElement);
		});
	}

	_syncDesc() {
		const root = this.shadowRoot;
		const meta = HarmonyWheel._harmonyMeta()[this._harmony];
		const title = root?.querySelector("[data-desc-title]");
		const body = root?.querySelector("[data-desc-body]");
		const chip = root?.querySelector("[data-base-chip]");
		const panel = root?.querySelector(".panel");
		const colors = HarmonyWheel.COLORS;

		const panelEl = panel as HTMLElement | null;
		const chipEl = chip as HTMLElement | null;

		if (panelEl && !this._reduceMotion()) {
			panelEl.style.height = `${panelEl.offsetHeight}px`;
		}

		if (title) title.textContent = meta.title;
		if (body) body.textContent = meta.body;
		if (chipEl) {
			const indices = HarmonyWheel._harmonyIndices(
				this._segmentIndex,
				this._harmony,
			);
			const sorted = [...indices];
			const baseIdx = sorted.indexOf(this._segmentIndex);
			if (baseIdx > 0) {
				sorted.splice(baseIdx, 1);
				sorted.unshift(this._segmentIndex);
			}
			const chipsHtml = sorted
				.map((i) => {
					const isBase = i === this._segmentIndex;
					return `<span class="harmony-chip" style="--chip-color:${colors[i]}"><span class="chip-dot"></span>${isBase ? `Base ${colors[i]}` : colors[i]}</span>`;
				})
				.join("");
			chipEl.innerHTML = chipsHtml;
		}

		if (panelEl && !this._reduceMotion()) {
			requestAnimationFrame(() => {
				panelEl.style.height = `${panelEl.scrollHeight}px`;
			});
		} else if (panelEl) {
			panelEl.style.removeProperty("height");
		}
	}

	render(): void {
		const sr = this.shadowRoot;
		if (!sr) return;

		const sz = parseInt(this.getAttribute("size") || "320", 10) || 320;
		const cx = sz / 2;
		const cy = sz / 2;
		const r = sz * 0.43;
		const iR = sz * 0.28;
		const strokeW = Math.max(3, sz / 70);
		const colors = HarmonyWheel.COLORS;
		const seg = (2 * Math.PI) / colors.length;

		let groups = "";
		colors.forEach((c, i) => {
			const a1 = i * seg - Math.PI / 2;
			const a2 = (i + 1) * seg - Math.PI / 2;
			const hue = hexHue(c);
			const d = HarmonyWheel._segmentPath(cx, cy, r, iR, a1, a2);
			groups += `<g class="seg-group" data-seg="${i}" data-hue="${hue}" role="button" tabindex="0" aria-label="Hue slice ${i + 1} · ${c}">
  <path class="seg-fill" data-base-fill="${c}" d="${d}" fill="${c}" stroke="none" stroke-linejoin="round" paint-order="stroke fill"/>
</g>`;
		});

		const meta = HarmonyWheel._harmonyMeta();
		const buttons = (["complementary", "analogous", "triadic"] as HarmonyKind[])
			.map((key) => {
				const m = meta[key];
				const pressed = key === this._harmony ? "true" : "false";
				return `<button type="button" class="h-btn" data-harmony-btn="${key}" aria-pressed="${pressed}">${m.title}</button>`;
			})
			.join("");

		this.style.setProperty("--hw-stroke", `${strokeW}px`);
		this.style.setProperty("--hw-controls-width", `${sz + 120}px`);
		sr.innerHTML = `<style>${css}</style>
<div class="wrap">
  <div class="toolbar">${buttons}</div>
  <div class="panel">
    <h3 data-desc-title>${meta[this._harmony].title}</h3>
    <p data-desc-body>${meta[this._harmony].body}</p>
    <span class="base-chip" data-base-chip role="status"></span>
  </div>
  <svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-label="Harmony color wheel - click a slice to set base and selection">
    <g class="wheel-layer">${groups}</g>
    <g class="sel-ring-wrap"></g>
    <g class="selection-arrows"></g>
  </svg>
  <p class="hint">Click a section of the color wheel to change the base color.</p>
</div>`;
	}
}

customElements.define("harmony-wheel", HarmonyWheel);
