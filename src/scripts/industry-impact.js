import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import { format } from 'd3-format';
import { extent } from 'd3-array';
import scrollHorizontally from './helpers/scroll-horizontally';

import { industryChanges as industryChangesRaw } from '../../data/postings.json';
const industryChanges = Object.keys(industryChangesRaw)
  .map(industry => ({
    industry,
    percentChange: industryChangesRaw[industry],
  }))
  .sort((a, b) => a.percentChange - b.percentChange);

/* Some constants and containers */

const barWidth = 40;

const container = select('#industry-impact-container');

const svg = container.append('svg');
const axis = svg.append('g.y-axis');
const barsContainer = svg.append('g.bars-container');

/* BarGraph class */

let width;
let height;

const xScale = scaleBand().domain(industryChanges.map(d => d.industry));
const yScale = scaleLinear().domain(
  extent(industryChanges, d => d.percentChange),
);
const axisFn = axisLeft(yScale).tickFormat(format('.0%'));

let bars;
let barsNodes;

function initGraph() {
  width = barWidth * industryChanges.length;
  height = window.innerHeight;
  svg.at({ width, height });

  xScale.rangeRound([0, width]).paddingInner(0.1);
  yScale.rangeRound([height, 0]);

  axis.call(axisFn);

  // Join bars to data
  bars = barsContainer
    .selectAll('bars')
    .data(industryChanges)
    .join(enter =>
      enter.append('g').call(s => {
        s.append('rect');
        s.append('text');
      }),
    );

  // Configure rectangles
  bars.select('rect').at({
    x: d => xScale(d.industry),
    y: d => Math.min(yScale(0), yScale(d.percentChange)),
    width: xScale.bandwidth(),
    height: d => Math.abs(yScale(d.percentChange) - yScale(0)),
  });

  // Configure text
  bars
    .select('text')
    .at({
      x: d => xScale(d.industry) + barWidth / 2,
      y: d => yScale(0) + (d.percentChange / Math.abs(d.percentChange)) * 15,
    })
    .text(d => d.industry);

  // Store nodes for easy indexing
  barsNodes = bars.nodes();
}

let highlightedBarIndex = null;
function highlightBar(index) {
  if (index < 0 || index >= barsNodes.length) {
    return;
  }
  const oldNode = barsNodes[highlightedBarIndex];
  const newNode = barsNodes[index];
  if (highlightedBarIndex !== index) {
    oldNode && oldNode.classList.remove('highlight-bar-group');
    newNode.classList.add('highlight-bar-group');
    highlightedBarIndex = index;
  }
}

function scrollCallback(scrollDistance, containerWidth) {
  highlightBar(Math.floor(scrollDistance / barWidth));
  // if (scrollDistance > containerWidth / 2) {
  // axis.translate([ scrollDistance - containerWidth / 2 + 30, 0 ]);
  // }
}

const exitLeft = () => highlightBar(0);
const exitRight = () => highlightBar(barsNodes.length - 1);

// Initialization function
function init() {
  initGraph();
  scrollHorizontally({
    container,
    padding: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
    scrollCallback,
    exitLeft,
    exitRight,
  });
}

init();
