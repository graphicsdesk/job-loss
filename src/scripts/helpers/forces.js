import { forceX, forceY } from 'd3-force';
import { quadtree } from 'd3-quadtree';
import { rollup, max } from 'd3-array';
import { centroid } from './utils';

/**
 * Utility functions for making forces quickly
 */

const STRENGTH = 0.02;
export const forceXFn = (x, strength = STRENGTH) =>
  forceX(x).strength(strength);
export const forceYFn = (y, strength = STRENGTH) =>
  forceY(y).strength(strength);

/**
 * This cluster force attracts each group of nodes towards its
 * weighted centroid.
 * Adapted from https://observablehq.com/@d3/clustered-bubbles
 */

export function cjClusterForce(centroidListener) {
  const strength = 0.1;
  let nodes;

  function force(alpha) {
    // Group nodes by industry, then invoke a value aggregator that calculates
    // each group's centroid
    const centroids = rollup(nodes, centroid, d => d.industry);

    // Allow other functions to listen in on centroid changes so centroids
    // don't need to be recomputed
    centroidListener(centroids);

    alpha *= strength;
    for (const d of nodes) {
      const { x: cx, y: cy } = centroids.get(d.industry);
      d.vx -= (d.x - cx) * alpha;
      d.vy -= (d.y - cy) * alpha;
    }
  }

  // force.initialize is passed the array of nodes.
  // https://github.com/d3/d3-force/blob/master/README.md#force_initialize
  force.initialize = _ => {
    nodes = _;
  };

  return force;
}

/**
 * This collision force prevents nodes from overlapping. It uses different
 * distances to separate nodes of the same group versus different groups.
 * Adapted from https://observablehq.com/@d3/clustered-bubbles
 */
export function elonMuskCollide() {
  const alpha = 0.4; // fixed for greater rigidity!
  const padding1 = 1; // separation between same-color nodes
  const padding2 = 17; // separation between different-color nodes
  let nodes;
  let maxRadius;

  let isGhosting; // boolean variable that tells us whether to ghost nodes of different classes

  function force() {
    // A quadtree recursively partitions 2D space into squares. Distinct points
    // are leaf nodes; conincident ones are linked lists.
    const theQuadtree = quadtree(
      nodes,
      d => d.x,
      d => d.y,
    );

    for (const node of nodes) {
      const r = node.radius + maxRadius;
      const nx1 = node.x - r,
        ny1 = node.y - r;
      const nx2 = node.x + r,
        ny2 = node.y + r;

      // Visit each node in the quadtree. q is the node. (x1, y1) and (x2, y2)
      // are the lower and upper bounds of the node.
      theQuadtree.visit((q, x1, y1, x2, y2) => {
        const { data: quadNode } = q;

        if (!q.length && quadNode !== node) { // if this is false, no computation is done
          // Calculate desired minimum distance and current distance
          const padding =
            node.industry === quadNode.industry ? padding1 : padding2;
          const minDistance = node.radius + quadNode.radius + padding;
          let dx = node.x - quadNode.x;
          let dy = node.y - quadNode.y;
          let distance = Math.hypot(dx, dy);

          // If current distance between the two nodes is less than the
          // desired distance (sums of radii + appropriate padding)...
          if (distance < minDistance) {
            distance = ((distance - minDistance) / distance) * alpha;
            dx *= distance;
            dy *= distance;
            node.x -= dx;
            node.y -= dy;
            quadNode.x += dx;
            quadNode.y += dy;
          }
        }
        // If this returns true, then q's children are not visited
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  // force.initialize is passed the array of nodes.
  // https://github.com/d3/d3-force/blob/master/README.md#force_initialize
  force.initialize = _ => {
    nodes = _;
    maxRadius = max(nodes, d => d.radius) + Math.max(padding1, padding2);
  };

  // Turn on or turn off the ghost state
  force.ghost = () => {

  };

  return force;
}
