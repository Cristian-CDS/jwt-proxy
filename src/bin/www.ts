#!/usr/bin/env node

/**
 * Module dependencies.
 */


var debug = require('debug')('ai-backend:server');
var http = require('http');
require('dotenv').config();
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import WebSocket, { WebSocketServer } from 'ws';
import * as cookieParser from 'cookie-parser';
import * as cookie from 'cookie';
import logger from '../logger';


const redis_db = process.env['redis_db'];
const redis_port = Number(process.env['redis_port']);
const redis_pwd = process.env['redis_pwd'];

// Create the connection to Redis. This example uses Redis cloud free tier.
const client = new Redis({
  host: redis_db,
  port: redis_port,
  password: redis_pwd,
  retryStrategy: (times) => {
    if (times < 10) {
      return Math.min(times * 50, 2000);
    }
    return null;
  }
})

client.on('error', (error: any) => {
  logger.error('Redis client error: ' + JSON.stringify(error));
})

const store = new RedisStore({ client: client });

var app = require('../app')(store);

var port = normalizePort(process.env.PORT || '3000');
logger.info('Listening on port: ' + port);
app.set('port', port);

logger.info('date ' + new Date());

var server = http.createServer(app);

// ws creation
const wss = new WebSocketServer({ server })
logger.info('wss created');

const sessionSecret: any = process.env['sessionSecret'];
const cookieName: string = process.env['QlikProxySession'] as string;

wss.on('connection', async function connection(ws, req) {

  logger.info('------------------  web socket connection  ------------------');

  let isOpened = false
  // WebSockets do not have access to session information.
  // To get the session you need to parse the 1st-party cookie.
  // This will give you access to the Qlik Cloud cookie in order
  // to proxy requests.
  const cookieString = req.headers.cookie;
  logger.info('WS - cookieString: ' + cookieString);
  let qlikCookie = '';
  if (cookieString) {
    const cookieParsed = cookie.parse(cookieString);
    logger.info('WS - cookieParsed: ' + cookieParsed);

    const appCookie = cookieParsed[cookieName];
    logger.info('WS - appCookie:' + appCookie);

    if (appCookie) {
      const sidParsed: any = cookieParser.signedCookie(appCookie, sessionSecret);
      await store.get(sidParsed, (err, session) => {
        if (err) throw err;
        qlikCookie = decodeURIComponent(session.qlikSession);
      });
    }
  }

  const appIdMatch = req.url?.match('/app/(.*)\\?');
  const appId = appIdMatch ? appIdMatch[1] : '';
  logger.info('WS - appId: ' + appId);

  const csrfTokenMatch = qlikCookie.match('_csrfToken=(.*);');
  const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : '';
  logger.info('WS - csrfToken: ' + csrfToken);


  const qlikWebSocket: any = new WebSocket(`wss://${process.env.ISSUER}/app/${appId}?qlik-csrf-token=${csrfToken}`, {
    headers: {
      cookie: qlikCookie,
    },
  })

  qlikWebSocket.on('error', function message(data: any) {
    logger.error(`qlikWebSocket error: ${data}`);
  })
  const openPromise = new Promise((resolve) => {
    qlikWebSocket.on('open', function open() {
      logger.info('qlik web socket open');
      resolve('ok')
    })
  })

  ws.on('message', async function message(data) {
    logger.info('web socket message: ' + message);
    if (!isOpened) {
      logger.info('web socket non aperta');
      await openPromise
      isOpened = true
    }
    logger.info('mando a qlik: ' + data.toString())
    qlikWebSocket.send(data.toString())
  })

  qlikWebSocket.on('message', function message(data: any) {
    logger.info('qlikWebSocket message: ' + data.toString());
    ws.send(data.toString())
  })
})


/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: any) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
