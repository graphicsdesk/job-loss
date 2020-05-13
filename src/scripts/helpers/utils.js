// Rotates a vector counterclockwise by theta radians
export function rotatePoint(coord, theta) {
  if (!Array.isArray(coord))
    coord = [coord.x, coord.y];
  const [x, y] = coord;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [x * cos + y * -sin, x * sin + y * cos];
}

// Rotates a vector clockwise by theta radians
export function inverseRotatePoint(coord, theta) {
  return rotatePoint(coord, -theta);
}

// Calculates centroid for an array of nodes
export function centroid(nodes) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const d of nodes) {
    let k = d.radius ** 2;
    x += d.x * k;
    y += d.y * k;
    z += k;
  }
  return { x: x / z, y: y / z };
}

// Calculates angle from 0 to 2π of a coordinate
export function calcAngle([x, y]) {
  return Math.atan(y / x) + (x < 0 && Math.PI);
}
