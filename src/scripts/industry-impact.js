import { detectIntersection } from './helpers/graphic-intersection';

const container = document.getElementById('industry-impact-container');
const paddingDiv = document.getElementById('industry-impact-padding');

// Updates height of paddingDiv to match the horizontal scroll distance
function updatePadding() {
  paddingDiv.style.height =
    container.scrollWidth - container.clientWidth + 'px';
}

// Shifts the graphic horizontally based on the progress of paddingDiv
function shiftGraphic() {
  const { top } = paddingDiv.getBoundingClientRect();
  container.scrollLeft = paddingDiv.offsetTop - top;
}

// Initialization function
function init() {
  detectIntersection({
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
    onEnter: () => window.addEventListener('scroll', shiftGraphic),
    onExit: () => window.removeEventListener('scroll', shiftGraphic),
  });

  // TODO: put into resize listener? does width ever change?
  updatePadding();

  // Call shiftGraphic once on initiation to ensure that the graphic's horizontal
  // horizontal position is correct wherever in the page we refresh at
  shiftGraphic();
}

init();
