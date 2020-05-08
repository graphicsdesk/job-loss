import { select } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
import { interpolateSpectral } from 'd3-scale-chromatic';
import { extent, rollup, max } from 'd3-array';
import { quadtree } from 'd3-quadtree';
import scrollama from 'scrollama';
import 'd3-jetpack/essentials';

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
  return interpolateSpectral(t);
}

/* Generating initial nodes */

const initialRadius = 700;

const companyData = companies.map(({ employer, industry, size }) => {
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2 * Math.PI + 0.5 * Math.PI;
  return {
    employer,
    industry,
    size,
    x: Math.cos(angle) * initialRadius + Math.random(),
    y: Math.sin(angle) * initialRadius + Math.random(),
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

/* Initiate simulation, define some forces */

const strength = 0.02;

const forceCombine = forceX().strength(strength);
const forceSplit = forceX(d =>
  d.industry === 'Internet & Software' ? -350 : 300,
).strength(strength);

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

/**
 * This cluster force attracts each group of nodes towards its
 * weighted centroid.
 * Adapted from https://observablehq.com/@d3/clustered-bubbles
 */

function cjClusterForce() {
  const strength = 0.1;
  let nodes;

  function force(alpha) {
    // Group nodes by industry, then invoke a value aggregator that calculates
    // each group's centroid
    const centroids = rollup(nodes, centroid, d => d.industry);

    alpha *= strength;
    for (const d of nodes) {
      const { x: cx, y: cy } = centroids.get(d.industry);
      d.vx -= (d.x - cx) * alpha;
      d.vy -= (d.y - cy) * alpha;
    }
  }

  // force.initialize is passed the array of nodes.
  // https://github.com/d3/d3-force/blob/master/README.md#force_initialize
  force.initialize = _ => {
    nodes = _;
  };

  return force;
}

/**
 * This collision force prevents nodes from overlapping. It uses different
 * distances to separate nodes of the same group versus different groups.
 * Adapted from https://observablehq.com/@d3/clustered-bubbles
 */
function elonMuskCollide() {
  const alpha = 0.4; // fixed for greater rigidity!
  const padding1 = 1; // separation between same-color nodes
  const padding2 = 17; // separation between different-color nodes
  let nodes;
  let maxRadius;

  function force() {
    // A quadtree recursively partitions 2D space into squares. Distinct points
    // are leaf nodes; conincident ones are linked lists.
    const theQuadtree = quadtree(
      nodes,
      d => d.x,
      d => d.y,
    );

    for (const node of nodes) {
      const r = node.radius + maxRadius;
      const nx1 = node.x - r,
        ny1 = node.y - r;
      const nx2 = node.x + r,
        ny2 = node.y + r;

      // Visit each node in the quadtree. q is the node. (x1, y1) and (x2, y2)
      // are the lower and upper bounds of the node.
      theQuadtree.visit((q, x1, y1, x2, y2) => {
        const { data: quadNode } = q;
        if (!q.length && quadNode !== node) {
          // Calculate desired minimum distance and current distance
          const padding =
            node.industry === quadNode.industry ? padding1 : padding2;
          const minDistance = node.radius + quadNode.radius + padding;
          let dx = node.x - quadNode.x;
          let dy = node.y - quadNode.y;
          let distance = Math.hypot(dx, dy);

          // If current distance between the two nodes is less than the
          // desired distance (sums of radii + appropriate padding)...
          if (distance < minDistance) {
            distance = ((distance - minDistance) / distance) * alpha;
            dx *= distance;
            dy *= distance;
            node.x -= dx;
            node.y -= dy;
            quadNode.x += dx;
            quadNode.y += dy;
          }
        }
        // If this returns true, then q's children are not visited
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  // force.initialize is passed the array of nodes.
  // https://github.com/d3/d3-force/blob/master/README.md#force_initialize
  force.initialize = _ => {
    nodes = _;
    maxRadius = max(nodes, d => d.radius) + Math.max(padding1, padding2);
  };

  return force;
}

// Calculates centroid for an array of nodes
function centroid(nodes) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const d of nodes) {
    let k = d.radius ** 2;
    x += d.x * k;
    y += d.y * k;
    z += k;
  }
  return { x: x / z, y: y / z };
}

/* scrolly stuffs */

function enterHandle({ index, direction }) {
  if (index === 0 && direction === 'down') {
    simulation.force('x', forceSplit).alpha(0.6).restart();
  }
}

function exitHandle({ index, direction }) {
  if (index === 0 && direction === 'up') {
    simulation.force('x', forceCombine).alpha(0.2).restart();
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.step',
    debug: true,
  })
  .onStepEnter(enterHandle)
  .onStepExit(exitHandle);

// setup resize event
// TODO: debounce
window.addEventListener('resize', scroller.resize);
