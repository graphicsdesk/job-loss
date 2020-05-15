/**
 * Convenience wrappers for D3 selections
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.rotate = rotate;
selection.prototype.safeTranslate = safeTranslate;
selection.prototype.tspansBackgrounds = tspansBackgrounds;

transition.prototype.at = selection.prototype.at; // gives transitions .at!

/**
 * Sets the rotation in radians. Does not step on the toes of a pre-existing
 * transformations.
 * If an argument is not provided, returns the existing rotation in radians.
 */

const rotationRegex = /(rotate\()(-?[.\d]+)(?=deg\))/;
let rejectOldPromise;

function rotate(radians) {
  if (rejectOldPromise) {
    rejectOldPromise();
  }
  if (radians === undefined) {
    return;
  }

  let transform = this.style('transform');
  let rotation = transform.match(rotationRegex);
  const prevRotation = rotation ? (parseInt(rotation[2]) * Math.PI) / 180 : 0;
  const rotationDistance = Math.abs(radians - prevRotation);

  // If we're rotating a lot, allow some more animation time
  let animTime = 1200;
  if (rotationDistance > (Math.PI * 3) / 4) {
    animTime += 500;
  }

  // We should never rotate through an angle of more than π
  if (rotationDistance > Math.PI) {
    radians -= (radians / Math.abs(radians)) * 2 * Math.PI;
  }

  this.style('transition-duration', animTime + 'ms');

  const degrees = Math.floor((radians * 180) / Math.PI);
  if (rotation) {
    transform = transform.replace(rotationRegex, '$1' + degrees);
  } else {
    transform = transform + ` rotate(${degrees}deg)`;
  }

  this.style('transform', transform);

  const el = this.node();
  return new Promise((resolve, reject) => {
    rejectOldPromise = () => reject('Pending rotation interrupted.');
    const transitionEnded = e => {
      if (e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', transitionEnded);
      resolve();
    };
    el.addEventListener('transitionend', transitionEnded);
  });
}

/**
 * Sets the translation. Does not step on the toes of a pre-existing
 * transformations (which only is rotations right now).
 */

function safeTranslate([x, y]) {
  const transform = this.style('transform');
  const translate = `translate(${x}px, ${y}px)`;
  if (transform === 'none' || !transform.includes('rotate')) {
    return this.st({ transform: translate });
  }
  return this.st({
    transform: transform.replace(/translate\([\d.]+px, [\d.]+px\)/, translate),
  });
}

// Same as d3-jetpack tspans, but adds background tspans
function tspansBackgrounds(lines, lh) {
  this.selectAll('tspan')
    .data(function (d) {
      const linesAry = typeof lines === 'function' ? lines(d) : lines;
      return linesAry.reduce((acc, line) => {
        const datum = { line, parent: d };
        acc.push({ ...datum, isBackground: true });
        acc.push(datum);
        return acc;
      }, []);
    })
    .join(
      enter => enter.append('tspan'),
      update => update,
      exit => exit.remove(),
    )
    .text(d => d.line)
    .at({
      dy: ({ parent, line, isBackground }, i) => {
        if (i < 2 || !isBackground) return 0;
        return typeof lh === 'function' ? lh(parent, line) : lh;
      },
    })
    .classed('background-tspan', d => d.isBackground);
  return this;
}
