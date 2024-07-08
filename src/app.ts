var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
require('dotenv').config();
var cors = require('cors');
import logger from './logger';

var JWTProvider = require('./routes/JWTProvider');
var QlikProxy = require('./routes/QlikProxy');

var authMiddleware = require('./middleware/auth');

// This example uses express-session and redis to manage and 
// store sessions for this proxy. In this example, redis stores
// the ID token from the identity provider and the Qlik Cloud
// session cookie used when proxying requests from this web
// application to Qlik Cloud.
const sessionSecret = process.env['sessionSecret'];

module.exports = function (store: any) {
    var app = express();

    app.use(morgan('combined', {
        stream: {
            write: (message: any) => logger.info(message.trim())
        }
    }));

    app.use(session({
        store: store,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        name: process.env.QlikProxySession,
        cookie: {
            samesite: false,
            secure: false,
            httpOnly: false,
            maxAge: 1000 * 60 * 10 // 10 minutes
        }
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '../public')));

    const corsOptions = {
        origin: ['http://localhost:4200', '*.mydomain.it'],
        methods: 'GET, OPTIONS',
        haders: 'Content-Type, x-proxy-session-id',
        credentials: true
    };
    app.use(cors(corsOptions));

    app.use(authMiddleware.authMiddleware)

    app.use('/' + process.env.API_ROOT, JWTProvider);

    app.use('/', QlikProxy);

    return app;
}
