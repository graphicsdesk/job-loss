/**
 * Why we want Intersection Observer stuff for the industry impact graphic:
 * The graphic is sticky so it stays fixed on the screen while users
 * vertically scroll through a distance equal to its horizontal scrolling
 * distance. The IntersectionObserver helps us only listen in on scroll events
 * while the graphic is sticking.
 */

export function detectIntersection({
  topDetectorId,
  bottomDetectorId,
  onEnter,
  onExit,
}) {
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
        onEnter();
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
        onExit();
      }
    });
  });

  observer.observe(document.getElementById(topDetectorId));
  observer.observe(document.getElementById(bottomDetectorId));
}
