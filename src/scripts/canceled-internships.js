import { select, event } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation } from 'd3-force';
import { interpolateViridis } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import throttle from 'just-throttle';
import scrollama from 'scrollama';

import {
  cjClusterForce,
  elonMuskCollide,
  forceXFn,
  forceYFn,
} from './helpers/forces';
import { inverseRotatePoint, centroid, calcAngle } from './helpers/utils';
import { outlineOnHover, hideTooltip } from './helpers/tooltip-hover';

const industriesToShow = [
  ['Tourism', 'Transportation & Logistics', 'Hotels & Accommodation'],
  'Hotels & Accommodation',
  'Internet & Software',
];

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
const width = document.body.clientWidth;
const height = document.body.clientHeight;

// SVG viewbox
const vbWidth = Math.max(750, width);
const vbHeight = height;
const vbMinX = 0;
const vbMinY = 0;
const viewBox = `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`;
const isShrunk = vbWidth > width;

/* Scales */

const maxRadius = 37;

const radiusScale = scaleSqrt()
  .domain(extent(companies, d => d.size))
  .range([2, maxRadius]);

function industryColorsScale(industry) {
  const t =
    randomIndexMapping[industries.indexOf(industry)] / industries.length;
  return interpolateViridis(t);
}

/* Generate initial array of nodes. Initial angle based on first split angle */

const spitTarget = vbWidth > width ? [0, -vbHeight / 3] : [-vbWidth / 3, 0];
const desiredAngle = calcAngle(spitTarget);

const initialRadius = (Math.min(vbWidth, vbHeight) * 3) / 4;

const companyData = companies.map(({ employer, industry, size, sizeText }) => {
  // The angle an industry's employers should center themselve around
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2 * Math.PI + desiredAngle / 2;
  // Place industries we will highlight in the future on the outsides
  const initRadius =
    (industriesToShow.flat(1).includes(industry) ? 1.5 : 1) * initialRadius;
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

/* Create the svg, and then create helpful container groups */

// Create top-level group that translates and rotates everything
const svg = select('#canceled-internships')
  .insert('svg', ':first-child')
  .at({ width, height, viewBox })
  .append('g')
  .style('transform', `translate(50%, 50%)`);

// Create subgroup just for the bubbles
const nodesContainer = svg.append('g.node-container');

// Create the bubbles
const circles = nodesContainer
  .selectAll('circle')
  .data(companyData)
  .join('circle') // https://observablehq.com/@d3/selection-join
  .at({
    r: d => d.radius,
    fill: d => industryColorsScale(d.industry),
  });

/* partition the circles for discoloring */

const bigBusiness = circles.filter(d => d.size > 250);
const softwareBig = circles.filter(
  d => d.industry === 'Internet & Software' && d.size > 1000,
);

/* Initiate simulation */

// Default forces that pulls nodes towards the origin
const forceXCenter = forceXFn(0);
const forceYCenter = forceYFn(0);

const simulation = forceSimulation()
  .force('x', forceXCenter)
  .force('y', forceYCenter)
  .force('cjCluster', cjClusterForce())
  .force('elonMuskCollide', elonMuskCollide());

/* feed data into simulation so for every change in time it moves it into a certain place(?)*/

simulation.nodes(companyData).on('tick', () => {
  circles.at({
    cx: d => d.x,
    cy: d => d.y,
  });
});

/*
// Red circle shows the origin, green circle shows split target. For debugging.
svg.append('circle').at({ r: 10, fill: 'red', cx: 0, cy: 0 });
const greenCircle = svg
  .append('circle')
  .at({ r: 10, fill: 'green', cx: 0, cy: 0 });
*/

/* Functions for interactivity */

/**
 * Spits out an industry cluster. Rotates graphic so the cluster is always spit
 * towards SPIT_TARGET.
 */

async function separateIndustries(industries) {
  if (!Array.isArray(industries)) {
    industries = [industries];
  }

  // await unseparateIndustry();
  let { x: cx, y: cy } = centroid(
    companyData.filter(d => industries.includes(d.industry)),
  );

  // Calculate the rotation
  const initialAngle = calcAngle([cx, cy]); // angle of the industry cluster  // const desiredAngle = Math.PI; // angle we want industry cluster to point in
  const angle = desiredAngle - initialAngle; // angle we have to rotate in
  await svg.rotate(angle); // rotate nodes

  // Calculate and apply separation forces
  const [xForce, yForce] = calculateSeparationForces(industries, angle);
  simulation.force('x', xForce).force('y', yForce).alpha(0.6).restart();

  showTextNodes(industries);
}

/** Calculates separation forces based on angle and spitTarget */
function calculateSeparationForces(industries, angle) {
  const [x, y] = inverseRotatePoint(spitTarget, angle);
  // greenCircle.transition().at({ cx: x, cy: y });

  const strength = isShrunk ? 0.04 : 0.02;
  const scaleIsolation = isShrunk ? 3 / 4 : 1; // how isolated an industry is
  const scaleSeparation = isShrunk ? 3.5 / 2 : 1; // how separate others are

  const separate = val => d =>
    industries.includes(d.industry)
      ? val * scaleIsolation
      : -val * scaleSeparation;
  return [forceXFn(separate(x), strength), forceYFn(separate(y), strength)];
}

/** TODO: Show the text labels of certain industries */

const labelNodes = null;
function showTextNodes(industries) {}

/** Brings everything back to the center. */
async function unseparateIndustry() {
  simulation
    .force('x', forceXCenter)
    .force('y', forceYCenter)
    .alpha(0.6)
    .restart();

  // await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
}

/* Scrolly stuff */

async function enterHandle({ index, direction }) {
  if (index === 1 && direction === 'down') {
    softwareBig.classed('softwareBig', false);
  }
  if (index === 4 && direction === 'down') {
    bigBusiness.classed('bigBusiness', false);
    softwareBig.classed('softwareBig', true);
  }
  if (index === 5 && direction === 'down') {
    await svg.rotate(0);
    unseparateIndustry();
    bigBusiness.classed('bigBusiness', true);
  }
  if (index > 0 && index < 4) {
    await separateIndustries(industriesToShow[index - 1]);
  }
}

async function exitHandle({ index, direction }) {
  if (index === 1 && direction === 'up') {
    unseparateIndustry();
  }

  if (index === 3 && direction === 'up') {
    bigBusiness.classed('bigBusiness', false);
    softwareBig.classed('softwareBig', false);
  }
  if (index === 4 && direction === 'up') {
    bigBusiness.classed('bigBusiness', false);
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({ step: '#canceled-scrolly .step' })
  .onStepEnter(enterHandle)
  .onStepExit(exitHandle);

// setup resize event
window.addEventListener('resize', throttle(scroller.resize, 300));

/* Logic for adding an outline to circles we're hovering over */

// Invisible background required for catching mouse movement events
svg.insert('rect#invisible-background', ':first-child');

// On mousemove, outline the hovered bubble and show the tooltip
svg
  .on('mousemove', () => outlineOnHover(event, industryColorsScale))
  .on('mouseout', hideTooltip);

/* set styles for text elements */
const industryList = document.querySelectorAll('c');
for (let i = 0; i < industryList.length; i++) {
  industryList[i].style.color = industryColorsScale(industriesToShow[i]);
}
