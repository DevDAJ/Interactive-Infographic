class ColorSwatch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['color', 'name', 'hex'];
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
    const c = this.getAttribute('color') ?? '#ff0000';
    const n = this.getAttribute('name') ?? '';
    const h = this.getAttribute('hex') ?? c;
    root.innerHTML = `
      <style>
        :host{display:block}
        .swatch{
          background:#1a1a30;border-radius:14px;padding:20px;
          text-align:center;transition:transform .4s ease,box-shadow .4s ease;
          cursor:default;
        }
        .swatch:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 12px 40px rgba(0,0,0,.4)}
        .circle{
          width:80px;height:80px;border-radius:50%;margin:0 auto 14px;
          background:${c};
          box-shadow:0 0 30px ${c}44,0 0 60px ${c}22;
          transition:transform .4s ease;
        }
        .swatch:hover .circle{transform:scale(1.08)}
        .name{font-weight:600;font-size:1rem;color:#f0f0f5}
        .hex{font-size:.8rem;color:#555577;font-family:monospace;margin-top:4px}
      </style>
      <div class="swatch">
        <div class="circle"></div>
        <div class="name">${n}</div>
        <div class="hex">${h}</div>
      </div>
    `;
  }
}

customElements.define('color-swatch', ColorSwatch);
