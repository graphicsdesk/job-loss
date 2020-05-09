/**
 * Convenience wrappers for D3 selections
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.rotate = rotate;
transition.prototype.at = selection.prototype.at; // gives transitions .at!

/**
 * Sets the rotation in radians. Does not step on the toes of a pre-existing
 * transformations.
 * If an argument is not provided, returns the existing rotation in radians.
 */

const rotationRegex = /(rotate\()(-?[.\d]+)(?=deg\))/;

function rotate(radians) {
  let transform = this.style('transform');
  let rotation = transform.match(rotationRegex);
  // const prevRotation = rotation ? (parseInt(rotation[2]) * Math.PI) / 180 : 0;

  this.style('transition-duration', 1200 + 'ms');

  const degrees = Math.floor((radians * 180) / Math.PI);
  if (rotation) {
    transform = transform.replace(rotationRegex, '$1' + degrees);
  } else {
    transform = transform + ` rotate(${degrees}deg)`;
  }

  this.style('transform', transform);
}
