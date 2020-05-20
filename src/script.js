import 'd3-jetpack/essentials';
import 'intersection-observer';

import './scripts/helpers/d3-wrappers';
import './scripts/page';
import './scripts/posting-graphics';
import './scripts/canceled-internships';

// Mobile navbar hamburger trigger

const navbar = document.getElementById('navbar');
export function hamburgerTrigger() {
  navbar.classList.toggle('show-nav-links');
}
