/** Normalize a ?as= value: default to the founder, and keep old ?as=maya links working. */
export function viewerId(id: string | null | undefined): string {
  if (!id || id === 'maya') return 'kason';
  return id;
}
