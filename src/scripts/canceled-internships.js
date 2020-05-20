import { select, event } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation } from 'd3-force';
import { interpolateViridis } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import throttle from 'just-throttle';
import scrollama from 'scrollama';
import { IS_MOBILE } from './helpers/utils';

import {
  cjClusterForce,
  elonMuskCollide,
  forceXFn,
  forceYFn,
} from './helpers/forces';
import {
  rotatePoint,
  inverseRotatePoint,
  centroid,
  calcAngle,
  equalOrNull,
  splitAmpersand,
} from './helpers/utils';
import { outlineOnHover, hideTooltip } from './helpers/tooltip-hover';

const industriesToShow = [
  null,
  null,
  [
    'Transportation & Logistics',
    'Aerospace',
    'Sports & Leisure',
    'Tourism',
    // 'Hotels & Accommodation',
  ],
  'Internet & Software',
  'Internet & Software',
  null,
  null,
];
const allIndustriesShown = industriesToShow.flat(1);

/* Import data, derive some helpful values */

import {
  employers,
  industriesProportions,
  randomIndexMapping,
} from '../../data/canceled-internships.json';

const companies = employers.map(({ sizeText, ...rest }) => ({
  ...rest,
  size: parseInt(sizeText.split(' ')[0].replace(',', '').replace('+', '')),
  sizeText,
}));

const industries = Object.keys(industriesProportions);

/* Some constants */

// SVG dimensions
let width, height;
let vbWidth, vbHeight;
const vbMinX = 0;
const vbMinY = 0;
let viewBox;
let isShrunk;

// Spit target and initial radius
let spitTarget;
let desiredAngle;
let initialRadius;

/* Create the svg, and then create helpful container groups */

// Create top-level group that translates and rotates everything
const svg = select('#canceled-internships').insert('svg', ':first-child');
const graphic = svg.append('g');
const labelsContainer = svg.append('g.bubble-labels');

// Create subgroup just for the bubbles
const nodesContainer = graphic.append('g.node-container');

/* Updates graphic elements when window resizes */

function updateGraphic() {
  width = document.body.clientWidth;
  height = window.innerHeight;
  vbWidth = Math.max(750, width);
  vbHeight = height;

  viewBox = `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`;
  isShrunk = vbWidth > width;

  spitTarget = vbWidth > width ? [0, -vbHeight / 3] : [-vbWidth / 3, 0];
  desiredAngle = calcAngle(spitTarget);
  initialRadius = (Math.min(vbWidth, vbHeight) * 3) / 4;

  svg.at({ width, height, viewBox });
  graphic.safeTranslate([vbWidth / 2, vbHeight / 2]);
  labelsContainer.style(
    'transform',
    `translate(${vbWidth / 2}px, ${vbHeight / 2}px)`,
  );
}

updateGraphic();

/* Scales */

const maxRadius = 37;

const radiusScale = scaleSqrt()
  .domain(extent(companies, d => d.size))
  .range([2, maxRadius]);

// Accepts both an index and the industry name

export function industryColorsScale(industry) {
  if (!Number.isInteger(industry)) {
    industry = industries.indexOf(industry);
  }
  const t = randomIndexMapping[industry] / industries.length;
  return interpolateViridis(t);
}

/* Generate initial array of nodes. Initial angle based on first split angle */

const companyData = companies.map(({ employer, industry, size, sizeText }) => {
  // The angle an industry's employers should center themselve around
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2 * Math.PI + desiredAngle / 2;
  // Place industries we will highlight in the future on the outsides
  const initRadius =
    (allIndustriesShown.includes(industry) ? 1.5 : 1) * initialRadius;
  return {
    employer,
    industry,
    size,
    sizeText,
    x: Math.cos(angle) * initRadius + Math.random(),
    y: Math.sin(angle) * initRadius + Math.random(),
    radius: radiusScale(size),
  };
});

/* Create the bubbles; partition them for discoloring */

const circles = nodesContainer
  .selectAll('circle')
  .data(companyData)
  .join('circle') // https://observablehq.com/@d3/selection-join
  .at({
    r: d => d.radius,
    fill: d => industryColorsScale(d.industry),
  });

const bigBusiness = circles.filter(d => d.size > 1000);
const softwareBig = circles.filter(
  d => d.industry === 'Internet & Software' && d.size > 1000,
);

