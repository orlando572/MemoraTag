// Domain errors, mapped to HTTP statuses by the exception filter.
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ConflictError extends Error {}
