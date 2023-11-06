import { join } from 'path';
import winston, { createLogger, format, transports } from 'winston';
import { LOG_ROOT_RELATIVE_PATH } from '../infrastructure.constants';

export class Logger {
  constructor(private readonly directory: string, private readonly file: string) {
    const logDir = join(__dirname, LOG_ROOT_RELATIVE_PATH, directory);
    const logFile = `${logDir}/${new Date().toISOString().substring(0, 10)}_${file}`;

    this.logger = createLogger({
      exitOnError: false,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`),
      ),
      transports: [new transports.File({
        filename: logFile,
        options: { flags: 'a' },
      })],
    });
  }

  private readonly logger: winston.Logger;

  log(message: string, logToConsole: boolean = true): void {
    this.logger.log('info', message);
    if (logToConsole) {
      console.log(message);
    }
  }

  error(message: string, logToConsole: boolean = true): void {
    this.logger.log('error', message);
    if (logToConsole) {
      console.error(message);
    }
  }
}