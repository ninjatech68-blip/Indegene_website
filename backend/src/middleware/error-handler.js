export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Map common Prisma errors to safe, stable client responses.
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.join(', ') : target;
    return res.status(409).json({
      error: 'Conflict',
      message: fields
        ? `A record with that value already exists (${fields}).`
        : 'A record with that value already exists.'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Record not found.'
    });
  }

  const status = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : 'Something went wrong';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: err.name || 'ServerError',
    message,
    details: err.details || undefined
  });
}
