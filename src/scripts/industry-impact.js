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

function IndustryChart(divContainer, fullLength) {
  /* Some constants and containers */

  let barWidth, width;

  let height;

  const margin = { left: 0, top: 30, bottom: 25 };
  if (!fullLength) margin.left = 54;

  /* Initiation code */

  const svg = divContainer.append('svg.industry-impact-svg');
  const container = svg.append('g').translate([margin.left, margin.top]);
  const barsContainer = container.append('g.bars-container');
  const axis = container.append('g.y-axis');
  const barLabelsContainer = container.append('g.bar-labels-container');

  const xScale = scaleBand()
    .domain(industryChanges.map(d => d.industry))
    .paddingInner(0.04);
  const yScale = scaleLinear().domain(
    extent(industryChanges, d => d.percentChange),
  );

  const percentFormat = format('.0%');
  const axisFn = axisLeft(yScale).tickFormat(percentFormat).tickPadding(10);

  // Join bars to data
  const bars = barsContainer
    .selectAll('rect')
    .data(industryChanges)
    .join('rect');
  const barsLabels = barLabelsContainer
    .selectAll('g.bar-label')
    .data(industryChanges)
    .join(enter =>
      enter.append('g.bar-label').call(g => {
        const name = g.append('text');
        name.append('tspan.bar-label-name.background-tspan').text(d => d.industry);
        name.append('tspan.bar-label-name').text(d => d.industry);
        g.append('text.bar-label-percentage').text(
          d => percentFormat(d.percentChange).replace('-', '–'), // Use en dash
        );
      }),
    );

  // Store nodes for easy indexing
  const barsNodes = bars.nodes();
  const labelsNodes = barsLabels.nodes();

  this.updateGraph = function () {
    const svgWidth = fullLength
      ? 36 * industryChanges.length
      : Math.min(document.body.clientWidth - 40, 600);
    width = svgWidth - margin.left;
    const svgHeight = fullLength
      ? window.innerHeight
      : Math.max(300, (width * 2) / 3);
    height = svgHeight - margin.top - margin.bottom;

    if (
      svg.at('width') === svgWidth + '' &&
      svg.at('height') === svgHeight + ''
    )
      return;

    svg.at({ width: svgWidth, height: svgHeight });

    barWidth = width / industryChanges.length;

    // Update yScale and its dependencies
    xScale.range([0, width]);
    yScale.rangeRound([height, 0]);
    if (fullLength) axisFn.tickSize(-width);
    axis.call(axisFn);

    // Update bar heights and positions
    bars.at({
      x: d => xScale(d.industry),
      y: d => Math.min(yScale(0), yScale(d.percentChange)),
      width: xScale.bandwidth(),
      height: d => Math.abs(yScale(d.percentChange) - yScale(0)),
    });

    // Update label positions
    barsLabels.selectAll('tspan.bar-label-name').at({
      x: d => xScale(d.industry) + barWidth / 2,
      y: d => yScale(0) + (d.percentChange / Math.abs(d.percentChange)) * 15,
    });
    barsLabels.select('text.bar-label-percentage').at({
      x: d => xScale(d.industry) + barWidth / 2,
      y: d =>
        yScale(d.percentChange) -
        (d.percentChange / Math.abs(d.percentChange)) * 15,
    });
  };

  this.updateGraph();

  let highlightedBarIndex = null;
  this.highlightBar = function (index, forever) {
    if (index < 0 || index >= barsNodes.length) {
      return;
    }
    if (forever) {
      barsNodes[index].classList.add('bright-bar-forever');
    } else if (highlightedBarIndex !== index) {
      if (highlightedBarIndex !== null) {
        barsNodes[highlightedBarIndex].classList.remove('bright-bar');
        labelsNodes[highlightedBarIndex].classList.remove('bright-bar-label');
      }
      barsNodes[index].classList.add('bright-bar');
      labelsNodes[index].classList.add('bright-bar-label');
      highlightedBarIndex = index;
    }
  };

  this.highlightLastBar = () => this.highlightBar(barsNodes.length - 1);

  this.highlightIndustriesForever = industries => {
    industryChanges.forEach(({ industry }, i) => {
      if (industries.includes(industry)) this.highlightBar(i, true);
    });
  };

  // Horizontal scroll callback to highlight middle bar and stick axis
  this.onScroll = scrollDistance => {
    this.highlightBar(Math.round(scrollDistance / barWidth));
  };

  // Parses data-industries from paragraph blocks
  let paragraphs;

  function generateParagraphs() {
    return Array.from(document.querySelectorAll('#industry-content p'), p => ({
      node: p,
      industries: p.getAttribute('data-industries').split(/;\s?/),
    }));
  }

  this.positionText = function () {
    (paragraphs || (paragraphs = generateParagraphs())).forEach(
      ({ node, industries }) => {
        const xAvg = industries.reduce(
          (avg, industry) => avg + xScale(industry) / industries.length,
          0,
        );
        const pctAvg = industries.reduce(
          (avg, industry) =>
            avg + industryChangesRaw[industry] / industries.length,
          0,
        );
        node.style.left =
          Math.min(
            Math.max(xAvg - node.clientWidth / 2, 20),
            width - node.clientWidth - 20,
          ) + 'px';
        node.style.top = pctAvg < -0.2 ? yScale(0.45) : yScale(-0.3) + 'px';
        this.highlightIndustriesForever(industries);
      },
    );
  };

  // Used for smol version to highlight bars
  this.generateAndHighlightIndustries = () => {
    this.highlightIndustriesForever(
      divContainer.node().getAttribute('data-industries').split(/;\s?/),
    );
  };

  if (fullLength) {
    this.positionText();
  } else {
    this.generateAndHighlightIndustries();
  }
}

// Initialization function
function init() {
  const largeContainer = select('#industry-impact-container');
  const largeChart = new IndustryChart(largeContainer, true);

  scrollHorizontally({
    container: largeContainer,
    padding: 'industry-impact-padding',
    topDetectorId: 'detect-graphic-top',
    bottomDetectorId: 'detect-graphic-bottom',
    onScroll: largeChart.onScroll,
    exitLeft: () => largeChart.highlightBar(0),
    exitRight: () => largeChart.highlightLastBar(),
  });

  const smallChart = new IndustryChart(select('#smol-industry-impact'));

  window.addEventListener(
    'resize',
    throttle(() => {
      largeChart.updateGraph();
      smallChart.updateGraph();
    }, 500),
  );
}

init();
