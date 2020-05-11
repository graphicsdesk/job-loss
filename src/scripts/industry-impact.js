import scrollHorizontally from './helpers/scroll-horizontally';

// Initialization function
function init() {
  scrollHorizontally({
    container: 'industry-impact-container',
    padding: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
  });
}

init();
