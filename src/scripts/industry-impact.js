import throttle from 'just-throttle';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import { format } from 'd3-format';
import { extent } from 'd3-array';
import scrollHorizontally from './helpers/scroll-horizontally';

/* Some data preprocessing */

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

const width = barWidth * industryChanges.length;
let height;

const margin = { top: 10, bottom: 25 };

const svg = divContainer.append('svg').at({ width });
const container = svg.append('g').translate([0, margin.top]);
const barsContainer = container.append('g.bars-container');
const axis = container.append('g.y-axis');

const xScale = scaleBand()
  .domain(industryChanges.map(d => d.industry))
  .rangeRound([0, width])
  .paddingInner(0.04);
const yScale = scaleLinear().domain(
  extent(industryChanges, d => d.percentChange),
);

const percentFormat = format('.0%');
const axisFn = axisLeft(yScale)
  .tickFormat(percentFormat)
  .tickPadding(10)
  .tickSize(-width);

// Join bars to data
const bars = barsContainer
  .selectAll('bars')
  .data(industryChanges)
  // Everything that doesn't depend on the yScale can be done on enter
  .join(enter =>
    enter.append('g').call(g => {
      g.append('rect').at({
        x: d => xScale(d.industry),
        width: xScale.bandwidth(),
      });
      g.append('text.bar-label-name')
        .text(d => d.industry)
        .at({ x: d => xScale(d.industry) + barWidth / 2 });
      g.append('text.bar-label-percentage')
        .text(
          d => percentFormat(d.percentChange).replace('-', '–'), // Use en dash
        )
        .at({ x: d => xScale(d.industry) + barWidth / 2 });
    }),
  );

// Store nodes for easy indexing
const barsNodes = bars.nodes();

function updateGraph() {
  const svgHeight = window.innerHeight;
  height = svgHeight - margin.top - margin.bottom;
  svg.at({ height: svgHeight });

  // Update yScale and its dependencies
  yScale.rangeRound([height, 0]);
  axis.call(axisFn);

  // Update bar heights and positions
  bars.select('rect').at({
    y: d => Math.min(yScale(0), yScale(d.percentChange)),
    height: d => Math.abs(yScale(d.percentChange) - yScale(0)),
  });

  // Update label positions
  bars.select('text.bar-label-name').at({
    y: d => yScale(0) + (d.percentChange / Math.abs(d.percentChange)) * 15,
  });
  bars.select('text.bar-label-percentage').at({
    y: d =>
      yScale(d.percentChange) -
      (d.percentChange / Math.abs(d.percentChange)) * 15,
  });
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

function onScroll(scrollDistance, containerWidth) {
  highlightBar(Math.round(scrollDistance / barWidth));
  // if (scrollDistance > containerWidth / 2) {
  // axis.translate([ scrollDistance - containerWidth / 2 + 30, 0 ]);
  // }
}

// Initialization function
function init() {
  updateGraph();

  scrollHorizontally({
    container: divContainer,
    padding: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
    onScroll,
    exitLeft: () => highlightBar(0),
    exitRight: () => highlightBar(barsNodes.length - 1),
  });
}

init();

window.addEventListener('resize', throttle(updateGraph, 500));
