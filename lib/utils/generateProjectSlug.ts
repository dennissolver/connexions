// lib/utils/generateProjectSlug.ts

export function generateProjectSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
