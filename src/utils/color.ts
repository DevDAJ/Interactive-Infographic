export interface Rgb {
	r: number;
	g: number;
	b: number;
}
export interface Hsl {
	h: number;
	s: number;
	l: number;
}

export function hexToRgb(hex: string): Rgb {
	const raw = String(hex).replace("#", "");
	const n = parseInt(raw, 16);
	if (!Number.isFinite(n) || raw.length < 6) return { r: 0, g: 0, b: 0 };
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
	const R = r / 255;
	const G = g / 255;
	const B = b / 255;
	const max = Math.max(R, G, B);
	const min = Math.min(R, G, B);
	const d = max - min;
	let h = 0;
	let s = 0;
	const l = ((max + min) / 2) * 100;
	if (d !== 0) {
		s = l > 50 ? (d / (2 - max - min)) * 100 : (d / (max + min)) * 100;
		switch (max) {
			case R:
				h = ((G - B) / d + (G < B ? 6 : 0)) * 60;
				break;
			case G:
				h = ((B - R) / d + 2) * 60;
				break;
			default:
				h = ((R - G) / d + 4) * 60;
		}
	}
	return { h: ((h % 360) + 360) % 360, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
	const H = ((h % 360) + 360) % 360;
	const S = Math.max(0, Math.min(100, s)) / 100;
	const L = Math.max(0, Math.min(100, l)) / 100;
	const c = (1 - Math.abs(2 * L - 1)) * S;
	const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
	const m = L - c / 2;
	let rp = 0,
		gp = 0,
		bp = 0;
	if (H < 60) {
		rp = c;
		gp = x;
	} else if (H < 120) {
		rp = x;
		gp = c;
	} else if (H < 180) {
		gp = c;
		bp = x;
	} else if (H < 240) {
		gp = x;
		bp = c;
	} else if (H < 300) {
		rp = x;
		bp = c;
	} else {
		rp = c;
		bp = x;
	}
	return {
		r: Math.round((rp + m) * 255),
		g: Math.round((gp + m) * 255),
		b: Math.round((bp + m) * 255),
	};
}

export function rgbToHex(rgb: Rgb): string {
	const h = (v: number) => v.toString(16).padStart(2, "0");
	return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
}

export function normalizeHex(hex: string): string {
	const s = String(hex || "").trim();
	if (!s) return "#000000";
	let h = s.startsWith("#") ? s : `#${s}`;
	if (h.length === 4) {
		h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
	}
	return h.length === 7 ? h.toUpperCase() : "#000000";
}

export function hexHue(hex: string): number {
	const raw = String(hex).replace("#", "");
	const n = parseInt(raw, 16);
	if (!Number.isFinite(n) || raw.length < 6) return 0;
	const r = ((n >> 16) & 255) / 255;
	const g = ((n >> 8) & 255) / 255;
	const b = (n & 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	if (max === min) return 0;
	const d = max - min;
	let hh = 0;
	if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) hh = ((b - r) / d + 2) / 6;
	else hh = ((r - g) / d + 4) / 6;
	return Math.round(hh * 360) % 360;
}

export function rgbCss(rgb: Rgb): string {
	return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

export function luminance(rgb: Rgb): number {
	const lin = (c: number) => {
		const x = c / 255;
		return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function lerpColor(c1: string, c2: string, t: number): string {
	const a = hexToRgb(c1);
	const b = hexToRgb(c2);
	return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
}

export function hsvToRgb(h: number, s: number, v: number): Rgb {
	const hh = (((Number(h) % 360) + 360) % 360) / 360;
	const ss = Math.max(0, Math.min(1, Number(s) / 100));
	const vv = Math.max(0, Math.min(1, Number(v) / 100));
	const i = Math.floor(hh * 6);
	const f = hh * 6 - i;
	const p = vv * (1 - ss);
	const q = vv * (1 - f * ss);
	const t = vv * (1 - (1 - f) * ss);
	let r = 0,
		g = 0,
		b = 0;
	switch (i % 6) {
		case 0:
			r = vv;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = vv;
			b = p;
			break;
		case 2:
			r = p;
			g = vv;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = vv;
			break;
		case 4:
			r = t;
			g = p;
			b = vv;
			break;
		case 5:
			r = vv;
			g = p;
			b = q;
			break;
	}
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
	};
}

export function avgColor(a: string, b: string): string {
	const h1 = normalizeHex(a);
	const h2 = normalizeHex(b);
	return rgbToHex({
		r: Math.round(
			(parseInt(h1.slice(1, 3), 16) + parseInt(h2.slice(1, 3), 16)) / 2,
		),
		g: Math.round(
			(parseInt(h1.slice(3, 5), 16) + parseInt(h2.slice(3, 5), 16)) / 2,
		),
		b: Math.round(
			(parseInt(h1.slice(5, 7), 16) + parseInt(h2.slice(5, 7), 16)) / 2,
		),
	});
}
