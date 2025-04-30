import { Router } from "express";
import {
    addMessage,
    getAllMessages,
    getMessage
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/addMessage").post(addMessage);
router.route("/getMessage/:id").get(getMessage);
router.route("/getAllMessages").get(verifyJWT, getAllMessages);

export default router;