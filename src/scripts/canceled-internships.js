import { select } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceX, forceY } from 'd3-force';
import { interpolateViridis } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import scrollama from 'scrollama';

import { cjClusterForce, elonMuskCollide, centroid } from './forces';

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

/* Generating initial nodes */

const initialRadius = 700;

function initialRadiusScale (industry) {
  if (industry === "Internet & Software" || industry === "Aerospace" || 
    industry === "Tourism" || industry === "Transportation & Logistics"){
    return initialRadius*1.5;
  }
  return initialRadius;
}

const companyData = companies.map(({ employer, industry, size }) => {
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2 * Math.PI;
  return {
    employer,
    industry,
    size,
    x: Math.cos(angle) * initialRadiusScale(industry) + Math.random(),
    y: Math.sin(angle) * initialRadiusScale(industry) + Math.random(),
    radius: radiusScale(size),
  };
});

/* Create the svg and then draw circles */

const svg = select('#canceled-internships')
  .append('svg')
  .at({ width: WIDTH, height: HEIGHT })
  .append('g')
  .translate([WIDTH / 2, HEIGHT / 2]);

const circles = svg
  .selectAll('circle')
  .data(companyData)
  .join('circle') // https://observablehq.com/@d3/selection-join
  .at({
    r: d => radiusScale(d.size),
    fill: d => industryColorsScale(d.industry),
  });

/* partition the circles for discoloring */
const bigBusiness = circles.filter(d => d.size > 250);
const softwareBig = circles.filter(
  d => d.industry === 'Internet & Software' && d.size > 1000,
);

/* Initiate simulation, define some forces */

const strength = 0.02;

const forceCombine = forceX().strength(strength);

const simulation = forceSimulation()
  .force('x', forceCombine)
  .force('y', forceY().strength(strength))
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
  const { x: cx, y: cy } = centroid(
    companyData.filter(d => d.industry === industry),
  );
  const initialAngle = Math.PI - Math.atan(-cy / cx);

  const desiredAngle = Math.PI;
  const degreeDifference = ((desiredAngle - initialAngle) * 180) / Math.PI;
  await svg.setRotate(degreeDifference);

  const forceSplit = forceX(d =>
    d.industry === industry ? -350 : 300,
  ).strength(strength);
  simulation.force('x', forceSplit).alpha(0.69).restart();
}

async function unseparateIndustry(industry) {
  simulation.force('x', forceCombine).alpha(0.69).restart();

  // Wait 1 second
  // await new Promise(r => setTimeout(r, 2000));

  await svg.setRotate(0);
}

async function enterHandle({ index, direction }) {
  if (index === 0 && direction === 'down') {
    separateIndustry('Internet & Software');
  }

  if (index === 1 && direction === 'down') {
    separateIndustry('Advertising, PR & Marketing');
    softwareBig.classed('softwareBig', true);
  }

  if (index === 2 && direction === 'down') {
    bigBusiness.classed('bigBusiness', true);
  }
}

function exitHandle({ index, direction }) {
  if (index === 0 && direction === 'up') {
    unseparateIndustry('Internet & Software');
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
    // debug: true,
  })
  .onStepEnter(enterHandle)
  .onStepExit(exitHandle);

// setup resize event
// TODO: debounce
window.addEventListener('resize', scroller.resize);

/**
 * Hovering stuff. It's too slow.
 */

/*
svg.on('mousemove', moved);
function moved() {
  event.preventDefault();
  const q = quadtree(companyData, d => d.x, d => d.y);
  const coords = mouse(this);
  const x = coords[0];
  const y = coords[1];
  const result = q.find(x, y, 20);
  if (result) console.log('result :>> ', result);
}
*/
