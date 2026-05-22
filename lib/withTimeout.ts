/**
 * Rechaza si la promesa no resuelve dentro de `ms` milisegundos.
 * El error lleva `name === "TimeoutError"` y `label` para logs.
 */
export class TimeoutError extends Error {
  label: string;

  constructor(label: string, ms: number) {
    super(`timeout:${label}:${ms}`);
    this.name = "TimeoutError";
    this.label = label;
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(label, ms));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
