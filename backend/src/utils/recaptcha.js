import { env, isProduction } from '../config/env.js';

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalRuntime() {
  try {
    const appHost = new URL(env.APP_URL).hostname;
    const frontendHost = new URL(env.FRONTEND_URL).hostname;
    return isLocalHostname(appHost) && isLocalHostname(frontendHost);
  } catch (error) {
    return false;
  }
}

export async function verifyRecaptcha(token, remoteIp) {
  const localRuntime = isLocalRuntime();
  const recaptchaConfigured = Boolean(env.RECAPTCHA_SECRET && env.RECAPTCHA_SITE_KEY);

  if (!recaptchaConfigured) {
    if (isProduction && !localRuntime) {
      return {
        success: false,
        message: 'reCAPTCHA is not configured for production runtime'
      };
    }

    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, message: 'reCAPTCHA token missing' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: env.RECAPTCHA_SECRET,
        response: token,
        remoteip: remoteIp || ''
      })
    });

    const result = await response.json();
    return {
      success: Boolean(result.success),
      score: result.score,
      action: result.action,
      errors: result['error-codes'] || []
    };
  } catch (error) {
    if (isProduction && !localRuntime) {
      return {
        success: false,
        message: 'reCAPTCHA verification failed',
        errors: ['recaptcha-verification-failed']
      };
    }

    return { success: true, skipped: true };
  }
}
