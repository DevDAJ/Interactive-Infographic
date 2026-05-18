class InfoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['color', 'title', 'description'];
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
    const c = this.getAttribute('color') ?? '#ff3377';
    const t = this.getAttribute('title') ?? '';
    const d = this.getAttribute('description') ?? '';
    root.innerHTML = `
      <style>
        :host{display:block}
        .card{
          background:#1a1a30;border-radius:16px;overflow:hidden;
          transition:transform .4s ease,box-shadow .4s ease;
          cursor:default;
        }
        .card:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
        .bar{height:4px;background:${c}}
        .body{padding:28px 28px 32px}
        .title{font-size:1.3rem;font-weight:700;margin-bottom:10px;color:#f0f0f5}
        .desc{color:#8888aa;font-size:.95rem;line-height:1.7;font-weight:300}
      </style>
      <div class="card">
        <div class="bar"></div>
        <div class="body">
          <div class="title">${t}</div>
          <div class="desc">${d}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('info-card', InfoCard);
