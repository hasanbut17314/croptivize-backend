import { Router } from "express";
import {
    addDisease,
    diseaseAnalytics,
    getRecentDiseases,
    predictDisease,
    getAllDiseases
} from '../controllers/disease.controller.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/addDisease").post(verifyJWT, addDisease);
router.route("/diseaseAnalytics").get(verifyJWT, diseaseAnalytics);
router.route("/getRecent").get(verifyJWT, getRecentDiseases);
router.route("/predict").post(verifyJWT, predictDisease);
router.route("/getAll").get(verifyJWT, getAllDiseases);

export default router;