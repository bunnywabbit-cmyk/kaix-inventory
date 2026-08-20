// Screens are stored as "Screen #001" etc., but the word "Screen" is redundant
// almost everywhere it's displayed (e.g. on the Screen Rack page itself).
export function formatScreenNumber(value: string): string {
  return value.replace(/^Screen #/, '#')
}
