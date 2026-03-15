export function hashQuestion(q: string): string {
  let hash = 5381;
  for (let i = 0; i < q.length; i++) {
    hash = ((hash << 5) + hash) + q.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
