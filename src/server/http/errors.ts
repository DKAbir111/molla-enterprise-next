/**
 * HTTP errors, and the JSON body they serialise to.
 *
 * The response shape is deliberately identical to what NestJS produced —
 * `{ statusCode, message, error }` — because the frontend already reads
 * `error.response.data.message` in a dozen places. Keeping the contract byte
 * for byte means the client code does not have to change with the server.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field-level detail, used by validation failures. */
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', details?: unknown) {
    super(400, message, details)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message)
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message)
  }
}

/** The standard reason phrase for a status, used as the `error` field. */
const REASONS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
}

export function errorBody(status: number, message: string | string[], details?: unknown) {
  return {
    statusCode: status,
    message,
    error: REASONS[status] ?? 'Error',
    ...(details ? { details } : {}),
  }
}
