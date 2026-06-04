/** Module-level bridge so api.ts can trigger maintenance UI without React imports. */

type MaintenanceListener = (message: string) => void;

let listener: MaintenanceListener | null = null;

export function subscribeMaintenanceMode(fn: MaintenanceListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function notifyMaintenanceMode(message: string): void {
  listener?.(message);
}
