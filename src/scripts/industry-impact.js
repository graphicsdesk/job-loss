import throttle from 'just-throttle';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import { format } from 'd3-format';
import wordwrap from 'd3-jetpack/src/wordwrap';

import { industryColorsScale } from './canceled-internships';
import scrollHorizontally from './helpers/scroll-horizontally';

/* Some data preprocessing */

import { industryChanges as industryChangesRaw } from '../../data/postings.json';
const industryChanges = Object.keys(industryChangesRaw)
  .map(industry => ({
    industry,
    percentChange: industryChangesRaw[industry],
  }))
  .sort((a, b) => a.percentChange - b.percentChange);

function colorScale(industry) {
  return (
    industryColorsScale(industry) ||
    (industry === 'Restaurants & Food Service' ? '#2AAF7F' : '#297B8E')
  );
}

function IndustryChart(divContainer, fullLength) {
  /* Some constants and containers */

  let barWidth, width;

  let height;

  const margin = { left: 0, top: 50, bottom: 45 };
  if (!fullLength) margin.left = 54;

  /* Initiation code */

  const svg = divContainer.append('svg.industry-impact-svg');
  const container = svg.append('g').translate([margin.left, margin.top]);

  const barsContainer = container.append('g.bars-container');
  const axis = container.append('g.y-axis');

  const barLabelsContainer = container.append('g.bar-labels-container');
  const barHighlightersContainer = container.append(
    'g.bar-highlighters-container',
  );

  const xScale = scaleBand().domain(industryChanges.map(d => d.industry));
  const min = Math.min(...industryChanges.map(d => d.percentChange));
  const yScale = scaleLinear().domain([min, -min]);

  const percentFormat = format('.0%');
  const axisFn = axisLeft(yScale).tickFormat(percentFormat).tickPadding(10);

  // Join bars to data

  const bars = barsContainer
    .selectAll('rect')
    .data(industryChanges)
    .join('rect')
    .attr('fill', d => colorScale(d.industry));

  const barHighlighters = barHighlightersContainer
    .selectAll('rect')
    .data(industryChanges)
    .join('rect');

  const barsLabels = barLabelsContainer
    .selectAll('g.bar-label')
    .data(industryChanges)
    .join(enter =>
      enter.append('g.bar-label').call(g => {
        const name = g.append('text');
        name
          .append('tspan.bar-label-name.background-tspan')
          .text(d => d.industry);
        name.append('tspan.bar-label-name').text(d => d.industry);
        g.append('text.bar-label-percentage').text(
          d => percentFormat(d.percentChange).replace('-', '–'), // Use en dash
        );
      }),
    );

  // Store nodes for easy indexing
  const barsNodes = bars.nodes();
  const barHighlightersNodes = barHighlighters.nodes();
  const labelsNodes = barsLabels.nodes();

  // Store axis ticks nodes so we can fake horizontal sticky positioning
  let axisTexts;

  this.updateGraph = function () {
    const svgWidth = fullLength
      ? 38 * industryChanges.length
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

    // Update scales
    xScale.range([0, width]);
    yScale.rangeRound([height, 0]);

    // Update axes
    if (fullLength) axisFn.tickSize(-width);
    axis.call(axisFn);
    if (!axisTexts) axisTexts = axis.node().querySelectorAll('text');

    // Update bar heights and positions
    const barAttrs = {
      x: d => xScale(d.industry),
      y: d => Math.min(yScale(0), yScale(d.percentChange)),
      width: xScale.bandwidth(),
      height: d => Math.abs(yScale(d.percentChange) - yScale(0)),
    };
    bars.at(barAttrs);
    barHighlighters.at(barAttrs);

    // Update label positions
    const getLabelX = d => xScale(d.industry) + barWidth / 2;
    barsLabels.selectAll('tspan.bar-label-name').at({
      x: getLabelX,
      y: d => yScale(0) + (d.percentChange / Math.abs(d.percentChange)) * 15,
    });
    barsLabels.select('text.bar-label-percentage').at({
      x: getLabelX,
      y: d =>
        yScale(d.percentChange) -
        (d.percentChange / Math.abs(d.percentChange)) * 15,
    });
  };

  this.updateGraph();

  let highlightedIndex = null;
  this.highlightBar = function (index, forever) {
    if (index < 0 || index >= barsNodes.length) {
      return;
    }
    if (forever) {
      barsNodes[index].style.fillOpacity = 1;
      labelsNodes[index].classList.add('always-bright');
    } else if (highlightedIndex !== index) {
      if (highlightedIndex !== null) {
        barHighlightersNodes[highlightedIndex].classList.remove('bright');
        labelsNodes[highlightedIndex].classList.remove('bright');
      }
      barHighlightersNodes[index].classList.add('bright');
      labelsNodes[index].classList.add('bright');
      highlightedIndex = index;
    }
  };

  this.highlightLastBar = () => this.highlightBar(barsNodes.length - 1);

  this.highlightIndustriesForever = industries => {
    industryChanges.forEach(({ industry }, i) => {
      if (industries.includes(industry)) {
        this.highlightBar(i, true);
      }
    });
  };

  let isSmall = document.body.clientWidth < 500;

  const titleText = divContainer.node().getAttribute('data-title');
  let title;
  if (titleText) {
    title = container
      .append('text.chart-title')
      .at({ y: yScale(0.8) })
      .tspansBackgrounds(
        wordwrap(titleText, isSmall ? 30 : titleText.length),
        24,
      );
    title.selectAll('tspan').at({ x: 0 });
  }

  // Horizontal scroll callback to highlight middle bar and stick axis
  let justTranslated = false;
  this.onScroll = (scrollDistance, maxScroll) => {
    this.highlightBar(Math.round(scrollDistance / barWidth));
    const x =
      Math.min(maxScroll, scrollDistance) -
      window.innerWidth / 2 +
      (isSmall ? 42 : 50);
    if (x > 0) {
      const transform = `translate(${x}px, 0)`;
      axisTexts.forEach(text => (text.style.transform = transform));
      title && title.st({ transform });
      justTranslated = true;
    } else if (justTranslated) {
      const transform = '';
      axisTexts.forEach(text => (text.style.transform = transform));
      title && title.st({ transform });
      justTranslated = false;
    }
  };

  // Parses data-industries from paragraph blocks
  let paragraphs;

  const generateParagraphs = () => {
    return Array.from(document.querySelectorAll('#industry-content p'), p => {
      const industries = p.getAttribute('data-industries').split(/;\s?/);
      this.highlightIndustriesForever(industries);

      // Terms to highlight
      const terms = p.querySelectorAll('j');
      terms.forEach((t, i) => {
        const color = colorScale(industries[i]);
        t.classList.add('padding-highlight');
        t.style.color = color;
      });

      return {
        node: p,
        industries,
      };
    });
  };

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
        node.style.top = (pctAvg < -0.2 ? yScale(0.5) : yScale(-0.3)) + 'px';
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

// Initialization function to be called in page.js
export function init() {
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

  // const smallChart = new IndustryChart(select('#smol-industry-impact'));

  window.addEventListener(
    'resize',
    throttle(() => {
      largeChart.updateGraph();
      // smallChart.updateGraph();
    }, 500),
  );
}
