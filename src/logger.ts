import { createLogger, format, transports } from 'winston';
import * as path from 'path';
require('dotenv').config();

const { combine, timestamp, printf } = format;

const getLogFileName = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `proxy-${date}_${time}.log`;
};

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(process.env['LOGS_FOLDER'] || __dirname, getLogFileName()) })
    ],
});

export default logger;
