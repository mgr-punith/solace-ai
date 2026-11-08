export function homeGreeting(hour: number) {
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name?: string) {
  const first = name?.trim().split(/\s+/)[0];
  if (!first) return 'there';
  // Normalize all-caps Google names, preserving intentionally mixed-case names.
  return first === first.toLocaleUpperCase()
    ? first.charAt(0) + first.slice(1).toLocaleLowerCase()
    : first;
}
