const stops = [
  { p: 0, yaw: -0.35, polar: 0.12, distanceScale: 1, targetHeight: 0 },
  { p: 0.25, yaw: 0.65, polar: 0.95, distanceScale: 1, targetHeight: 0 },
  { p: 0.52, yaw: 1.55, polar: 1.27, distanceScale: 0.76, targetHeight: 0.08 },
  { p: 0.76, yaw: 0, polar: 0.98, distanceScale: 0.68, targetHeight: 0.22 },
  { p: 1, yaw: 0.65, polar: 0.98, distanceScale: 1, targetHeight: 0 },
];
const smooth = (t) => t * t * (3 - 2 * t);
export function sampleJourney(value) {
  const progress = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const end = stops.findIndex((stop, index) => index > 0 && progress <= stop.p);
  const b = stops[end < 0 ? stops.length - 1 : end];
  const a = stops[Math.max(0, (end < 0 ? stops.length - 1 : end) - 1)];
  const t = smooth(Math.min(1, Math.max(0, (progress - a.p) / (b.p - a.p))));
  const result = {
    progress,
    tableOpacity: 1 - smooth(Math.min(1, progress / 0.18)),
    interactive: progress === 1,
  };
  for (const key of ["yaw", "polar", "distanceScale", "targetHeight"])
    result[key] = a[key] + (b[key] - a[key]) * t;
  return result;
}
