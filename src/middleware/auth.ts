import Jwt, { Secret } from "jsonwebtoken";
import express, { Express, Request, Response } from "express";
import logger from '../logger';

require('dotenv').config();


const authMiddleware = (req: Request, res: Response, next: any) => {

    let secret = "-----BEGIN PUBLIC KEY-----\n" + process.env.KEYCLOAK_CLIENT_SECRET as String + "\n-----END PUBLIC KEY-----";

    let authHeader: String = req.headers['authorization'] as String;

    if (req.originalUrl.indexOf('login') >= 0 && authHeader) {
        try {
            let authorization = authHeader?.split(' ') || '';
            if (authorization[0] !== 'Bearer') {
                return res.status(408).send('invalid request'); //invalid request
            } else {
                req.JWTPayload = Jwt.verify(authorization[1], secret as Secret, { algorithms: ['RS256'] });
                return next();
            }
        } catch (err) {
            logger.info(`403 - ${err}`);
            return res.status(403).send(); //invalid token
        }
    }
    else {
        next();
    }
};

module.exports = {
    authMiddleware,
};