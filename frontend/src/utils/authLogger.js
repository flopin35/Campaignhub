const PREFIX = {
  auth: '[AUTH]',
  otp: '[OTP]',
  session: '[SESSION]',
  google: '[GOOGLE_LOGIN]',
  recovery: '[RECOVERY]',
};

function log(tag, message, data) {
  if (import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === 'true') {
    if (data !== undefined) console.info(tag, message, data);
    else console.info(tag, message);
  }
}

export const authLog = {
  info: (msg, data) => log(PREFIX.auth, msg, data),
  otp: (msg, data) => log(PREFIX.otp, msg, data),
  session: (msg, data) => log(PREFIX.session, msg, data),
  google: (msg, data) => log(PREFIX.google, msg, data),
  recovery: (msg, data) => log(PREFIX.recovery, msg, data),
  warn: (msg, data) => console.warn(PREFIX.auth, msg, data),
  error: (msg, data) => console.error(PREFIX.auth, msg, data),
};
