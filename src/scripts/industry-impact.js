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

const barWidth = 36;

const divContainer = select('#industry-impact-container');

/* Initiation code */

const svg = divContainer.append('svg');
const container = svg.append('g');
const barsContainer = container.append('g.bars-container');
const axis = container.append('g.y-axis');

const margin = { top: 10, bottom: 25 };

let width;
let height;

const xScale = scaleBand().domain(industryChanges.map(d => d.industry));
const yScale = scaleLinear().domain(
  extent(industryChanges, d => d.percentChange),
);
const axisFn = axisLeft(yScale).tickFormat(format('.0%')).tickPadding(10);

let bars;
let barsNodes;

function initGraph() {
  const svgHeight = window.innerHeight;
  height = svgHeight - margin.top - margin.bottom;
  width = barWidth * industryChanges.length;
  svg.at({ width, height: svgHeight });
  container.at({ width, height });

  container.translate([0, margin.top]);

  xScale.rangeRound([0, width]).paddingInner(0.04);
  yScale.rangeRound([height, 0]);

  axis.call(axisFn.tickSize(-width));

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
  highlightBar(Math.round(scrollDistance / barWidth));
  // if (scrollDistance > containerWidth / 2) {
  // axis.translate([ scrollDistance - containerWidth / 2 + 30, 0 ]);
  // }
}

// Initialization function
function init() {
  initGraph();
  scrollHorizontally({
    container: divContainer,
    padding: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
    scrollCallback,
    exitLeft: () => highlightBar(0),
    exitRight: () => highlightBar(barsNodes.length - 1),
  });
}

init();
