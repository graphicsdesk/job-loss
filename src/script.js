import enterView from 'enter-view';
import textBalancer from 'text-balancer';
import 'd3-jetpack/essentials';

import './scripts/helpers/d3-wrappers';
import './scripts/page';
import './scripts/posting-graphics';
import './scripts/canceled-internships';
// import './scripts/industry-impact';

/* Navbar fade ins */

const navbar = document.getElementById('navbar');

const hideNav = () => {
  navbar.classList.remove('show-nav-links');
  navbar.classList.add('only-eye-logo');
};

const showNav = () => navbar.classList.remove('only-eye-logo');

// By default the navbar is hidden. When headline reached, show the navbar.
enterView({
  selector: '.headline',
  offset: 1,
  enter: showNav,
  exit: hideNav,
});
// But for the postings scrolly, to maximize screen space, hide the navbar.
enterView({
  selector: '#postings-scrolly',
  offset: 1,
  enter: hideNav,
  exit: showNav,
});
// In index.html we manually added an ID to the div.graphic that contains
// #postings-scrolly, so we can use an adjacent sibling combinator to show
// the navbar after postings-scrolly is done.
enterView({
  selector: '#show-navbar-after-graphic + p',
  offset: 1,
  enter: showNav,
  exit: hideNav,
});

// Mobile navbar hamburger trigger

export function hamburgerTrigger() {
  navbar.classList.toggle('show-nav-links');
}

// Text balance headline, deck, and image captions

if (window.innerWidth <= 460) {
  textBalancer.balanceText('.headline');
}
