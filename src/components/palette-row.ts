class PaletteRow extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
	}

	static get observedAttributes(): string[] {
		return ["colors"];
	}

	connectedCallback(): void {
		this.render();
	}

	attributeChangedCallback(): void {
		this.render();
	}

	render(): void {
		const root = this.shadowRoot;
		if (!root) return;
		const cs = this.getAttribute("colors") ?? "#ff0000,#00ff00,#0000ff";
		const arr = cs.split(",").map((s) => s.trim());
		root.innerHTML = `
      <style>
        :host{display:block}
        .row{display:flex;gap:6px;border-radius:10px;overflow:hidden;height:var(--h,30px)}
        .swatch{flex:1;transition:flex .3s ease}
        .swatch:hover{flex:1.5}
      </style>
      <div class="row">${arr.map((c) => `<div class="swatch" style="background:${c}"></div>`).join("")}</div>
    `;
	}
}

customElements.define("palette-row", PaletteRow);
