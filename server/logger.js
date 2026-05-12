const levels = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger({ level = 'info' } = {}) {
  const threshold = levels[level] || levels.info;
  function write(logLevel, message, meta = {}) {
    if ((levels[logLevel] || levels.info) < threshold) return;
    const entry = {
      at: new Date().toISOString(),
      level: logLevel,
      message,
      ...meta,
    };
    const output = JSON.stringify(entry);
    if (logLevel === 'error') console.error(output);
    else console.log(output);
  }
  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}