/* Initiate simulation */

// Default forces that pulls nodes towards the origin
const forceXCenter = forceXFn(0);
const forceYCenter = forceYFn(0);

// Our cluster force calls this callback every time centroids update. We store
// the centroids so we can use them later for label positioning.
const clusterForce = cjClusterForce(c => (centroids = c));

// Store the collide force so we can configure its settings (e.g. ghost state)
const collideForce = elonMuskCollide();

let centroids;
const simulation = forceSimulation()
  .force('x', forceXCenter)
  .force('y', forceYCenter)
  .force('cjCluster', clusterForce)
  .force('elonMuskCollide', collideForce);

/* feed data into simulation so for every change in time it moves it into a certain place(?)*/

let labeledIndustries;

simulation.nodes(companyData).on('tick', () => {
  circles.at({
    cx: d => d.x,
    cy: d => d.y,
  });

  // If there are industries that are labeled right now (i.e. industry labels
  // that have been made opacity = 1 by showTextNodes()), move them with the
  // centroids
  // * `labeledIndustries` is a variable that showTextNodes updates to tell us
  //   which industries it just made opacity = 1.
  // * `centroids` is a variable that centroidsListener updates to make sure
  //   we don't have to recompute centroids after cjClusterForce already did.
  if (labeledIndustries) {
    labelNodes.each(function (industry) {
      if (labeledIndustries.includes(industry)) {
        let { x, y } = rotatePoint(centroids.get(industry), angle);
        if (industry === 'Hotels & Accommodation') {
          y += isShrunk ? 40 : -30;
        }
        if (['Tourism', 'Sports & Leisure'].includes(industry)) {
          y += 50;
        }
        if (isShrunk) {
          if (industry === 'Aerospace') y -= 20;
          if (industry === 'Internet & Software') y -= 75;
        }
        select(this).at({ y }).selectAll('tspan').at({ x });
      }
    });
  }
});

/* Functions for interactivity */

// Utility function that sets a simulation's alpha and restarts it.
// Does nothing if the simulation's alpha is already higher (like when
// we refresh in the middle of a step).
function alphaRestart(a) {
  if (simulation.alpha() < a) {
    simulation.alpha(a).restart();
  }
}

/**
 * Spits out an industry cluster. Rotates graphic so the cluster is always spit
 * towards SPIT_TARGET.
 */

let currentlySeparatedIndustries = null;
let angle;

async function separateIndustries(industries, justUnseparatedSizes) {
  if (industries && !Array.isArray(industries)) {
    industries = [industries];
  }
  if (
    equalOrNull(currentlySeparatedIndustries, industries) &&
    !justUnseparatedSizes
  ) {
    return;
  }
  currentlySeparatedIndustries = industries;
  showTextNodes(null);
  if (industries === null) {
    graphic.rotate(); // An empty rotation just rejects the old rotation promise
    return unseparateIndustry();
  }

  // await unseparateIndustry();
  let { x: cx, y: cy } = centroid(
    companyData.filter(d => industries.includes(d.industry)),
  );

  // Calculate rotation and separataion forces
  const initialAngle = calcAngle([cx, cy]); // angle of the industry cluster  // const desiredAngle = Math.PI; // angle we want industry cluster to point in
  angle = desiredAngle - initialAngle; // angle we have to rotate in
  const [xForce, yForce] = calculateSeparationForces(industries, angle);

  // Update forces and rotate, awaiting the rotate and animate labels around it
  simulation.force('x', xForce).force('y', yForce);
  alphaRestart(0.6);

  try {
    await graphic.rotate(angle);
    showTextNodes(industries, angle);
  } catch (e) {
    // Ignorable. Pending rotation was interrupted.
  }
}

/** Calculates separation forces based on angle and spitTarget */
function calculateSeparationForces(industries, angle) {
  const [x, y] = inverseRotatePoint(spitTarget, angle);
  // greenCircle.transition().at({ cx: x, cy: y });

  const strength = isShrunk ? 0.055 : 0.02;
  const scaleIsolation = isShrunk ? 3 / 4 : 1; // how isolated an industry is
  const scaleSeparation = isShrunk ? 4 / 2 : 1; // how separate others are

  const separate = val => d =>
    industries.includes(d.industry)
      ? val * scaleIsolation
      : -val * scaleSeparation;
  return [forceXFn(separate(x), strength), forceYFn(separate(y), strength)];
}

