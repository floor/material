import "material/elements/css/carousel";
import { carouselElement, defineCarousel } from "../elements/carousel.js";
import { createComponent } from "./create.js";
export const Carousel = /*#__PURE__*/ createComponent(carouselElement.spec, defineCarousel, "Carousel");
