import { hexHue, hsvToRgb, luminance, rgbCss } from "../utils/color";
import css from "./color-wheel.css?inline";

class ColorWheel extends HTMLElement {
	/** HSV: h ∈ [0,360], s,v ∈ [0,100] */
	private _hsv = { h: 210, s: 72, v: 88 };

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}

	static get observedAttributes() {
		return ["size"];
	}

	connectedCallback() {
		if (!this.hasAttribute("size")) this.setAttribute("size", "300");
		this.render();
		this._bind();
		this._syncFromSliders();
		this._updateVisuals();
	}

	attributeChangedCallback(
		name: string,
		prev: string | null,
		next: string | null,
	) {
		if (
			name === "size" &&
			prev !== next &&
			this.shadowRoot?.querySelector("svg")
		) {
			this.render();
			this._bind();
			this._syncFromSliders();
			this._updateVisuals();
		}
	}

	_bind(): void {
		const root = this.shadowRoot;
		if (!root) return;
		const hEl = root.querySelector(
			'[data-slider="h"]',
		) as HTMLInputElement | null;
		const sEl = root.querySelector(
			'[data-slider="s"]',
		) as HTMLInputElement | null;
		const vEl = root.querySelector(
			'[data-slider="v"]',
		) as HTMLInputElement | null;
		const onChange = () => {
			this._hsv.h = Number(hEl?.value ?? this._hsv.h);
			this._hsv.s = Number(sEl?.value ?? this._hsv.s);
			this._hsv.v = Number(vEl?.value ?? this._hsv.v);
			this._updateVisuals();
		};
		[hEl, sEl, vEl].forEach((el) => {
			el?.addEventListener("input", onChange);
		});

		root.querySelectorAll("path[data-hue]").forEach((path) => {
			path.addEventListener("click", () => {
				const hue = Number(path.getAttribute("data-hue"));
				if (!Number.isFinite(hue)) return;
				this._hsv.h = hue;
				if (hEl) hEl.value = String(Math.round(hue));
				this._updateVisuals();
			});
		});
	}

	_syncFromSliders(): void {
		const root = this.shadowRoot;
		const hEl = root?.querySelector(
			'[data-slider="h"]',
		) as HTMLInputElement | null;
		const sEl = root?.querySelector(
			'[data-slider="s"]',
		) as HTMLInputElement | null;
		const vEl = root?.querySelector(
			'[data-slider="v"]',
		) as HTMLInputElement | null;
		if (hEl) hEl.value = String(Math.round(this._hsv.h));
		if (sEl) sEl.value = String(Math.round(this._hsv.s));
		if (vEl) vEl.value = String(Math.round(this._hsv.v));
	}

	_fillCss() {
		return rgbCss(hsvToRgb(this._hsv.h, this._hsv.s, this._hsv.v));
	}

	_labelText() {
		const { h, s, v } = this._hsv;
		const rgb = hsvToRgb(h, s, v);
		return `hsv(${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(v)}%) · rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
	}

	_updateVisuals() {
		const root = this.shadowRoot;
		if (!root) return;

		const vivid = hsvToRgb(this._hsv.h, 100, 100);
		this.style.setProperty("--sat-vivid", rgbCss(vivid));

		const { h, s, v } = this._hsv;
		const thumbH = hsvToRgb(h, 100, 100);
		const thumbS = hsvToRgb(h, s, 100);
		const gv = Math.round((v / 100) * 255);
		const thumbV = { r: gv, g: gv, b: gv };
		this.style.setProperty("--thumb-h", rgbCss(thumbH));
		this.style.setProperty("--thumb-s", rgbCss(thumbS));
		this.style.setProperty("--thumb-v", rgbCss(thumbV));

		const dot = root.querySelector(".center-dot");
		const readout = root.querySelector(".color-readout");
		const outH = root.querySelector('[data-out="h"]');
		const outS = root.querySelector('[data-out="s"]');
		const outV = root.querySelector('[data-out="v"]');

		const fill = this._fillCss();
		const rgb = hsvToRgb(this._hsv.h, this._hsv.s, this._hsv.v);

		if (dot) dot.setAttribute("fill", fill);
		if (readout) readout.textContent = this._labelText();
		if (outH) outH.textContent = `${Math.round(this._hsv.h)}°`;
		if (outS) outS.textContent = `${Math.round(this._hsv.s)}%`;
		if (outV) outV.textContent = `${Math.round(this._hsv.v)}%`;

		const L = luminance(rgb);
		const stroke = L > 0.55 ? "rgba(0,0,0,.4)" : "rgba(255,255,255,.5)";
		if (dot) dot.setAttribute("stroke", stroke);
	}

	render(): void {
		const sr = this.shadowRoot;
		if (!sr) return;

		const sz = parseInt(this.getAttribute("size") ?? "300", 10) || 300;
		const cx = sz / 2;
		const cy = sz / 2;
		/* Thinner ring */
		const r = sz * 0.405;
		const iR = sz * 0.34;
		const colors = [
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
		const segmentHues = colors.map((hex) => hexHue(hex));
		const seg = (2 * Math.PI) / colors.length;
		let paths = "";
		colors.forEach((c, i) => {
			const a1 = i * seg - Math.PI / 2;
			const a2 = (i + 1) * seg - Math.PI / 2;
			const x1 = cx + r * Math.cos(a1);
			const y1 = cy + r * Math.sin(a1);
			const x2 = cx + r * Math.cos(a2);
			const y2 = cy + r * Math.sin(a2);
			const xi1 = cx + iR * Math.cos(a1);
			const yi1 = cy + iR * Math.sin(a1);
			const xi2 = cx + iR * Math.cos(a2);
			const yi2 = cy + iR * Math.sin(a2);
			const large = seg > Math.PI ? 1 : 0;
			const hue = segmentHues[i] ?? i * 30;
			paths += `<path data-hue="${hue}" d="M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${iR},${iR} 0 ${large},0 ${xi1},${yi1}" fill="${c}" stroke="none"/>`;
		});

		const dotR = Math.max(iR * 0.78, 11);

		const { h, s, v } = this._hsv;

		this.style.setProperty("--controls-width", `${sz + 80}px`);
		sr.innerHTML = `<style>${css}</style>
      <div class="wrap">
        <svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" aria-label="Color wheel">
          ${paths}
          <circle class="center-dot" cx="${cx}" cy="${cy}" r="${dotR}" fill="${this._fillCss()}" stroke="rgba(255,255,255,.5)" stroke-width="${Math.max(1.5, sz / 200)}"/>
        </svg>
        <div class="controls">
          <div class="row">
            <label for="h">Hue</label>
            <input id="h" class="track-hue" data-slider="h" type="range" min="0" max="360" step="1" value="${Math.round(h)}" />
            <span data-out="h">${Math.round(h)}°</span>
          </div>
          <div class="row">
            <label for="s">Sat.</label>
            <input id="s" class="track-sat" data-slider="s" type="range" min="0" max="100" step="1" value="${Math.round(s)}" />
            <span data-out="s">${Math.round(s)}%</span>
          </div>
          <div class="row">
            <label for="v">Bright</label>
            <input id="v" class="track-val" data-slider="v" type="range" min="0" max="100" step="1" value="${Math.round(v)}" />
            <span data-out="v">${Math.round(v)}%</span>
          </div>
          <div class="color-readout readout" aria-live="polite"></div>
          <p class="hint">Click a wheel segment to snap hue. Sliders use HSV - brightness is value (black→white sweep).</p>
        </div>
      </div>
    `;
	}
}

customElements.define("color-wheel", ColorWheel);