const labelNodes = labelsContainer
  .selectAll('text')
  .data(industries.filter(x => allIndustriesShown.includes(x)))
  .join(enter =>
    enter
      .append('text')
      .st({ opacity: 0 })
      .tspansBackgrounds(splitAmpersand, 26),
  );

function showTextNodes(industries) {
  labeledIndustries = industries;
  if (industries === null) {
    labelNodes.style('opacity', 0);
  } else {
    labelNodes.each(function (industry) {
      select(this).style('opacity', industries.includes(industry) ? 1 : 0);
    });
  }
}

// Brings everything back to the center.
async function unseparateIndustry() {
  simulation.force('x', forceXCenter).force('y', forceYCenter);
  alphaRestart(0.8);
  showTextNodes(null);
}

let areSizesSeparated = false;

function separateSize() {
  if (areSizesSeparated) return;

  graphic.rotate();
  showTextNodes(null);

  // Use the spit target while accounting for the current rotation
  const [x, y] = inverseRotatePoint(spitTarget, angle);

  // Since the simulation stores the address and not a copy of the collide
  // force, we can call ghost() without re-adding the force to the simulation
  collideForce.ghost();

  // const scale
  const scaleIsolation = isShrunk ? 4 / 3 : 1; // how isolated the small biz are
  const scaleSeparation = isShrunk ? 4 / 3 : 1; // how separated the big biz are
  const getValue = val => d =>
    d.size > 1000 ? -val * scaleSeparation : val * scaleIsolation;

  simulation
    // Remove the cluster force because it's too confusing w 2 centers
    .force('cjCluster', null)
    .force('x', forceXFn(getValue(x), 0.04))
    .force('y', forceYFn(getValue(y), 0.04));
  alphaRestart(0.9);

  areSizesSeparated = true;
}

// Undo the size separation. Returns true if we actually did something
function unseparateSize() {
  if (areSizesSeparated) {
    simulation
      .force('cjCluster', clusterForce)
      .force('x', forceXCenter)
      .force('y', forceYCenter);
    alphaRestart(0.69);

    // Wait a bit for the circles to go back to their industry clusters
    // before adding back the collide force
    collideForce.deferNoGhost(1200);

    areSizesSeparated = false;
    return true;
  }
}

/* Scrolly stuff */

async function enterHandle({ index }) {
  if (index === 4) {
    bigBusiness.classed('bigBusiness', false);
    softwareBig.classed('softwareBig', true);
  }
  if (index === 5) {
    bigBusiness.classed('bigBusiness', true);
  }

  if (index < 5) {
    await separateIndustries(industriesToShow[index], unseparateSize());
  } else if (index < 6) {
    separateSize();
  }
}

async function exitHandle({ index, direction }) {
  if (index === 4 && direction === 'up') {
    bigBusiness.classed('bigBusiness', false);
    softwareBig.classed('softwareBig', false);
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({ step: '#canceled-scrolly .step', offset: isShrunk ? 0.7 : 0.6 })
  .onStepEnter(enterHandle)
  .onStepExit(exitHandle);

// setup resize event
let oldWidth = window.innerWidth;
window.addEventListener(
  'resize',
  throttle(() => {
    if (IS_MOBILE) {
      if (oldWidth !== window.innerWidth) {
        resize();
        oldWidth = window.innerWidth;
      }
    } else {
      resize();
    }
  }),
);

function resize() {
  scroller.resize();
  updateGraphic();
}

/* Logic for adding an outline to circles we're hovering over */

// Invisible background required for catching mouse movement events
graphic.insert('rect#invisible-background', ':first-child');

// On mousemove, outline the hovered bubble and show the tooltip
graphic
  .on('mousemove', () => outlineOnHover(event, industryColorsScale))
  .on('mouseout', hideTooltip);

/* set styles for text elements */

const textList = document.querySelectorAll('c');
const industryList = ['Internet & Software'];

for (let i = 0; i < textList.length; i++) {
  textList[i].style.color = industryColorsScale(industryList[i]);
  textList[i].style.fontWeight = 700;
}
