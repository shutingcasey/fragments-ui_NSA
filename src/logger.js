import pino from 'pino';

const options = {
  level: process.env.LOG_LEVEL || 'info',
};

const logger = pino(options);

export default logger;