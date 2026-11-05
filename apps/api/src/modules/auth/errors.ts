export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function unauthenticated() {
  return new ApiError(401, 'SESSION_EXPIRED', 'Your session has ended. Sign in again.');
}
