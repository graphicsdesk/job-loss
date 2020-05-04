import rawPostings from '../../data/postings.json';
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';

/* Data preprocessing */

const postings = rawPostings
  .map(({ date, count }) => ({
    date: new Date(date),
    count: count,
  }))
  .sort((a, b) => b.date - a.date);
console.log(postings);

/* Some constants */

const WIDTH = 600;
const HEIGHT = 400;

/* Create the container and canvas */

const svg = select('#postings-over-time')
  .append('svg')
  .attr('width', WIDTH)
  .attr('height', HEIGHT);

/* Somehow get a mapping from abstract data to coordinates on our canvas */

// Scales
const xScale = scaleTime()
  .domain(extent(postings, d => d.date))
  .range([0, WIDTH]);
const yScale = scaleLinear()
  .domain(extent(postings, d => d.count))
  .range([HEIGHT, 0]);

// Function that generates the line drawing string
const lineFn = line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.count));

/* TODO: AXES: https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89 */

/* Draw the shapes */
svg.append('path').attr('d', lineFn(postings));
