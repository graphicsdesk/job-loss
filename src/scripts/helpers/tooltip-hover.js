import { select } from 'd3-selection';

let outlinedCircle;

const formatInfo = ({ industry, employer, sizeText }, industryColor) => `
  <p class="tooltip-industry" style="color:${industryColor}">${industry}</p>
  <p class="tooltip-employer">${employer}</p>
  <p class="tooltip-size">${sizeText} employees</p>
`;

const tooltipBox = select('#bubble-tooltip');

function showTooltip({ clientX, clientY, industryColorsScale }) {
  const { __data__: d } = outlinedCircle;
  tooltipBox.st({
    left: clientX,
    top: clientY,
    opacity: 1,
  });
  tooltipBox.html(formatInfo(d, industryColorsScale(d.industry)));
}

export function hideTooltip() {
  tooltipBox.style('opacity', 0);
  if (outlinedCircle) {
    outlinedCircle.classList.remove('hover-highlight');
    outlinedCircle = null;
  }
}

/**
 * Callback for mousemove events that outlines the correct employer bubble.
 * @param event The current event, see https://github.com/d3/d3-selection#event
 */

export const outlineOnHover = (event, industryColorsScale) => {
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

    showTooltip({ clientX, clientY, industryColorsScale });
  } else if (outlinedCircle) {
    // If we're here, the target is not a bubble and a bubble is currently
    // outlined, so we should un-outline it. Catching a non-circle mouse event
    // requires an invisible background rectangle.
    hideTooltip();
  }
};
