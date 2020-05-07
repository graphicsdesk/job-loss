import { select } from 'd3-selection';
import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceX, forceY } from 'd3-force';
import { interpolateSpectral } from 'd3-scale-chromatic';
import { extent, rollup, max } from 'd3-array';
import {quadtree} from 'd3-quadtree';
import 'd3-transition';
import 'd3-jetpack/essentials';

import companies from '../../data/employer-industries.json';

/* Some constants */

const WIDTH = document.body.clientWidth;
const HEIGHT = document.body.clientHeight;

/* Data preprocessing */

// Generating unique industries
const industrySet = new Set(companies.map(item => item.industry));
const industries = [...industrySet];
const totalIndustry = industries.length;

// Calculate proportions for each industry
// (# companies in industry / total # companies)
const industriesProps = companies.reduce((acc, { industry }) => {
  if (!(industry in acc)) acc[industry] = 0;
  acc[industry] += 1 / companies.length;
  return acc;
}, {});

// Make those proportions cumulative
let cumValue = 0;
const industriesPropsCum = {};
for (const industry in industriesProps) {
  const prop = industriesProps[industry];
  industriesPropsCum[industry] = cumValue + prop / 2;
  cumValue += prop;
}

const getSize = sizeStr => parseInt(sizeStr.replace(',', '').split(' ')[0]);

/* radiusScale */

const radiusScale = scaleSqrt()
  .domain(extent(companies, d => getSize(d.size)))
  .range([2, 37]);

/* Generating initial nodes */

const initialRadius = 700;

const companyData = companies.map(({ employer, industry, size: sizeStr }) => {
  // Old proportion
  let cumulativeProportion = industries.indexOf(industry) / totalIndustry;
  // New proportion
  cumulativeProportion = industriesPropsCum[industry];

  const angle = cumulativeProportion * 2 * Math.PI;
  const size = getSize(sizeStr);

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

const strength = 0.03;
const simulation = forceSimulation()
  .force('x', forceX().strength(strength))
  .force('y', forceY().strength(strength))
  .force('charlotte', cjClusterForce())
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
  .attr('r', function (d) {
    return radiusScale(d.size);
  })
  .attr('fill', function (d) {
    return industryColorsScale(d.industry);
  });

/* feed data into simulation so for every change in time it moves it into a certain place(?)*/

simulation.nodes(companyData).on('tick', ticked);

function ticked() {
  circle.attr('cx', d => d.x).attr('cy', d => d.y);
}

/**
 * Cluster force
 * Look here if confused: https://observablehq.com/@d3/clustered-bubbles
 */

function cjClusterForce() {
  const strength = 0.2;
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

  force.initialize = _ => (nodes = _);

  return force;
}

/* Collision force for spacing groups */

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
    // Black box of quadtree
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
