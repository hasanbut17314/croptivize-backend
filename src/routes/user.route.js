import { Router } from "express";
import {
    register,
    login,
    logout,
    recreateAccessToken,
    updateProfile,
    getUsers,
    updateUserRole,
    googleAuth,
    googleAuthCallback,
    googleAuthStatus,
    getUserCount
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/auth/google", googleAuth);
router.get("/auth/google/callback", googleAuthCallback);
router.get("/auth/google/status", googleAuthStatus);
router.post("/logout", verifyJWT, logout);
router.post("/recreateAccessToken", recreateAccessToken);
router.put("/updateProfile", verifyJWT, updateProfile);
router.get("/getUsers", verifyJWT, getUsers);
router.put("/updateUserRole/:id", verifyJWT, updateUserRole);
router.get("/count", verifyJWT, getUserCount);

export default router;