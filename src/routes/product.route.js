import { Router } from "express";
import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
    addOrder,
    getOrders,
    orderAnalytics
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/createProduct", verifyJWT, upload.single("image"), createProduct);
router.get("/getProducts", getProducts);
router.get("/getProduct/:id", getProductById);
router.put("/updateProduct/:id", verifyJWT, upload.single("image"), updateProduct);
router.delete("/deleteProduct/:id", verifyJWT, deleteProduct);
router.post("/addOrder/:prodId", verifyJWT, addOrder);
router.get("/getOrders", verifyJWT, getOrders);
router.get("/analytics", verifyJWT, orderAnalytics);

export default router;