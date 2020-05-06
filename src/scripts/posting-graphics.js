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
console.log(postings);

/* Some constants */

const WIDTH = 600;
const HEIGHT = 400;
const MARGIN = 50;

/* Create the container and canvas */

const svg = select('#postings-over-time')
  .append('svg')
  .attr('width', WIDTH+MARGIN*2)
  .attr('height', HEIGHT+MARGIN*2)
  .append("g")
  .attr("transform", "translate(" + MARGIN + "," + MARGIN + ")");

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

/* The Axis */

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + HEIGHT + ")")
    .call(axisBottom(xScale));

svg.append("g")
    .attr("class", "y axis")
    .call(axisLeft(yScale));

// gridlines in x axis function
function make_x_gridlines() {   
    return axisBottom(scaleTime().range([0, WIDTH]))
        .ticks(8)
}

// gridlines in y axis function
function make_y_gridlines() {   
    return axisLeft(scaleLinear().range([HEIGHT, 0]))
        .ticks(5)
}

// add the X gridlines
svg.append("g")     
    .attr("class", "grid")
    .attr("transform", "translate(0," + HEIGHT + ")")
    .call(make_x_gridlines()
        .tickSize(-HEIGHT)
        .tickFormat("")
    )

// add the Y gridlines
svg.append("g")     
    .attr("class", "grid")
    .call(make_y_gridlines()
        .tickSize(-WIDTH)
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

/*
  3. animate the dash offset back to 0. 
*/
