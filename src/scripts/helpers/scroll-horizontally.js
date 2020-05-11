/**
 * Why we want Intersection Observer stuff for the industry impact graphic:
 * The graphic is sticky so it stays fixed on the screen while users
 * vertically scroll through a distance equal to its horizontal scrolling
 * distance. The IntersectionObserver helps us only listen in on scroll events
 * while the graphic is sticking.
 */

export default function({
  containerId,
  paddingId,
  topDetectorId,
  bottomDetectorId,
}) {
  const container = document.getElementById(containerId);
  const paddingDiv = document.getElementById(paddingId);

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
