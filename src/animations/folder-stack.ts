import gsap from "gsap";

export function getFolderSlidePx(): number {
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue("--folder-slide")
		.trim();
	const n = parseFloat(raw);
	return Number.isFinite(n) ? n : Math.min(window.innerHeight * 0.36, 280);
}

export function initFolderStack(): void {
	const stackPanels = gsap.utils.toArray(
		"#hero, section:not(#hero)",
	) as gsap.DOMTarget[];
	stackPanels.forEach((panel, i) => {
		gsap.set(panel, { zIndex: 10 + i });
	});
	gsap.set("footer", { clearProps: "zIndex" });

	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

	gsap.utils.toArray("section:not(#hero)").forEach((panelUnknown) => {
		const panel = panelUnknown as gsap.DOMTarget;
		gsap.fromTo(
			panel,
			{
				y: () => getFolderSlidePx(),
				borderTopLeftRadius: 56,
				borderTopRightRadius: 56,
			},
			{
				y: 0,
				borderTopLeftRadius: 28,
				borderTopRightRadius: 28,
				ease: "none",
				force3D: true,
				scrollTrigger: {
					trigger: panel,
					start: "top bottom",
					end: "top top",
					scrub: 0.65,
					invalidateOnRefresh: true,
				},
			},
		);
	});
}
