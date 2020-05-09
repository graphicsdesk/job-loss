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
  const prevRotation = rotation ? (parseInt(rotation[2]) * Math.PI) / 180 : 0;

  // If no argument was passed in, return the current rotation
  if (radians === undefined) {
    return prevRotation;
  }

  this.style('transition-duration', 1200 + 'ms')

  console.log('diff :>> ', (radians - prevRotation) * 180 / Math.PI);

  // If the transition is going to take us through more than 180 degrees,
  // 
  /* if (Math.abs(radians - prevRotation) > Math.PI) {
    if (radians > 0)
      radians -= Math.PI * 2;
    else
      radians += Math.PI * 2;
  } */

  // console.log('prevRotation, radians :>> ', Math.floor(prevRotation*180/Math.PI), Math.floor(radians*180/Math.PI));

  const degrees = Math.floor((radians * 180) / Math.PI);
  if (rotation) {
    // If a rotation alreaxy exists, replace it
    transform = transform.replace(rotationRegex, '$1' + degrees);
  } else {
    // Otherwise, add a rotation
    transform = transform + ` rotate(${degrees}deg)`;
  }
  // console.log('transform :>> ', transform);
  this.style('transform', transform);
}
