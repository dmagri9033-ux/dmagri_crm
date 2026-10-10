import { after } from "next/server";

/**
 * Run work after the HTTP response is sent.
 * On Vercel this uses waitUntil so the task is not killed when the function returns
 * (unlike bare `void promise`, which often never finishes in serverless).
 */
export function afterResponse(task: () => unknown | Promise<unknown>): void {
  after(() => {
    void Promise.resolve()
      .then(task)
      .catch((error: unknown) => {
        console.error("afterResponse task failed:", error);
      });
  });
}
