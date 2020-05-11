import rawPostings from '../../data/postings.json';
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { format } from 'd3-format';
import scrollama from 'scrollama';
import 'd3-transition';
import 'd3-jetpack/essentials';

/* Data preprocessing */

const postings = rawPostings
  .map(({ date, count }) => ({
    date: new Date(date),
    count: count,
  }))
  .sort((a, b) => a.date - b.date);

/* compute the rolling mean */
const rollingMean = [];

for (let i = 0; i < postings.length; i++) {
  let sum = 0;
  let mean = 0;

  if (i > 2 && i < postings.length - 3) {
    for (let j = -3; j <= 3; j++) {
      sum += postings[i + j].count;
    }
    mean = sum / 7;
    rollingMean.push({
      date: postings[i].date,
      count: mean,
    });
  }
}

/* compute the remote percentage */
const remotePostings = rawPostings
  .map(({ date, count, remoteCount }) => ({
    date: new Date(date),
    percentage: remoteCount/count,
  }))
  .sort((a, b) => a.date - b.date);

console.log(remotePostings)

/* Some constants */

const margin = { left: 40, top: 20, bottom: 50, right: 20 };
const TICK_PADDING = 11;
const universityClosingDate = new Date('2020-03-08'); //University announced canceled classes for 2 days
const universityRemoteDate = new Date('2020-03-12');
const pauseStartDate = new Date('2020-03-22'); //PAUSE:effective at 8PM on Sunday, March 22
const dates = [universityClosingDate, universityRemoteDate, pauseStartDate];

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
  1.1 * Math.max(...postings.map(d => d.count)),
]);
const pScale = scaleLinear().domain(extent(remotePostings, d => d.percentage));

// Instantiate shape and axes generators
const lineFn = line();
const xAxisFn = axisBottom().tickPadding(TICK_PADDING);
const yAxisFn = axisLeft().tickPadding(TICK_PADDING);

// The line path
const linePath = svg.append('path#rawCount');
const meanPath = svg.append('path#rollingMean');

const remoteContainer = svg.append('g.remote')
const remotePath = remoteContainer
  /*.selectAll("path");
  .data(remotePostings)
  .enter()*/
  .append('path')

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
  yAxisFn
    .scale(yScale)
    .tickSize(-gWidth)
    .tickFormat(format(""));

  // Create axes
  xAxis.translate([0, gHeight]).call(xAxisFn);
  yAxis.transition().call(yAxisFn);

  // Set path d
  linePath.attr('d', lineFn(postings))
    .classed('rawCount', true);
  meanPath.attr('d', lineFn(rollingMean))
    .classed('rollingMean', true);

  /* animation:
    1. get the length of the path */
  const lineLength = linePath.node().getTotalLength();
  const rollingMeanLength = meanPath.node().getTotalLength();

  /*
    2. set the dash array in the offset to the length */
  linePath
    .style('stroke-dasharray', `0, ${lineLength}`)
    .transition('draw-in')
    .duration(3000)
    .style('stroke-dasharray', `${lineLength}, ${lineLength}`);

  meanPath
    .style('stroke-dasharray', `0, ${rollingMeanLength}`)
    .transition('draw-in')
    .duration(3000)
    .style('stroke-dasharray', `${rollingMeanLength}, ${rollingMeanLength}`);
}

drawGraph();
window.addEventListener('resize', drawGraph);

/* function for remote graph */
function drawRemoteGraph() {
  width = Math.min(1020, document.body.clientWidth);
  height = document.body.clientHeight;
  const gWidth = width - margin.left - margin.right;
  const gHeight = height - margin.top - margin.bottom;

  container.select('svg').at({ width, height });

  // Update scale ranges
  xScale.range([0, gWidth]);
  pScale.range([gHeight, 0]);

  // Update line and axes generation params
  lineFn.x(d => xScale(d.date)).y(d => pScale(d.percentage));
  xAxisFn
    .scale(xScale)
    .ticks(gWidth / 80)
    .tickSize(-gHeight);
  yAxisFn
    .scale(pScale)
    .tickSize(-gWidth)
    .tickFormat(format(".0%"));

  // Create axes
  xAxis.translate([0, gHeight]).call(xAxisFn);
  yAxis.transition().call(yAxisFn);

  // Set path d
  remotePath.attr('d', lineFn(remotePostings))
    .classed('remotePostings', true);

  /* animation:
    1. get the length of the path */
  const remotePathLength = remotePath.node().getTotalLength();

  /*
    2. set the dash array in the offset to the length */
  remotePath
    .style('stroke-dasharray', `0, ${remotePathLength}`)
    .transition('draw-in')
    .duration(3000)
    .style('stroke-dasharray', `${remotePathLength}, ${remotePathLength}`);
}

/* draw some lines for specfic dates */
const dateLineContainer = svg.append('g')

const dateLine = dateLineContainer.selectAll('line')
  .data(dates)
  .enter()
  .append('line')
  .at({
    x1: d => xScale(d),
    x2: d => xScale(d),
    y1: (d,i) => yScale(0),
    y2: (d,i) => yScale(550/(i+1)),
  })

/* scrolly stuffs */
function enterHandle({ index, direction }) {
  if (index === 1 && direction === 'down') {
    dateLine.classed('dateLine', true);
  }

  if (index === 2 && direction === 'down') {
    linePath.classed('rawCount', false);
    meanPath.classed('rollingMean', false);
    drawRemoteGraph();
  }
}

function existHandle({index, direction}) {
  if (index === 1 && direction === 'up') {
    dateLine.classed('dateLine', false);
  }

  if (index === 2 && direction === 'up') {
    remotePath.classed('remotePostings', false);
    drawGraph();
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller.setup({ step: '#postings-scrolly .step' })
  .onStepEnter(enterHandle)
  .onStepExit(existHandle);

// setup resize event
// TODO: debounce
window.addEventListener('resize', scroller.resize);
