// Custom error types (LSP-friendly: any of these can be caught/handled uniformly).
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message) { super(400, message); }
}

class ConflictError extends AppError {
  constructor(message) { super(409, message); }
}

class UnauthorizedError extends AppError {
  constructor(message) { super(401, message); }
}

module.exports = { AppError, ValidationError, ConflictError, UnauthorizedError };
