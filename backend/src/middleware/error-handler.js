export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
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
