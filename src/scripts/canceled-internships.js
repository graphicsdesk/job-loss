import companies from '../../data/employer-industries.json';
import { select } from 'd3-selection';
import { scaleOrdinal } from 'd3-scale';
import { line } from 'd3-shape';
import { extent } from 'd3-array';
import { forceSimulation, forceCollide, forceX, forceY} from 'd3-force';
import 'd3-transition';


/* Data preprocessing */

const companyData = companies;

/* Some constants */

const WIDTH = 600;
const HEIGHT = 400;

/* Create the container and canvas */

const svg = select('#canceled-internships')
  .append('svg')
  .attr('width', WIDTH)
  .attr('height', HEIGHT)
  .append("g")
  .attr("transform", "translate(" + WIDTH/2 + "," + HEIGHT/2 + ")");

/* simulation force bubbles into a place and force them not to collide */
const simulation = forceSimulation()
  .force('x', forceX().strength(0.07))
  .force('y', forceY().strength(0.07))
  .force('collide', forceCollide(10));

/* industry color scale 
const industryColor = scaleOrdinal()
  .domain(companyData.industry)
  .range(["red", "blue"])
*/

/* Draw the shapes */
const circle = svg.selectAll('circle')
  .data(companyData)
  .enter()
  .append('circle')
    .attr('class','company')
    .attr('r',10)
    .attr('fill','orange'); 

/* feed data into simulation so for every change in time it moves it into a certain place(?)*/
simulation.nodes(companyData)
  .on('tick', ticked);

function ticked() {
  circle
    .attr('cx',function(d){
      return d.x
    })
    .attr('cy',function(d){
      return d.y
    })
}



