/**
 * Convenience wrappers for D3 selections
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.setRotate = setRotate;

transition.prototype.at = selection.prototype.at; // gives transitions .at!

// Sets the rotation. Does not step on the toes of a pre-existing translate
function setRotate(degrees) {
  console.log('degrees :>> ', degrees);
  degrees = Math.floor(degrees % 360);
  let transform = this.attr('transform');
  if (transform.includes('rotate')) {
    transform = transform.replace(/(?<=rotate\()[.\d]+(?=\))/, degrees)
  } else {
    transform = transform + ` rotate(${degrees})`;
  }
  console.log('transform :>> ', transform);
  return this.transition('rotation')
    .duration(1200)
    .at({ transform })
    .end();
}
