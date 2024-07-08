import express, { Express, Request, Response } from "express";
var router = express.Router();


import { JWTController } from "../controller/JWTController";


const JWT = new JWTController();

/* GET home page. */
router.get('/', function (req: Request, res: Response) {
    res.send({ token: JWT.getToken(req.JWTPayload) });
});

module.exports = router;
