declare namespace Express {
    export interface Request {
        JWTPayload?: any
        session: {
            qlikSession?: any,
            idToken?: any
        }
    }
}