import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { avgColor, normalizeHex } from "../utils/color";
import css from "./color-mixer.css?inline";

interface MixerSlot {
	hex: string;
	d: number;
}

interface MixerState {
	primaryColors: string[];
	secondaryColors: string[];
	extraStrip: string[];
	showSecondaries: boolean;
	slotA: MixerSlot | null;
	slotB: MixerSlot | null;
	palette: MixerSlot[];
}

class ColorMixer extends HTMLElement {
	state: MixerState;

	private _drags: Draggable[] = [];

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.state = {
			primaryColors: ["#EF2B2B", "#FCE300", "#0051A5"],
			secondaryColors: ["#FF7F27", "#00A651", "#92278F"],
			extraStrip: [],
			showSecondaries: false,
			slotA: null,
			slotB: null,
			palette: [],
		};
	}

	connectedCallback() {
		if (typeof gsap !== "undefined" && typeof Draggable !== "undefined") {
			gsap.registerPlugin(Draggable);
		}
		this.render();
		this._bindUi();
	}

	disconnectedCallback() {
		this._killDrags();
	}

	_killDrags() {
		this._drags.forEach((d) => {
			d.kill();
		});
		this._drags = [];
	}

	_chipHtml(
		hex: string,
		d: number,
		className: string,
		extraAttrs = "",
	): string {
		const c = this._contrast(hex);
		return `<button type="button" class="${className}" data-hex="${hex}" data-d="${d}" style="--chip:${hex};color:${c}" ${extraAttrs}>${hex}</button>`;
	}

	_blendDepth(dA: number, dB: number): number {
		return Math.max(dA | 0, dB | 0) + 1;
	}

	_preview(): {
		hex: string | null;
		depth: number;
		mode: "mix" | "single" | "empty";
	} {
		const { slotA, slotB } = this.state;
		if (slotA && slotB) {
			const hex = avgColor(slotA.hex, slotB.hex);
			const depth = this._blendDepth(slotA.d, slotB.d);
			return { hex, depth, mode: "mix" };
		}
		if (slotA) return { hex: slotA.hex, depth: slotA.d, mode: "single" };
		if (slotB) return { hex: slotB.hex, depth: slotB.d, mode: "single" };
		return { hex: null, depth: 0, mode: "empty" };
	}

	_tierUI(
		depth: number,
		mode: "mix" | "single" | "empty",
	): { label: string; kind: string } {
		if (mode === "empty") return { label: "", kind: "none" };
		if (mode === "single") {
			if (depth <= 0) return { label: "Primary", kind: "primary" };
			if (depth === 1) return { label: "Secondary", kind: "secondary" };
			if (depth === 2) return { label: "Tertiary", kind: "tertiary" };
			return { label: "Quaternary", kind: "quaternary" };
		}
		if (depth === 1) return { label: "Secondary", kind: "secondary" };
		if (depth === 2) return { label: "Tertiary", kind: "tertiary" };
		return { label: "Quaternary", kind: "quaternary" };
	}

	_contrast(hex: string): string {
		try {
			const n = normalizeHex(hex);
			const r = parseInt(n.slice(1, 3), 16);
			const g = parseInt(n.slice(3, 5), 16);
			const b = parseInt(n.slice(5, 7), 16);
			return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#1a1a2e" : "#f0f0f5";
		} catch {
			return "#f0f0f5";
		}
	}

	render(): void {
		const root = this.shadowRoot;
		if (!root) return;

		const {
			slotA,
			slotB,
			primaryColors,
			secondaryColors,
			extraStrip,
			showSecondaries,
			palette,
		} = this.state;
		const prev = this._preview();
		const tier = this._tierUI(prev.depth, prev.mode);

		const primaryHtml = primaryColors
			.map((h) => this._chipHtml(h, 0, "strip-chip"))
			.join("");
		const secondaryHtml = secondaryColors
			.map((h) => this._chipHtml(h, 0, "strip-chip"))
			.join("");
		const extraHtml = extraStrip
			.map((h) => this._chipHtml(h, 0, "strip-chip"))
			.join("");

		const paletteGroupHtml =
			palette.length === 0
				? ""
				: `<div class="row-group row-palette">
  <span class="row-legend">Your palette</span>
  <div class="row-chips">
    ${palette
			.map(
				(p, i) =>
					`<div class="pal-item">
  <button type="button" class="pal-x" data-i="${i}" aria-label="Remove ${p.hex}">×</button>
  ${this._chipHtml(p.hex, p.d, "pal-chip", `title="${p.hex} - drag into A or B"`)}
</div>`,
			)
			.join("")}
  </div>
</div>`;

		const extraGroupHtml =
			extraStrip.length === 0
				? ""
				: `<div class="row-group">
  <span class="row-legend">Custom</span>
  <div class="row-chips">${extraHtml}</div>
</div>`;

		const secondarySection = showSecondaries
			? `<div class="row-group"><span class="row-legend">Secondary</span><div class="row-chips row-sec-chips">${secondaryHtml}</div></div>`
			: "";

		const labelHtml =
			tier.label && tier.kind !== "none"
				? `<div class="tier-badge tier-l tier-${tier.kind}">${tier.label}</div>`
				: "";

		const canSave = Boolean(slotA && slotB && prev.mode === "mix");
		const bg = prev.hex || "#1a1a30";

		root.innerHTML = `
<style>${css}</style>
<div class="wrap">
  <p class="hint">Drag two colors into A and B, preview the blend, then save to your palette.</p>
  <div class="swatch-row" id="mxStrip">
    <div class="row-group">
      <span class="row-legend">Primary</span>
      <div class="row-chips">${primaryHtml}</div>
    </div>
    ${secondarySection}
    ${extraGroupHtml}
    ${paletteGroupHtml}
  </div>
  <div class="station">
    <div class="slot${slotA ? " has" : ""}" id="slotA" data-slot="a" aria-label="Slot A">${this._slotInner(slotA, "A")}</div>
    <span class="st-op">+</span>
    <div class="slot${slotB ? " has" : ""}" id="slotB" data-slot="b" aria-label="Slot B">${this._slotInner(slotB, "B")}</div>
    <span class="st-op">=</span>
    <div class="swatch" id="mxSwatch" style="background:${bg}"></div>
  </div>
  <div class="result-wrap">
    ${labelHtml}
    <div class="hex-out" id="mxHex">${prev.hex || "-"}</div>
  </div>
  <div class="save-wrap">
    <button type="button" class="save" id="mxSave" ${canSave ? "" : "disabled"}>Save mix to palette</button>
  </div>
</div>`;

		this._initDraggables();
	}

	_slotInner(slot: MixerSlot | null, key: string): string {
		if (!slot) {
			return `<span class="slot-placeholder">Drop</span><span class="slot-hint">${key}</span>`;
		}
		return `<span class="slot-fill" style="background:${slot.hex}"></span><span class="slot-hex">${slot.hex}</span><button type="button" class="slot-rm" aria-label="Clear slot ${key}">×</button>`;
	}

	_assignSlot(key: "a" | "b", payload: MixerSlot): void {
		if (key === "a") this.state.slotA = payload;
		else this.state.slotB = payload;
		this.render();
	}

	_clearSlot(key: "a" | "b"): void {
		if (key === "a") this.state.slotA = null;
		else this.state.slotB = null;
		this.render();
	}

	_closestSlot(
		el: HTMLElement,
		slotA: HTMLElement,
		slotB: HTMLElement,
	): "a" | "b" | null {
		const aHit = Draggable.hitTest(el, slotA, "50%");
		const bHit = Draggable.hitTest(el, slotB, "50%");
		if (aHit && !bHit) return "a";
		if (bHit && !aHit) return "b";
		if (aHit && bHit) {
			const er = el.getBoundingClientRect();
			const cx = er.left + er.width / 2;
			const cy = er.top + er.height / 2;
			const ar = slotA.getBoundingClientRect();
			const br = slotB.getBoundingClientRect();
			const dist = (r: DOMRect) => {
				const mx = r.left + r.width / 2;
				const my = r.top + r.height / 2;
				return (cx - mx) ** 2 + (cy - my) ** 2;
			};
			return dist(ar) <= dist(br) ? "a" : "b";
		}
		return null;
	}

	_initDraggables(): void {
		this._killDrags();
		if (typeof gsap === "undefined" || typeof Draggable === "undefined") return;

		const sr = this.shadowRoot;
		if (!sr) return;

		const slotA = sr.getElementById("slotA");
		const slotB = sr.getElementById("slotB");
		const swatch = sr.getElementById("mxSwatch");
		if (!slotA || !slotB) return;

		const mixer = this;

		requestAnimationFrame(() => {
			const draggables = sr.querySelectorAll(".strip-chip, .pal-chip");

			draggables.forEach((chipEl) => {
				const el = chipEl as HTMLElement;
				const dragVars = {
					type: "x,y" as const,
					allowNativeTouchScrolling: true,
					onDragStart() {
						gsap.to(el, {
							scale: 1.12,
							duration: 0.15,
							ease: "power2.out",
							overwrite: "auto",
						});
					},
					onDragEnd() {
						const hit = mixer._closestSlot(el, slotA, slotB);
						const hex = el.getAttribute("data-hex");
						const d = parseInt(el.getAttribute("data-d") || "0", 10);
						if (hit) {
							mixer._assignSlot(hit, {
								hex: normalizeHex(hex ?? "#000000"),
								d,
							});
							if (swatch) {
								gsap.fromTo(
									swatch,
									{ scale: 1 },
									{
										scale: 1.06,
										duration: 0.18,
										yoyo: true,
										repeat: 1,
										ease: "power2.inOut",
									},
								);
							}
						} else {
							gsap.to(el, {
								x: 0,
								y: 0,
								scale: 1,
								duration: 0.25,
								ease: "power3.out",
								overwrite: "auto",
							});
						}
					},
				};
				const drag = Draggable.create(el, dragVars)[0];
				this._drags.push(drag);
			});
		});
	}

	_bindUi(): void {
		const root = this.shadowRoot;
		if (!root) return;
		root.addEventListener("click", (e: Event) => {
			const sr = root;
			const target = e.target as HTMLElement | null;
			if (!target) return;
			if (target.closest("#mxAdd")) {
				const pick = sr.getElementById("mxPick") as HTMLInputElement | null;
				const hex = normalizeHex(pick?.value || "#888888");
				this.state.extraStrip.push(hex);
				this.render();
				return;
			}
			if (target.closest("#mxSecToggle")) {
				this.state.showSecondaries = !this.state.showSecondaries;
				this.render();
				return;
			}
			if (target.closest("#mxSave")) {
				const prev = this._preview();
				if (prev.mode !== "mix" || !prev.hex) return;
				this.state.palette.push({ hex: prev.hex, d: prev.depth });
				this.render();
				return;
			}
			const rm = target.closest(".slot-rm");
			if (rm) {
				const slot = rm.closest(".slot");
				const k = slot?.getAttribute("data-slot");
				if (k === "a" || k === "b") this._clearSlot(k);
				return;
			}
			const palX = target.closest(".pal-x");
			if (palX) {
				e.preventDefault();
				e.stopPropagation();
				const i = parseInt(palX.getAttribute("data-i") ?? "", 10);
				if (!Number.isNaN(i)) {
					this.state.palette.splice(i, 1);
					this.render();
				}
			}
		});
	}
}

customElements.define("color-mixer", ColorMixer);
