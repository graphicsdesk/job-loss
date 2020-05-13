import { select, selectAll } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import 'd3-jetpack';
import scrollama from 'scrollama';
import throttle from 'just-throttle';
import { wordwrap } from 'd3-transition';

import postingsData from '../../data/postings.json';

/* Data preprocessing */

const postings = postingsData.postings
  .map(({ date, count, remoteCount }) => ({
    date: new Date(date),
    count: count,
    remoteCount: remoteCount,
  }))
  .sort((a, b) => a.date - b.date);

const standardPosting = postings[0].count;
const percentChange = postings.map(({ date, count, remoteCount }) => ({
  date: date,
  percentChange: (count - standardPosting) / standardPosting,
}));

/* compute the rolling mean */
const rollingMean = [];

for (let i = 0; i < percentChange.length; i++) {
  let sum = 0;
  let mean = 0;

  if (i > 2 && i < percentChange.length - 3) {
    for (let j = -3; j <= 3; j++) {
      sum += percentChange[i + j].percentChange;
    }
    mean = sum / 7;
    rollingMean.push({
      date: percentChange[i].date,
      percentChange: mean,
    });
  }
}

// percentage from rolling mean of remote postings
const remoteRollingMean = [];

for (let i = 0; i < postings.length; i++) {
  let remoteSum = 0;
  let countSum = 0;
  let remoteMean = 0;
  let countMean = 0;

  if (i > 2 && i < postings.length - 3) {
    for (let j = -3; j <= 3; j++) {
      remoteSum += postings[i + j].remoteCount;
      countSum += postings[i + j].count;
    }
    remoteMean = remoteSum / 7;
    countMean = countSum / 7;
    remoteRollingMean.push({
      date: new Date(postings[i].date),
      percentage: remoteMean / countMean,
    });
  }
}
/* Some constants */

const margin = { left: 43, top: 20, bottom: 50, right: 20 };
const TICK_PADDING = 11;
const dateToNote = new Date('2020-03-07'); //PAUSE:effective at 8PM on Sunday, March 22

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
const xScale = scaleTime().domain(extent(percentChange, d => d.date));
const yScale = scaleLinear().domain([-1, 1]);
const pScale = scaleLinear().domain([0, 1]);

// Instantiate shape and axes generators
const lineFn = line();
const xAxisFn = axisBottom().tickPadding(TICK_PADDING);
const yAxisFn = axisLeft().tickPadding(TICK_PADDING);

// The line path
const linePath = svg.append('path#percentChange');
const meanPath = svg.append('path#rollingMean');

const remoteContainer = svg.append('g.remote');
const remotePath = remoteContainer.append('path');

async function drawGraph() {
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
  lineFn.x(d => xScale(d.date)).y(d => yScale(d.percentChange));
  xAxisFn
    .scale(xScale)
    .ticks(gWidth / 80)
    .tickSize(-gHeight);
  yAxisFn.scale(yScale).tickSize(-gWidth).tickFormat(format('.0%'));

  // Create axes
  xAxis.translate([0, gHeight]).call(xAxisFn);
  try {
    await yAxis.transition('y-axis-trans').duration(600).call(yAxisFn).end();
  } catch (error) {
    // When another transition of the same name (in this case "y-axis-trans")
    // starts on the same element (yAxis), the current transition gets
    // interrupted and the Promise rejects.
    // See https://github.com/d3/d3-transition#transition_end.
    // It's fine if the Promise rejects, it just means the user was scrolling
    // quickly between steps and the animation didn't have time to finish.
    console.error('Transition', error._name, 'was interrupted.');
  }
  //change 0% tick
  yAxis
    .selectAll('g.tick')
    .filter(d => d === 0)
    .select('line')
    .style('stroke', 'black');

  // Set path d
  linePath.attr('d', lineFn(percentChange)).classed('percentChange', true);
  meanPath.attr('d', lineFn(rollingMean)).classed('rollingMean', true);

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
async function drawRemoteGraph() {
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
  yAxisFn.scale(pScale).tickSize(-gWidth).tickFormat(format('.0%'));

  // Create axes
  xAxis.translate([0, gHeight]).call(xAxisFn);
  await yAxis.transition().duration(600).call(yAxisFn).end();

  // Set path d
  remotePath
    .attr('d', lineFn(remoteRollingMean))
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
const dateLineContainer = svg.append('g.dateLine');

const dateLine = dateLineContainer.append('line').at({
  x1: xScale(dateToNote),
  x2: xScale(dateToNote),
  y1: yScale(-1),
  y2: yScale(0.8),
});

/* append text to dateLine */
const lineLabel = dateLineContainer
  .append('text')
  .at({
    x: xScale(dateToNote) - 25,
    y: yScale(0.8) - 6,
  })
  .text('March 7th')
  /*.tspans(
    [
      'Governor Cuomo signed',
      'the PAUSE to be effective',
      'at 8PM on Sunday, March 22',
    ],
    20,
  )*/
  //.attr('x', xScale(dateToNote) + 5);
//.text('Governor Cuomo signed the PAUSE to be effective at 8PM on Sunday, March 22.')

// add legend
const legendContainer = svg.append('g.legend');

const legend1 = legendContainer.append('line').attr('class', 'legend1').at({
  x1: 20,
  x2: 40,
  y1: 20,
  y2: 20,
});

const legend1Text = legendContainer
  .append('text')
  .attr('class', 'legend1')
  .at({
    x: 45,
    y: 25,
  })
  .text('percent change since September 5th');

const legend2 = legendContainer.append('line').attr('class', 'legend2').at({
  x1: 300,
  x2: 320,
  y1: 20,
  y2: 20,
});

const legend2Text = legendContainer
  .append('text')
  .attr('class', 'legend2')
  .at({
    x: 325,
    y: 25,
  })
  .text('7 day rolling mean');

const legend3 = legendContainer.append('line').at({
  x1: 20,
  x2: 40,
  y1: 20,
  y2: 20,
});

const legend3Text = legendContainer
  .append('text')
  .at({
    x: 45,
    y: 25,
  })
  .text('7 day rolling mean of percent remote postings per day');

/* scrolly stuffs */
function enterHandle({ index, direction }) {
  if (index === 0 && direction === 'down') {
    dateLine.classed('dateLine', true);
    lineLabel.classed('lineLabel', true);
  }

  if (index === 1 && direction === 'down') {
    linePath.classed('percentChange', false);
    meanPath.classed('rollingMean', false);
    legend1.classed('legend1', false);
    legend1Text.classed('legend1', false);
    legend2.classed('legend2', false);
    legend2Text.classed('legend2', false);
    legend3.classed('legend3', true);
    legend3Text.classed('legend3', true);
    drawRemoteGraph();
  }
}

function existHandle({ index, direction }) {
  if (index === 0 && direction === 'up') {
    dateLine.classed('dateLine', false);
    lineLabel.classed('lineLabel', false);
  }

  if (index === 1 && direction === 'up') {
    remotePath.classed('remotePostings', false);
    drawGraph();
    legend1.classed('legend1', true);
    legend1Text.classed('legend1', true);
    legend2.classed('legend2', true);
    legend2Text.classed('legend2', true);
    legend3.classed('legend3', false);
    legend3Text.classed('legend3', false);
  }
}

// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({ step: '#postings-scrolly .step' })
  .onStepEnter(enterHandle)
  .onStepExit(existHandle);

// setup resize event
window.addEventListener('resize', throttle(scroller.resize, 500));
