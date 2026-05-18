import express, { Router } from 'express';

const router = Router();
router.use(express.json({
  type: ['application/csp-report', 'application/reports+json', 'application/json']
}));

router.post('/csp-report', (req, res) => {
  const payload = req.body?.['csp-report'] || req.body || {};
  const blockedUri = payload['blocked-uri'] || payload.blockedURI || 'unknown';
  const violatedDirective = payload['violated-directive'] || payload.violatedDirective || 'unknown';
  const sourceFile = payload['source-file'] || payload.sourceFile || '';
  const lineNumber = payload['line-number'] || payload.lineNumber || '';

  // Keep log compact and structured for ingestion.
  console.warn(
    `[CSP-REPORT] blocked="${blockedUri}" violated="${violatedDirective}" source="${sourceFile}" line="${lineNumber}"`
  );
  res.status(204).end();
});

export default router;
