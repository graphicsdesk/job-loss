/**
 * Convenience wrappers for D3 selections
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.setRotate = setRotate;

transition.prototype.at = selection.prototype.at; // gives transitions .at!

// Sets the rotation. Does not step on the toes of a pre-existing translate
function setRotate(degrees) {
  let transform = this.attr('transform');
  if (transform.includes('rotate')) {
    transform = transform.replace(/(?<=rotate\()\d{1,2}(?=\))/, degrees)
  } else {
    transform = transform + ` rotate(${degrees})`;
  }
  return this.transition()
    .duration(1200)
    .at({ transform })
    .end();
}
