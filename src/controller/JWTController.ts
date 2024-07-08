import * as fs from 'fs';
import * as uid from 'uid-safe';
import jwt from 'jsonwebtoken';
import logger from '../logger';

require('dotenv').config();

export class JWTController {

    constructor() {

    }

    getToken(JWTPayload: any) {

        const privateKey = fs.readFileSync('./certificates/' + process.env.CERTIFICATE);

        const payload = {
            jti: uid.sync(32),                          // 32 bytes random string
            sub: JWTPayload.QlikSUb,
            subType: 'user',
            name: JWTPayload.preferred_username,
            email: JWTPayload.email,
            email_verified: JWTPayload.email_verified,
        };

        const signingOptions: jwt.SignOptions = {
            keyid: process.env.KID,
            algorithm: "RS256",
            issuer: process.env.ISSUER,
            expiresIn: "60m", //Expires 60 minutes after the issue date/time.
            notBefore: "1s", //JWT is valid 1 second after the issue date/time.
            audience: "qlik.api/login/jwt-session"
        };

        logger.info(`JWT Payload: ${JSON.stringify(payload)}`);

        return jwt.sign(payload, privateKey, signingOptions);
    }

    // Use the JWT token to authorize the user to Qlik Cloud.
    // Return the cookie that will be used to proxy requests to Qlik Cloud.
    async getQlikSessionCookie(tenantUri: string, token: string) {

        let qlikSessionCookieResp = {
            'status': 401,
            'cookie': '',
            'text': ''
        };

        logger.info(`logging in: ${token}`);

        const resp: any = await fetch(`https://${tenantUri}/login/jwt-session`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        qlikSessionCookieResp.status = resp.status;

        if (resp.status === 200) {

            qlikSessionCookieResp.cookie = resp.headers
                .get('set-cookie')
                .split(',')
                .map((e: any) => {
                    return e.split(';')[0]
                })
                .join(';');
            qlikSessionCookieResp.text = 'logged in!'

        }
        else {
            qlikSessionCookieResp.text = resp.statusText
            logger.error(`error while logging in qlik: ${JSON.stringify(resp)}`);
        }

        return qlikSessionCookieResp;
    }


}