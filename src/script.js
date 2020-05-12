import scrollama from 'scrollama';
import throttle from 'just-throttle';
import 'd3-jetpack/essentials';

import './scripts/helpers/d3-wrappers';
import './scripts/page';
import './scripts/posting-graphics';
import './scripts/canceled-internships';
import './scripts/industry-impact';

/* Navbar fade ins */

const navbar = document.getElementById('navbar');

const hideNav = fully => {
  navbar.classList.remove('show-nav-links');
  navbar.classList.add('only-eye-logo');
  if (fully) navbar.classList.add('not-even-eye-logo');
};
const showNav = () => (navbar.className = '');

const scroller = scrollama();
const elements = [
  'h1.headline',
  '#postings-scrolly',
  '#industry-impact-container',
].map(document.querySelector.bind(document));
if (elements.includes(null)) {
  console.error('An element in', elements, 'does not exist.');
}

scroller
  .setup({
    step: elements,
    offset: 0.05,
  })
  .onStepEnter(({ index, direction }) => {
    if (index === 0 && direction === 'down') showNav();
    else if (index > 0) hideNav(true);
  })
  .onStepExit(({ index, direction }) => {
    if (index === 0 && direction === 'up') hideNav();
    else if (index > 0) showNav();
  });

window.addEventListener('resize', throttle(scroller.resize, 500));

// Mobile navbar hamburger trigger

export function hamburgerTrigger() {
  navbar.classList.toggle('show-nav-links');
}
