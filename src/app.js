import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import setupPassport from "./utils/passport.js";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(express.static("public"))
app.use(cookieParser())
app.use(passport.initialize())
setupPassport()

import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import diseaseRouter from "./routes/disease.route.js";
import messageRouter from "./routes/message.route.js";

app.use("/api/user", userRouter)
app.use("/api/product", productRouter)
app.use("/api/disease", diseaseRouter)
app.use("/api/message", messageRouter)

export default app