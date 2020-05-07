import rawPostings from '../../data/postings.json';
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import 'd3-transition';
import 'd3-jetpack/essentials';

/* Data preprocessing */

const postings = rawPostings
  .map(({ date, count }) => ({
    date: new Date(date),
    count: count,
  }))
  .sort((a, b) => a.date - b.date);

/* Some constants */

const margin = { left: 40, top: 10, bottom: 40, right: 10 };
const TICK_PADDING = 11;

/**
 * Initiation code. Creates DOM nodes and instantiates functions like scales
 * and shape generators. None of this code should "react" (i.e. no variables
 * here should depend on the values of other variables changing).
 */

let width, height;

// Create SVG and main container group, following margin convention
const container = select('#postings-over-time');
const svg = container
  .append('svg')
  .at({ width, height })
  .append('g')
  .translate([margin.left, margin.top]);

// Create axes groups
const xAxis = svg.append('g.x.axis');
const yAxis = svg.append('g.y.axis');

// Instantiate scales
const xScale = scaleTime().domain(extent(postings, d => d.date));
const yScale = scaleLinear().domain([
  0,
  1.1 * Math.max(postings.map(d => d.count)),
]);

// Instantiate shape and axes generators
const lineFn = line();
const xAxisFn = axisBottom().tickPadding(TICK_PADDING);
const yAxisFn = axisLeft();

// The line path
const linePath = svg.append('path');

function drawGraph() {
  // Update width and height
  width = Math.min(1020, document.body.clientWidth);
  height = document.body.clientHeight;
  const gWidth = width - margin.left - margin.right;
  const gHeight = height - margin.top - margin.bottom;

  container.select('svg').at({ width, height });

  // Update scale ranges
  xScale.range([0, gWidth]);
  yScale.range([gHeight, 0]);

  // Update line and axes generation params
  lineFn.x(d => xScale(d.date)).y(d => yScale(d.count));
  xAxisFn
    .scale(xScale)
    .ticks(gWidth / 80)
    .tickSize(-gHeight);
  yAxisFn.scale(yScale).tickSize(-gWidth);

  // Create axes
  xAxis.translate([0, gHeight]).call(xAxisFn);
  yAxis.call(yAxisFn);

  // Set path d
  linePath.attr('d', lineFn(postings));

  /* animation:
    1. get the length of the path */
  const lineLength = linePath.node().getTotalLength();

  /*
    2. set the dash array in the offset to the length */
  linePath
    .style('stroke-dasharray', `0, ${lineLength}`)
    .transition('draw-in')
    .duration(3000)
    .style('stroke-dasharray', `${lineLength}, ${lineLength}`);
}

drawGraph();
window.addEventListener('resize', drawGraph);
