type Settings = Record<string, unknown>;

function isMap(value: unknown): value is Settings {
  return !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

export function settingsChanges(before: Settings, after: Settings): Settings {
  const changes: Settings = {};
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (isMap(value) && isMap(previous)) {
      const nested = settingsChanges(previous, value);
      if (Object.keys(nested).length) changes[key] = nested;
    } else if (value !== undefined && JSON.stringify(value) !== JSON.stringify(previous)) {
      changes[key] = value;
    }
  }
  return changes;
}

export function mergeSettings(before: Settings, changes: Settings): Settings {
  const merged = { ...before };
  for (const [key, value] of Object.entries(changes)) {
    const previous = before[key];
    merged[key] = isMap(value) && isMap(previous) ? mergeSettings(previous, value) : value;
  }
  return merged;
}
