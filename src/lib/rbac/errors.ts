export class UnauthorizedError extends Error {
  constructor(message = "UNAUTHORIZED") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function toActionError(error: unknown): { error: string } {
  if (error instanceof UnauthorizedError) {
    return { error: "You must be signed in." };
  }
  if (error instanceof ForbiddenError) {
    return { error: "You do not have permission to perform this action." };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: "Something went wrong." };
}
