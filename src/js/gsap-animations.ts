import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { bindScrollTriggerLayoutRefresh } from "../animations/common";
import { initFolderStack } from "../animations/folder-stack";
import { initPsychScroll } from "../animations/psych-scroll";
import { initSectionAnimations } from "../animations/sections";

gsap.registerPlugin(ScrollTrigger, Draggable, TextPlugin);

gsap.to("#progress-bar", {
	width: "100%",
	ease: "none",
	scrollTrigger: {
		trigger: "body",
		start: "top top",
		end: "bottom bottom",
		scrub: 0.5,
	},
});

gsap.from(".hero-overlay h1", {
	opacity: 0,
	y: 60,
	duration: 1.2,
	ease: "power3.out",
});
gsap.from(".hero-overlay p", {
	opacity: 0,
	y: 30,
	duration: 1,
	ease: "power3.out",
	delay: 0.3,
});
gsap.from(".scroll-indicator", { opacity: 0, duration: 0.8, delay: 0.8 });

function initScrollAnimations(): void {
	initFolderStack();
	initSectionAnimations();
	initPsychScroll();
	ScrollTrigger.refresh();
	bindScrollTriggerLayoutRefresh();
}

Promise.all([
	customElements.whenDefined("palette-row"),
	customElements.whenDefined("color-wheel"),
	customElements.whenDefined("color-mixer"),
]).then(initScrollAnimations);
