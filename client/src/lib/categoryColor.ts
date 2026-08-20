const PALETTE = [
  { dot: "bg-sky-400", solid: "bg-sky-500" },
  { dot: "bg-violet-400", solid: "bg-violet-500" },
  { dot: "bg-emerald-400", solid: "bg-emerald-500" },
  { dot: "bg-amber-400", solid: "bg-amber-500" },
  { dot: "bg-rose-400", solid: "bg-rose-500" },
  { dot: "bg-teal-400", solid: "bg-teal-500" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function categoryColor(name: string) {
  return PALETTE[hashString(name) % PALETTE.length]!;
}
