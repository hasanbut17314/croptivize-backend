import { Router } from "express";
import {
    addDisease,
    diseaseAnalytics,
    getRecentDiseases
} from '../controllers/disease.controller.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/addDisease").post(verifyJWT, addDisease);
router.route("/diseaseAnalytics").get(verifyJWT, diseaseAnalytics);
router.route("/getRecent").get(verifyJWT, getRecentDiseases);

export default router;