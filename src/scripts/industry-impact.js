import scrollHorizontally from './helpers/scroll-horizontally';

// Initialization function
function init() {
  scrollHorizontally({
    containerId: 'industry-impact-container',
    paddingId: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
  });
}

init();
