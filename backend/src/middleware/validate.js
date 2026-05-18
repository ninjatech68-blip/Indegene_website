export function validate(schema, source = 'body') {
  return function validateRequest(req, res, next) {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next({
        status: 400,
        expose: true,
        name: 'ValidationError',
        message: 'Request validation failed',
        details: parsed.error.flatten()
      });
    }

    req[source] = parsed.data;
    next();
  };
}
