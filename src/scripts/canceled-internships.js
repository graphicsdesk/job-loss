import { select } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
import { interpolateSpectral } from 'd3-scale-chromatic';
import { extent, rollup, max } from 'd3-array';
import { quadtree } from 'd3-quadtree';
import scrollama from 'scrollama';
import 'd3-jetpack/essentials';

/* Data preprocessing */

import {
  employers as companies,
  industriesProportions,
} from '../../data/canceled-internships.json';
const industries = Object.keys(industriesProportions);

/* Some constants */

const WIDTH = document.body.clientWidth;
const HEIGHT = document.body.clientHeight;

/* radiusScale */

const radiusScale = scaleSqrt()
  .domain(extent(companies, d => d.size))
  .range([2, 37]);

/* Generating initial nodes */

const initialRadius = 700;

const companyData = companies.map(({ employer, industry, size }) => {
  const cumulativeProportion = industriesProportions[industry];
  const angle = cumulativeProportion * 2.5 * Math.PI;

  return {
    employer,
    industry,
    size,
    x: Math.cos(angle) * initialRadius + Math.random(),
    y: Math.sin(angle) * initialRadius + Math.random(),
    radius: radiusScale(size),
  };
});

/* Create the container and canvas */

const svg = select('#canceled-internships')
  .append('svg')
  .at({ width: WIDTH, height: HEIGHT })
  .append('g')
  .translate([WIDTH / 2, HEIGHT / 2]);

/* simulation force bubbles into a place and force them not to collide */

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

/* industry color scale */

function industryColorsScale(industry) {
  const t = industries.indexOf(industry) / industries.length;
  return interpolateSpectral(t);
}

/* Draw the shapes */

const circle = svg
  .selectAll('circle')
  .data(companyData)
  .enter()
  .append('circle.company')
  .attr('r', d => radiusScale(d.size))
  .attr('fill', function (d) {
    return industryColorsScale(d.industry);
  });

/* feed data into simulation so for every change in time it moves it into a certain place(?)*/

simulation.nodes(companyData).on('tick', ticked);

function ticked() {
  circle.attr('cx', d => d.x).attr('cy', d => d.y);
}

/**
 * This cluster force attracts each group of nodes towards its
 * weighted centroid.
 * Adapted from https://observablehq.com/@d3/clustered-bubbles
 */

function cjClusterForce() {
  const strength = 0.1;
  let nodes;

  function force(alpha) {
    // Group nodes by industry, then aggregate values by calculating centroid
    const centroids = rollup(nodes, centroid, d => d.industry);

    const l = alpha * strength;
    for (const d of nodes) {
      const { x: cx, y: cy } = centroids.get(d.industry);
      d.vx -= (d.x - cx) * l;
      d.vy -= (d.y - cy) * l;
    }
  }

  // Set the value of nodes to the argument of force.initialize while returning
  // that value. force.initialize(companyData) is called by the simulation.
  force.initialize = _ => (nodes = _);

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
    const theQuadtree = quadtree(
      nodes,
      d => d.x,
      d => d.y,
    );
    for (const d of nodes) {
      const r = d.radius + maxRadius;
      const nx1 = d.x - r,
        ny1 = d.y - r;
      const nx2 = d.x + r,
        ny2 = d.y + r;
      theQuadtree.visit((q, x1, y1, x2, y2) => {
        // Truthy if q.length undefined (if q is a leaf node)
        if (!q.length) {
          do {
            // q.data is a node
            if (q.data !== d) {
              const r =
                d.radius +
                q.data.radius +
                (d.industry === q.data.industry ? padding1 : padding2);
              let x = d.x - q.data.x;
              let y = d.y - q.data.y;
              let l = Math.hypot(x, y);
              if (l < r) {
                l = ((l - r) / l) * alpha;
                (d.x -= x *= l), (d.y -= y *= l);
                (q.data.x += x), (q.data.y += y);
              }
            }
          } while ((q = q.next));
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  // Set the value of max radius to that math stuff, which includes setting
  // the value of nodes to the argument of force.initialize.
  // force.initialize(companyData) is called by the simulation.
  force.initialize = _ =>
    (maxRadius =
      max((nodes = _), d => d.radius) + Math.max(padding1, padding2));

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

//scrolly stuffs

function enterHandle({ index }) {
  if (index === 0) {
    simulation
      .force('x', forceSplit)
      .alpha(0.3)
      .restart();
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
