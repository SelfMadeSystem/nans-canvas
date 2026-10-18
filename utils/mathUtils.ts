/**
 * Most of these functions were taken from:
 *
 * https://github.com/SelfMadeSystem/Portfolio/blob/main/src/utils/MathUtils.ts
 *
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */

export const EPSILON = 1e-6;

/**
 * Modulo function that always returns a positive number
 * @param a The number to be modulated
 * @param n The number to modulate by
 * @returns The modulated number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * The same as Math.random() but with a min and max
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between a min and max
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random integer
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

/**
 * Produces a random number between a min and max with a logarithmic distribution
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The random number with a logarithmic distribution
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomLog(min: number, max: number): number {
  return Math.pow(Math.random(), 2) * (max - min) + min;
}

/**
 * Returns true or false randomly, depending on the probability
 * @param probability The probability of returning true
 * @returns True or false randomly, depending on the probability
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * Returns a random ID with a given length
 * @param length The length of the ID
 * @returns The random ID with the given length
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-27
 */
export function randomId(length = 8): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

/**
 * Rounds a number to a given amount.
 * @param num The number to round
 * @param amount The amount to round to
 * @returns The rounded number to the given amount
 */
export function round(num: number, amount = 1): number {
  return Math.round(num / amount) * amount;
}

/**
 * Loops a number between a min and max
 * @param at The number to loop
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The looped number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function wrapNumber(at: number, min: number, max: number): number {
  return mod(at - min, max - min) + min;
}

/**
 * Wraps an angle between -180 and 180
 * @param angle The angle to wrap
 * @returns The wrapped angle between -180 and 180
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function wrapAngle(angle: number): number {
  return wrapNumber(angle, -180, 180);
}

/**
 * Wraps an angle between 0 and 2 * PI
 */
export function wrapAngle2PI(angle: number): number {
  return wrapNumber(angle, 0, 2 * Math.PI);
}

/**
 * Wraps an angle between -PI and PI
 */
export function wrapAnglePI(angle: number): number {
  return wrapNumber(angle, -Math.PI, Math.PI);
}

export function angleDelta(angle1: number, angle2: number): number {
  let delta = angle2 - angle1;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  return delta;
}

/**
 * Calculates the average of a list of angles in the range [0, 2 * PI]
 * @param angles The list of angles to average
 * @returns The average angle in the range [0, 2 * PI]
 * @author SelfMadeSystem (Shoghi Simon) 2025-02-27
 */
export function averageAngle(angles: number[]): number {
  if (angles.length === 0) {
    return 0;
  }
  if (angles.length === 1) {
    return angles[0]!;
  }
  if (angles.length === 2) {
    const a1 = angles[0]!;
    const a2 = angles[1]!;

    if (isParallel(a1, a2)) {
      // If the angles are parallel, return max angle + PI / 2. We do this
      // because the average of two parallel angles is not well defined and
      // becomes unstable when the angles are close to each other or close to
      // 180 degrees apart.
      return wrapAngle2PI(Math.max(a1, a2) + Math.PI / 2);
    }
  }
  let x = 0;
  let y = 0;

  for (const angle of angles) {
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  const avgAngle = Math.atan2(y, x);
  return avgAngle < 0 ? avgAngle + 2 * Math.PI : avgAngle;
}

/**
 * Determines if two angles are parallel. This is the case if the difference
 * between the angles is 0 or PI
 * @param angle1 The first angle
 * @param angle2 The second angle
 */
export function isParallel(angle1: number, angle2: number): boolean {
  const delta = Math.abs(angleDelta(angle1, angle2));
  return approxEquals(delta, 0) || approxEquals(delta, Math.PI);
}

/**
 * Clamps a number between a min and max
 * @param at The number to clamp
 * @param min The minimum number to return
 * @param max The maximum number to return
 * @returns The clamped number
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-07
 */
export function clamp(at: number, min: number, max: number): number {
  return Math.min(Math.max(at, min), max);
}

/**
 * Linearly interpolates between two numbers
 * @param a The first number
 * @param b The second number
 * @param t The interpolation value
 * @returns The interpolated number between a and b at t
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-08
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation between two numbers
 * @param a The first number
 * @param b The second number
 * @param value The value to interpolate
 * @returns The interpolation factor between 0 and 1
 * @author SelfMadeSystem (Shoghi Simon) 2026-10-18
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a !== b) {
    return (value - a) / (b - a);
  }
  return 0;
}

/**
 * Maps a number from one range to another
 * @param value The number to map
 * @param inMin The minimum of the input range
 * @param inMax The maximum of the input range
 * @param outMin The minimum of the output range
 * @param outMax The maximum of the output range
 * @returns The mapped number
 * @author SelfMadeSystem (Shoghi Simon) 2026-10-18
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Smoothly interpolates between two numbers using a given factor
 * @param a The first number
 * @param b The second number
 * @param factor The interpolation factor between 0 and 1
 * @returns The interpolated number
 * @author SelfMadeSystem (Shoghi Simon) 2026-10-18
 */
export function smoothStep(a: number, b: number, factor: number): number {
  const t = clamp(factor, 0, 1);
  return lerp(a, b, t * t * (3 - 2 * t));
}

/**
 * Greater common divisor of two numbers using iteration
 * @param a The first number
 * @param b The second number
 * @returns The greater common divisor of a and b
 */
export function gcd(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Approx equals function for numbers
 */
export function approxEquals(a: number, b: number, epsilon = EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Ceil function that rounds to the next multiple of a number
 */
export function ceilMultiple(a: number, multiple: number): number {
  return Math.ceil(a / multiple) * multiple;
}

/**
 * Determines if an element is in view.
 * @param element The element to check
 * @param dist The distance from the edge of the screen to check
 * @returns True if the element is in view, false otherwise
 * @author SelfMadeSystem (Shoghi Simon) 2024-11-09
 */
export function isInView(element: HTMLElement, dist = 0): boolean {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  const width = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.bottom >= -dist &&
    rect.right >= -dist &&
    rect.top <= height + dist &&
    rect.left <= width + dist
  );
}
