import { select, clientPoint, event } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation } from 'd3-force';
import { interpolateViridis } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import throttle from 'just-throttle';
import scrollama from 'scrollama';

import { cjClusterForce, elonMuskCollide, forceXFn, forceYFn } from './forces';
import { inverseRotatePoint, centroid } from './utils';

const industriesToShow = [
  'Internet & Software',
  'Transportation & Logistics',
  'Aerospace',
];

/* Import data, derive some helpful values */

import {
  employers as companies,
  industriesProportions,
} from '../../data/canceled-internships.json';
const industries = Object.keys(industriesProportions);

/* Some constants */

const WIDTH = document.body.clientWidth;
const HEIGHT = document.body.clientHeight;

/* Scales */

const radiusScale = scaleSqrt()
  .domain(extent(companies, d => d.size))
  .range([2, 37]);

function industryColorsScale(industry) {
  const t = industries.indexOf(industry) / industries.length;
  return interpolateViridis(t);
}

/* Generate initial array of nodes */

const INITIAL_RADIUS = 600;

const companyData = companies.map(({ employer, industry, size }) => {
  // The angle an industry's employers should center themselve around
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2 * Math.PI;
  // Place industries we will highlight in the future on the outsides
  const initRadius =
    (industriesToShow.includes(industry) ? 1.5 : 1) * INITIAL_RADIUS;
  return {
    employer,
    industry,
    size,
    x: Math.cos(angle) * initRadius + Math.random(),
    y: Math.sin(angle) * initRadius + Math.random(),
    radius: radiusScale(size),
  };
});

/* Create the svg, and then create helpful container groups */

// Create top-level group that translates and rotates everything
const svg = select('#canceled-internships')
  .append('svg')
  .at({ width: WIDTH, height: HEIGHT })
  .append('g')
  .style('transform', `translate(${WIDTH / 2}px, ${HEIGHT / 2}px)`);

// Create subgroup just for the bubbles
const nodesContainer = svg.append('g.node-container');

// Create the bubbles
const circles = nodesContainer
  .selectAll('circle')
  .data(companyData)
  .join('circle') // https://observablehq.com/@d3/selection-join
  .at({
    r: d => radiusScale(d.size),
    fill: d => industryColorsScale(d.industry),
  });

// Red circle shows the origin, green circle shows split target. For debugging.
svg.append('circle').at({ r: 10, fill: 'red', cx: 0, cy: 0 });
const greenCircle = svg
  .append('circle')
  .at({ r: 10, fill: 'green', cx: 0, cy: 0 });

/* partition the circles for discoloring */
const bigBusiness = circles.filter(d => d.size > 250);
const softwareBig = circles.filter(
  d => d.industry === 'Internet & Software' && d.size > 1000,
);

/* Initiate simulation, define some forces */

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

/* scrolly stuffs */

async function separateIndustry(industry) {
  let { x: cx, y: cy } = centroid(
    companyData.filter(d => d.industry === industry),
  );

  // Calculate the rotation
  let initialAngle = Math.atan(cy / cx); // angle of the industry cluster
  if (cx < 0) {
    initialAngle += Math.PI;
  }
  const desiredAngle = Math.PI; // angle we want industry cluster to point in
  const angle = desiredAngle - initialAngle; // angle we have to rotate in
  console.log(
    'init, rotate :>> ',
    Math.round((initialAngle * 180) / Math.PI),
    Math.round((angle * 180) / Math.PI),
  );
  await svg.rotate(angle); // rotate nodes

  const [x, y] = inverseRotatePoint([-450, 0], angle);
  greenCircle.transition().at({ cx: x, cy: y });
  simulation
    .force(
      'x',
      forceXFn(d => (d.industry === industry ? x : -x)),
    )
    .force(
      'y',
      forceYFn(d => (d.industry === industry ? y : -y)),
    )
    .alpha(0.69)
    .restart();
}

async function unseparateIndustry() {
  simulation
    .force('x', forceXCenter)
    .force('y', forceYCenter)
    .alpha(0.69)
    .restart();

  // Wait 1 second
  // await new Promise(r => setTimeout(r, 1000));
}

async function enterHandle({ index, direction }) {
  if (index === 1 && direction === 'down') {
    softwareBig.classed('softwareBig', true);
  }

  if (index === 3 && direction === 'down') {
    bigBusiness.classed('bigBusiness', true);
  }

  if (index > 0 && direction === 'down') {
    // await unseparateIndustry();
  }
  await separateIndustry(industriesToShow[index]);
}

async function exitHandle({ index, direction }) {
  if (index === 0 && direction === 'up') {
    await svg.rotate(0);
    unseparateIndustry();
  }

  if (index === 1 && direction === 'up') {
    softwareBig.classed('softwareBig', false);
  }

  if (index === 2 && direction === 'up') {
    bigBusiness.classed('bigBusiness', false);
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.step',
  })
  .onStepEnter(enterHandle)
  .onStepExit(exitHandle);

// setup resize event
// TODO: debounce
window.addEventListener('resize', scroller.resize);

/* hovering/highlighting */

const highlightCircle = svg.append('circle#highlight-circle');
function highlight({ target }) {
  const { __data__: d } = target;
  if (d === undefined) {
    return;
  }

  highlightCircle
    .st({ opacity: 1 })
    .at({ cx: d.x, cy: d.y, r: radiusScale(d.size) });
}

const throttledHighlight = throttle(highlight, 10);
svg
  .on('mousemove', function () {
    throttledHighlight.call(this, event);
  })
  .on('mouseout', () => highlightCircle.st({ opacity: 0 }));

/* axes debugging*/

svg.append('line').at({
  x1: -WIDTH / 2,
  x2: WIDTH / 2,
  y1: 0,
  y2: 0,
  stroke: 'blue',
  strokeWidth: 2,
  strokeDasharray: 4,
});
svg
  .append('text')
  .at({ x: WIDTH / 2 - 10, y: 0, fill: 'blue' })
  .text('X');
svg.append('line').at({
  y1: -HEIGHT / 2,
  y2: HEIGHT / 2,
  x1: 0,
  x2: 0,
  stroke: 'purple',
  strokeWidth: 2,
  strokeDasharray: 4,
});
svg
  .append('text')
  .at({ y: HEIGHT / 2 - 10, x: 0, fill: 'purple' })
  .text('Y');

svg.append('line').at({
  x1: -WIDTH / 2,
  x2: WIDTH / 2,
  y1: 0,
  y2: 0,
  stroke: 'blue',
  strokeWidth: 2,
  strokeDasharray: 4,
});
