import { clamp, mod, random, round, wrapNumber } from "./mathUtils.js";

export type VecLike = { x: number; y: number } | [number, number] | number;

function normVecLike(vec: VecLike): { x: number; y: number } {
  if (typeof vec === "number") return { x: vec, y: vec };
  if (Array.isArray(vec)) return { x: vec[0], y: vec[1] };
  return { x: vec.x, y: vec.y };
}

export class Vector2 {
  public readonly x: number;
  public readonly y: number;

  constructor(...args: [VecLike] | [number, number]) {
    if (args[0] instanceof Object) {
      if ("x" in args[0]) {
        this.x = args[0].x;
        this.y = args[0].y;
      } else {
        this.x = args[0][0];
        this.y = args[0][1];
      }
      return;
    }

    this.x = args[0];
    this.y = args[1] ?? args[0];
  }

  static up = new Vector2(0, -1);
  static down = new Vector2(0, 1);
  static left = new Vector2(-1, 0);
  static right = new Vector2(1, 0);

  get minX(): number {
    return this.x;
  }
  get minY(): number {
    return this.y;
  }
  get maxX(): number {
    return this.x;
  }
  get maxY(): number {
    return this.y;
  }

  get yx(): Vector2 {
    return new Vector2(this.y, this.x);
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude,
    );
  }

  static random(): Vector2 {
    return new Vector2(Math.random(), Math.random());
  }

  static randomDirection(): Vector2 {
    const angle = Math.random() * 2 * Math.PI;
    return Vector2.fromAngle(angle);
  }

  static randomRange(min: number, max: number): Vector2 {
    return new Vector2(
      random(min, max),
      random(min, max)
    );
  }

  add(other: VecLike): Vector2 {
    const o = normVecLike(other);
    return new Vector2(this.x + o.x, this.y + o.y);
  }

  sub(other: VecLike): Vector2 {
    const o = normVecLike(other);
    return new Vector2(this.x - o.x, this.y - o.y);
  }

  mult(x: number | VecLike, y?: number): Vector2 {
    if (typeof x === "object") {
      const o = normVecLike(x);
      return new Vector2(this.x * o.x, this.y * o.y);
    }
    return new Vector2(this.x * x, this.y * (y ?? x));
  }

  div(x: number | VecLike, y?: number): Vector2 {
    if (typeof x === "object") {
      const o = normVecLike(x);
      return new Vector2(this.x / o.x, this.y / o.y);
    }
    return new Vector2(this.x / x, this.y / (y ?? x));
  }

  mod(other: VecLike): Vector2 {
    const o = normVecLike(other);
    return new Vector2(mod(this.x, o.x), mod(this.y, o.y));
  }

  wrap(min: VecLike, max: VecLike): Vector2;
  wrap(minX: number, maxX: number, minY: number, maxY: number): Vector2;
  wrap(...args:
      [VecLike, VecLike] |
      [number, number, number, number]
  ) : Vector2 {
    if (args.length === 2) {
      const [min, max] = args;
      const minV = normVecLike(min);
      const maxV = normVecLike(max);
      return new Vector2(
        wrapNumber(this.x, minV.x, maxV.x),
        wrapNumber(this.y, minV.y, maxV.y)
      );
    } else if (args.length === 4) {
      const [minX, maxX, minY, maxY] = args;
      return new Vector2(
        wrapNumber(this.x, minX, maxX),
        wrapNumber(this.y, minY, maxY)
      );
    }
    throw new Error("Invalid arguments for wrap");
  }

  directionTo(other: VecLike): Vector2 {
    return new Vector2(other).sub(this).normalize();
  }

  angleBetween(other: VecLike, center?: VecLike): number {
    if (center) {
      return this.sub(center).angleBetween(new Vector2(other).sub(center));
    }
    // due to floating point errors, the dot product can sometimes be slightly
    // outside the range of [-1, 1], so we clamp it
    const dot = clamp(
      this.dot(other) / (this.length() * new Vector2(other).length()),
      -1,
      1,
    );
    const angle = Math.acos(dot);
    const cross = this.cross(other);
    return cross < 0 ? -angle : angle;
  }

  isNaN(): boolean {
    return isNaN(this.x) || isNaN(this.y);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  setLength(length: number): Vector2 {
    return this.normalize().mult(length);
  }

  growBy(amount: number): Vector2 {
    return this.setLength(this.length() + amount);
  }

  lenSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const length = this.length();
    return new Vector2(this.x / length, this.y / length);
  }

  dot(other: VecLike): number {
    const o = normVecLike(other);
    return this.x * o.x + this.y * o.y;
  }

  rotate(rotation: number): Vector2 {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  cw90(): Vector2 {
    return new Vector2(this.y, -this.x);
  }

  ccw90(): Vector2 {
    return new Vector2(-this.y, this.x);
  }

  cw180(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  rot90(amount: 0 | 90 | 180 | 270): Vector2 {
    switch (amount) {
      case 0:
        return this;
      case 90:
        return this.cw90();
      case 180:
        return this.cw180();
      case 270:
        return this.ccw90();
      default:
        throw new Error("Rotation must be 0, 90, 180, or 270. Got " + amount);
    }
  }

  maxLength(max: number): Vector2 {
    if (this.lenSq() <= max * max) return this;
    return this.setLength(max);
  }

  minLength(min: number): Vector2 {
    if (this.lenSq() >= min * min) return this;
    return this.setLength(min);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  dist(other: VecLike): number {
    return this.sub(other).length();
  }

  distSq(other: VecLike): number {
    return this.sub(other).lenSq();
  }

  cross(other: VecLike): number {
    const o = normVecLike(other);
    return this.x * o.y - this.y * o.x;
  }

  isPerpendicular(other: Vector2): boolean {
    return this.dot(other) === 0;
  }

  isParallel(other: VecLike): boolean {
    return this.cross(other) === 0;
  }

  angleTo(other: VecLike): number {
    return new Vector2(other).sub(this).angle();
  }

  lerp(other: VecLike, amount: number): Vector2 {
    return this.add(new Vector2(other).sub(this).mult(amount));
  }

  avg(other: Vector2) {
    return this.add(other).mult(0.5);
  }

  swap(): Vector2 {
    return new Vector2(this.y, this.x);
  }

  abs(): Vector2 {
    return new Vector2(Math.abs(this.x), Math.abs(this.y));
  }

  sign(): Vector2 {
    return new Vector2(Math.sign(this.x), Math.sign(this.y));
  }

  round(x: number | Vector2 = 1, y?: number): Vector2 {
    if (x instanceof Vector2) {
      return new Vector2(round(this.x, x.x), round(this.y, x.y));
    }
    return new Vector2(round(this.x, x), round(this.y, y ?? x));
  }

  floor(): Vector2 {
    return new Vector2(Math.floor(this.x), Math.floor(this.y));
  }

  ceil(): Vector2 {
    return new Vector2(Math.ceil(this.x), Math.ceil(this.y));
  }

  min(other: VecLike): Vector2 {
    const o = normVecLike(other);
    return new Vector2(Math.min(this.x, o.x), Math.min(this.y, o.y));
  }

  max(other: VecLike): Vector2 {
    const o = normVecLike(other);
    return new Vector2(Math.max(this.x, o.x), Math.max(this.y, o.y));
  }

  clamp(min: VecLike, max: VecLike): Vector2 {
    return this.min(max).max(min);
  }

  clampLength(min: number, max: number): Vector2 {
    return this.maxLength(max).minLength(min);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  equals(other: Vector2 | null): boolean {
    if (!other) return false;
    return this.x === other.x && this.y === other.y;
  }

  get a(): [number, number] {
    return [this.x, this.y];
  }

  get wh(): { width: number; height: number } {
    return { width: this.x, height: this.y };
  }

  get s(): string {
    return `${this.x},${this.y}`;
  }

  // svg path commands
  get M(): string {
    return `M${this.s}`;
  }

  get L(): string {
    return `L${this.s}`;
  }

  ML(vec: Vector2): string {
    return `${this.M}${vec.L}`;
  }
}

const PI = Math.PI;
const TWO_PI = Math.PI * 2;

/**
 * Determines if a point A is on the same half-plane as point B  with respect
 * to the line defined by points C and D
 */
export function sameHalfPlane(
  a: Vector2,
  b: Vector2,
  c: Vector2,
  d: Vector2,
): boolean {
  const cross1 = c.sub(d).cross(a.sub(d));
  const cross2 = c.sub(d).cross(b.sub(d));

  return cross1 * cross2 > 0;
}

/**
 * Constrain the vector to be at a certain range of the anchor
 */
export function constrainDistance(
  pos: Vector2,
  anchor: Vector2,
  constraint: number,
): Vector2 {
  return anchor.add(pos.sub(anchor).setLength(constraint));
}

/**
 * Constrain two vectors to be at a certain range from each other
 *
 * Makes sure the amount it changes is equal for both vectors
 */
export function constrainDistanceBoth(
  a: Vector2,
  b: Vector2,
  constraint: number,
): [vecA: Vector2, vecB: Vector2] {
  const avg = a.add(b).mult(0.5);
  const vecA = a.sub(avg).setLength(constraint / 2);
  const vecB = b.sub(avg).setLength(constraint / 2);
  return [vecA.add(avg), vecB.add(avg)];
}

/**
 * Constrain the angle to be within a certain range of the anchor
 */
export function constrainAngle(
  angle: number,
  anchor: number,
  constraint: number,
) {
  if (Math.abs(relativeAngleDiff(angle, anchor)) <= constraint) {
    return simplifyAngle(angle);
  }

  if (relativeAngleDiff(angle, anchor) > constraint) {
    return simplifyAngle(anchor - constraint);
  }

  return simplifyAngle(anchor + constraint);
}

/**
 * i.e. How many radians do you need to turn the angle to match the anchor?
 */
export function relativeAngleDiff(angle: number, anchor: number) {
  // Since angles are represented by values in [0, 2pi), it's helpful to rotate
  // the coordinate space such that PI is at the anchor. That way we don't have
  // to worry about the "seam" between 0 and 2pi.
  angle = simplifyAngle(angle + PI - anchor);
  anchor = PI;

  return anchor - angle;
}

/**
 * Simplify the angle to be in the range [0, 2pi)
 */
export function simplifyAngle(angle: number) {
  while (angle >= TWO_PI) {
    angle -= TWO_PI;
  }

  while (angle < 0) {
    angle += TWO_PI;
  }

  return angle;
}

/**
 * Given two points along a circle with a center and radius, find the midpoint
 * of the shortest arc between the two points
 * @param a The first point
 * @param b The second point
 * @param center The center of the circle
 * @param radius The radius of the circle
 * @returns The midpoint of the shortest arc between the two points
 */
export function midpointShortestArc(
  a: Vector2,
  b: Vector2,
  center: Vector2,
  radius: number,
): Vector2 {
  return center.add(a.avg(b).sub(center).setLength(radius));
}
