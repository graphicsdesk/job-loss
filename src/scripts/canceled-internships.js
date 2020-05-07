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

/* radiusScale */

const radiusScale = scaleSqrt()
  .domain(extent(companyData, d => d.size))
  .range([2,37])
  
const companyData = companies
  .map(({ employer, industry, size }) => ({
    employer,
    industry,
    size: parseInt(size.replace(",","").split(" ")[0]),
    x: Math.cos((industries.indexOf(industry)) / totalIndustry * 2 * Math.PI) * 700 +  Math.random(),
    y: Math.sin((industries.indexOf(industry)) / totalIndustry * 2 * Math.PI) * 700 + Math.random(),
    r: radiusScale(size)
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

function ticked(e) {
  circle
    .each(cluster(10 * e.alpha * e.alpha))
    //.each(collide(.5))
    .attr('cx',function(d){
      return d.x
    })
    .attr('cy',function(d){
      return d.y
    })
}

// Move d to be adjacent to the cluster node.
function cluster(alpha) {
  return function(d) {
    var cluster = industries[d.industry];
    if (cluster === d) return;
    var x = d.x - cluster.x,
        y = d.y - cluster.y,
        l = Math.sqrt(x * x + y * y),
        r = d.radius + cluster.radius;
    if (l != r) {
      l = (l - r) / l * alpha;
      d.x -= x *= l;
      d.y -= y *= l;
      cluster.x += x;
      cluster.y += y;
    }
  };
}

