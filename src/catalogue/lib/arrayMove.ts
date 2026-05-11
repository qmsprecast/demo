export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...arr];
  const next = [...arr];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) return next;
  next.splice(toIndex, 0, item);
  return next;
}
