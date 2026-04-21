export function buildPageNumbers(page: number, total: number): number[] {
  const start = Math.max(1, page - 2)
  const end = Math.min(total, start + 4)
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}
