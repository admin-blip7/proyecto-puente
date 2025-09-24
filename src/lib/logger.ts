export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const getMinLevel = (): LogLevel => {
  const envLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL || '').toLowerCase();
  if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

const shouldLog = (level: LogLevel): boolean => {
  return levelRank[level] >= levelRank[getMinLevel()];
};

export type Logger = {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

export function getLogger(scope: string = 'app'): Logger {
  const prefix = () => `[${new Date().toISOString()}] [${scope}]`;
  return {
    debug: (...args: any[]) => {
      if (shouldLog('debug')) console.debug(prefix(), ...args);
    },
    info: (...args: any[]) => {
      if (shouldLog('info')) console.info(prefix(), ...args);
    },
    warn: (...args: any[]) => {
      if (shouldLog('warn')) console.warn(prefix(), ...args);
    },
    error: (...args: any[]) => {
      // Always log errors
      console.error(prefix(), ...args);
    },
  };
}

export const log = getLogger();