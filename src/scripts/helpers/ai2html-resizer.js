import throttle from 'just-throttle';

/**
 * Resizer script to toggle multiple artboards for responsiveness. Adapted from:
 * https://github.com/newsdev/ai2html/blob/gh-pages/_includes/resizer-script.html
 */

function resizer() {
  const elements = document.querySelectorAll('.g-artboard[data-min-width]');
  const widthById = {};

  elements.forEach(el => {
    const parent = el.parentNode;
    const width = widthById[parent.id] || parent.getBoundingClientRect().width;
    const minwidth = el.getAttribute('data-min-width');
    const maxwidth = el.getAttribute('data-max-width');

    widthById[parent.id] = width;
    if (+minwidth <= width && (+maxwidth >= width || maxwidth === null)) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

function init() {
  // only want one resizer on the page
  if (document.documentElement.classList.contains('g-resizer-v3-init')) return;
  document.documentElement.classList.add('g-resizer-v3-init');

  resizer();
  window.addEventListener('resize', throttle(resizer, 500));
}

// Export ai2html resizer initialization to page.js
module.exports = init;
