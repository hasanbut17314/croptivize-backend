import { Router } from "express";
import { register, login, logout, recreateAccessToken, updateProfile, getUsers, updateUserRole } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyJWT, logout);
router.post("/recreateAccessToken", recreateAccessToken);
router.put("/updateProfile", verifyJWT, updateProfile);
router.get("/getUsers", verifyJWT, getUsers);
router.put("/updateUserRole/:id", verifyJWT, updateUserRole);

export default router;