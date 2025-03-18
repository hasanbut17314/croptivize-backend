import { Router } from "express";
import { register, login, logout, recreateAccessToken, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyJWT, logout);
router.post("/recreateAccessToken", recreateAccessToken);
router.put("/updateProfile", verifyJWT, updateProfile);

export default router;