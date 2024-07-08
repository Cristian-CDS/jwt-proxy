import logger from '../logger';

import express, { Express, Request, Response } from "express";
var router = express.Router();

require('dotenv').config();


import { JWTController } from "../controller/JWTController";


const JWT = new JWTController();

router.get('/login/', async function (req: Request, res: Response) {
    const session = req.session;

    logger.info(`GET login req.session: ${JSON.stringify(session)}`);
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;

    const qlikJwt = JWT.getToken(req.JWTPayload);
    // logger.info('JWTTTTTTTTTT: '+ qlikJwt);
    const qlikSessionRespose = (await JWT.getQlikSessionCookie(process.env.ISSUER as string, qlikJwt));
    logger.info(`qlikSession: ${qlikSessionRespose}`);

    if (qlikSessionRespose.status == 200) {
        session.idToken = encodeURIComponent(req.JWTPayload.jti);
        session.qlikSession = encodeURIComponent(qlikSessionRespose.cookie);
        logger.info(`session.qlikSession: ${session.qlikSession}`);
    }

    res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-proxy-session-id')
    res.set('Access-Control-Allow-Credentials', 'true')

    res.status(qlikSessionRespose.status).send({ result: qlikSessionRespose.text });

});

/* GET home page. */
router.get('/single/*', async function (req: Request, res: Response) {
    const session = req.session;
    logger.info(`GET single req.session: ${JSON.stringify(session)}`);

    if (!session.idToken && !session.qlikSession) {

        return res.status(401).send('not logged ');
    }

    const reqHeaders: any = {};
    const path = req.originalUrl;
    const qlikWebId = process.env.webIntegrationId;

    reqHeaders.cookie = decodeURIComponent(session.qlikSession);
    const csrfToken = reqHeaders.cookie.match('_csrfToken=(.*);')[1];

    const fullPath = `https://${process.env.ISSUER}${path}?qlik-csrf-token=${csrfToken}&qlik-web-integration-id=${qlikWebId}`;

    const r = await fetch(fullPath, {
        headers: reqHeaders,
    });

    res.set('content-type', 'text/html; charset=UTF-8');
    res.status(r.status);
    const buffer = Buffer.from(await r.arrayBuffer());
    res.end(buffer, 'binary');


});


router.get('/resources/*', async function (req: Request, res: Response) {
    logger.info('GET /resources/*');
    res.redirect(`https://${process.env.ISSUER}${req.path}`);
    res.end();
});

router.get('/assets/*', async (req, res) => {
    logger.info('GET /assets/*');
    res.redirect(`https://${process.env.ISSUER}${req.path}`);
    res.end();
});

router.get('/api/v1/*', async (req, res) => {
    logger.info(`GET /api/v1/* req.session: ${JSON.stringify(req.session)}`);

    const session = req.session;
    const reqHeaders: any = {};
    reqHeaders.cookie = decodeURIComponent(session.qlikSession);

    const r = await fetch(`https://${process.env.ISSUER}${req.path}`, {
        headers: reqHeaders,
    });
    res.status(r.status);
    const buffer = Buffer.from(await r.arrayBuffer());
    res.end(buffer, 'binary');
});

router.options('/*', async (req, res) => {
    logger.info('options /*');
    res.status(200).end();
});


router.get('/qlik-embed/*', async function (req: Request, res: Response) {
    const session = req.session;
    logger.info(`GET qlik-embed req.session: ${req.session}`);
    console.log('req', req);
    if (!session.idToken && !session.qlikSession) {

        return res.status(401).send('not logged PDM');
    }

    const reqHeaders: any = {};
    const path = req.originalUrl;
    logger.info('path: ' + path);

    const qlikWebId = process.env.webIntegrationId;

    reqHeaders.cookie = decodeURIComponent(session.qlikSession);
    const csrfToken = reqHeaders.cookie.match('_csrfToken=(.*);')[1];
    const fullPath = `https://${process.env.ISSUER}${path}?qlik-csrf-token=${csrfToken}&qlik-web-integration-id=${qlikWebId}`;

    logger.info('embed js url: ' + fullPath)
    const r = await fetch(fullPath, {
        headers: reqHeaders,
    });
    // setCors(res);
    if (path.includes('/iframe-nocsp.html')) {
        res.set('content-type', 'text/html; charset=UTF-8');
    } else {
        res.set('content-type', 'text/javascript; charset=UTF-8');
    }
    res.status(r.status);
    const buffer = Buffer.from(await r.arrayBuffer());
    res.end(buffer, 'binary');
});

router.options('/*', async (req, res) => {
    logger.info('options /*');
    res.status(200).end();
});

module.exports = router;
