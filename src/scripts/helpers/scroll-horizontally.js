import { selection } from 'd3-selection';

/**
 * Why we want Intersection Observer stuff for the industry impact graphic:
 * The graphic is sticky so it stays fixed on the screen while users
 * vertically scroll through a distance equal to its horizontal scrolling
 * distance. The IntersectionObserver helps us only listen in on scroll events
 * while the graphic is sticking.
 */

const select = selector => {
  if (selector instanceof selection) return selector.node();
  if (selector instanceof Element) return selector;
  return document.getElementById(selector);
};

/**
 * The exported function takes seven arguments:
 * - container is where you should have made your horizontal graphic
 * - padding is the id of an HTML element you need to make at the bottom of your container
 *   to make sure the container gets really tall (see github.com/graphicsdesk/job-loss/blob/master/src/industry-impact.html#L32)
 * - topDetectorId and bottomDetectorId are the id's of HTML elements you need before and 
 *   after the graphic (see github.com/graphicsdesk/job-loss/blob/master/src/industry-impact.html#L14)
 * - onScroll is an optional callback function you can use to track how many pixels to the left/right
 *   a reader has scrolled through. An example use case is to highlight the center bar in
 *   horzontal bar chart.
 * - exitLeft and exitRight are optional callbacks you can use when readers have scrolled
 *   up or down past the graphic.
 */

export default function ({
  container,
  padding: paddingDiv,
  topDetectorId,
  bottomDetectorId,
  onScroll = () => undefined,
  exitLeft = () => undefined,
  exitRight = () => undefined,
}) {
  container = select(container);
  paddingDiv = select(paddingDiv);

  // Updates height of paddingDiv to match the horizontal scroll distance

  function updatePadding() {
    paddingDiv.style.height =
      container.scrollWidth - container.clientWidth + 'px';
    // console.log(paddingDiv.style.height, container.scrollWidth, container.clientWidth)
  }

  // Shifts the graphic horizontally based on the progress of paddingDiv.

  let fixLeft;
  let attemptsToUnfix = 0;

  container.addEventListener('scroll', () => {
    container.scrollLeft = fixLeft;
    attemptsToUnfix += 1;
    if (attemptsToUnfix > 20) {
      showScrollDown();
      attemptsToUnfix = 0;
    }
  });

  function shiftGraphic() {
    const { top } = paddingDiv.getBoundingClientRect();
    const scrollLeft = paddingDiv.offsetTop - top;
    container.scrollLeft = fixLeft = scrollLeft;
    attemptsToUnfix = 0;
    onScroll(scrollLeft, container.scrollWidth - container.clientWidth);
  }

  // Setup the intersection observer

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const { target, isIntersecting, boundingClientRect } = entry;
      const midpoint = window.innerHeight / 2;

      // Enter condition
      if (
        // We just entered from the top if the top detector just passed the
        // threshold to leave the screen and is above the viewport.
        (target.id === topDetectorId &&
          !isIntersecting &&
          boundingClientRect.top < 0) ||
        // We just entered from the bottom if the bottom detector just passed the
        // threshold to leave the screen and is close to the bottom.
        (target.id === bottomDetectorId &&
          !isIntersecting &&
          boundingClientRect.top > midpoint)
      ) {
        window.addEventListener('scroll', shiftGraphic);
      }

      // Exit condition
      if (
        // We just exited from the top if the top detector just passed the
        // threshold to enter the screen and is close to the top of the screen.
        (target.id === topDetectorId &&
          isIntersecting &&
          boundingClientRect.top < midpoint) ||
        // We just exited from the bottom if the bottom detector just passed the
        // threshold to enter the screen and is close to the bottom of the screen.
        (target.id === bottomDetectorId &&
          isIntersecting &&
          boundingClientRect.top > midpoint)
      ) {
        window.removeEventListener('scroll', shiftGraphic);
        target.id === topDetectorId ? exitLeft() : exitRight();
      }
    });
  });

  observer.observe(document.getElementById(topDetectorId));
  observer.observe(document.getElementById(bottomDetectorId));

  // TODO: put into resize listener? does width ever change?
  updatePadding();

  // Call shiftGraphic once on initiation to ensure that the graphic's horizontal
  // horizontal position is correct wherever in the page we refresh at
  shiftGraphic();
}

const scrollDownMsg = document.getElementById('scroll-down-message');

let messageTimeout;

function showScrollDown() {
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
  scrollDownMsg.style.opacity = 1;
  messageTimeout = setTimeout(() => (scrollDownMsg.style.opacity = 0), 2000);
}
