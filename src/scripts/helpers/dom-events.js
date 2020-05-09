import throttle from 'just-throttle';
import { select } from 'd3-selection';

let outlinedCircle;

class Tooltip {
  constructor() {
    this.node = select('#bubble-tooltip')
  }

  show({ clientX, clientY }) {
    const { __data__: d } = outlinedCircle;
    this.node.st({
      left: clientX,
      top: clientY,
    });
    this.node.innerHTML = d.industry;
    this.node.style('opacity', 1);
  }

  hide() {
    this.node.style('opacity', 0);
  }
}

const tooltip = new Tooltip();

/**
 * Callback for mousemove events that outlines the correct employer bubble.
 * @param event The current event, see https://github.com/d3/d3-selection#event
 */

export const outlineOnHover = throttle((event) => {
  console.log('event :>> ', event);
  const { clientX, clientY, target } = event;
  const { __data__: d } = target;

  if (d !== undefined && 'industry' in d) {
    // If we're here, the target is probably a bubble.
    // If we're hovering over a circle other than the one before, un-outline
    // the old one and outline the new one.
    if (!outlinedCircle || d.employer !== outlinedCircle.__data__.employer) {
      outlinedCircle && outlinedCircle.classList.remove('hover-highlight');
      target.classList.add('hover-highlight');
      outlinedCircle = target;
    }

    tooltip.show({ clientX, clientY });
  } else if (outlinedCircle) {
    // If we're here, the target is not a bubble and a bubble is currently
    // outlined, so we should un-outline it. Catching a non-circle mouse event
    // requires an invisible background rectangle.
    outlinedCircle.classList.remove('hover-highlight');
    outlinedCircle = null;
    tooltip.hide();
  }
}, 0);
