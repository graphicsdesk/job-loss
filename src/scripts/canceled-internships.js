import companies from '../../data/employer-industries.json';
import { select } from 'd3-selection';
import { scaleOrdinal, scaleSqrt } from 'd3-scale';
import { forceSimulation, forceCollide, forceX, forceY} from 'd3-force';
import { interpolateSpectral } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import 'd3-transition';


/* Data preprocessing */

const industrySet = new Set(companies.map(item => item.industry));
const industries =[...industrySet];
const totalIndustry = industries.length;

// Calculate proportions for each industry
// (# companies in industry / total # companies)
const industriesProps = companies.reduce((acc, { industry }) => {
  if (!(industry in acc)) acc[industry] = 0;
  acc[industry] += 1 / companies.length;
  return acc;
}, {});

// Make those proportions cumulative
let cumValue = 0;
const industriesPropsCum = {};
for (const industry in industriesProps) {
  const prop = industriesProps[industry];
  industriesPropsCum[industry] = (cumValue + prop / 2);
  cumValue += prop;
}

const companyData = companies
  .map(({ employer, industry, size }) => ({
    employer,
    industry,
    size: parseInt(size.replace(",","").split(" ")[0]),
    x: Math.cos((industries.indexOf(industry)) / totalIndustry * 2 * Math.PI) * 700 +  Math.random(),
    y: Math.sin((industries.indexOf(industry)) / totalIndustry * 2 * Math.PI) * 700 + Math.random()
  }));

/* Some constants */

const WIDTH = document.body.clientWidth;
const HEIGHT = document.body.clientHeight;

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
  .force('collide', forceCollide(function(d){
      return radiusScale(d.size)+0.5;
    }));

/* industry color scale */
function industryColorsScale(industry){
  const t = industries.indexOf(industry)/industries.length
  return interpolateSpectral(t)
};

/* radiusScale */

const radiusScale = scaleSqrt()
  .domain(extent(companyData, d => d.size))
  .range([2,37])

/* Draw the shapes */
const circle = svg.selectAll('circle')
  .data(companyData)
  .enter()
  .append('circle')
    .attr('class','company')
    .attr('r', function(d){
      return radiusScale(d.size);
    })
    .attr('fill',function(d){
      return industryColorsScale(d.industry);
    }); 

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

/* position function for x and y position of the bubble */

function xPosition(company) {
  const i = industries.indexOf(company.industry)
  const m = industries.length
  return Math.cos(i / m * 2 * Math.PI) * 200 +  Math.random()
}

function yPosition(company) {
  const i = industries.indexOf(company.industry)
  const m = industries.length
  return Math.sin(i / m * 2 * Math.PI) * 200 + Math.random()
}
