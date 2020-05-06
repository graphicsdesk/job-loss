import rawPostings from '../../data/postings.json';
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import 'd3-transition';



/* Data preprocessing */

const postings = rawPostings
  .map(({ date, count }) => ({
    date: new Date(date),
    count: count,
  }))
  .sort((a, b) => a.date-b.date);

const MARGIN = 50;

function drawGraph() {
  /* Some constants */

  const width = Math.min(600,document.body.clientWidth);
  const height = Math.min(400,document.body.clientHeight);
  const gWidth = width-MARGIN*2;
  const gHeight = height-MARGIN*2;

  /* Create the container and canvas */

  const svg = select('#postings-over-time')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append("g")
    .attr("transform", "translate(" + MARGIN + "," + MARGIN + ")");

  /* Somehow get a mapping from abstract data to coordinates on our canvas */

  // Scales
  const xScale = scaleTime()
    .domain(extent(postings, d => d.date))
    .range([0, gWidth]);
  const yScale = scaleLinear()
    .domain(extent(postings, d => d.count))
    .range([gHeight, 0]);

  // Function that generates the line drawing string
  const lineFn = line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.count));

  /* The Axis */

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + gHeight + ")")
      .call(axisBottom(xScale).ticks(gWidth/80));

  svg.append("g")
      .attr("class", "y axis")
      .call(axisLeft(yScale));

  // gridlines in x axis function
  function make_x_gridlines() {   
      return axisBottom(scaleTime().range([0, gWidth]))
          .ticks(8)
  }

  // gridlines in y axis function
  function make_y_gridlines() {   
      return axisLeft(scaleLinear().range([gHeight, 0]))
          .ticks(5)
  }

  // add the X gridlines
  svg.append("g")     
      .attr("class", "grid")
      .attr("transform", "translate(0," + gHeight + ")")
      .call(make_x_gridlines()
          .tickSize(-gHeight)
          .tickFormat("")
      )

  // add the Y gridlines
  svg.append("g")     
      .attr("class", "grid")
      .call(make_y_gridlines()
          .tickSize(-gWidth)
          .tickFormat("")
      )

  /* Draw the shapes */
  const linePath = svg.append('path')
    .attr('d', lineFn(postings));

  /* animation:
    1. get the length of the path*/
  const lineLength = linePath.node()
    .getTotalLength();

  /*
    2. set the dash array in the offset to the length*/
  linePath.style("stroke-dasharray",lineLength)
    .style("stroke-dashoffset",lineLength)
    .transition()
      .duration(3000)
      .style("stroke-dashoffset",0);

}

drawGraph();
//window.addEventListener('resize',drawGraph)
