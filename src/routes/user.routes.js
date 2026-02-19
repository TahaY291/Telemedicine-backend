import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, roleBasedRegisterUser } from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router()

router.route('/register').post(roleBasedRegisterUser)
router.route('/login').post(loginUser)
router.route('/logout').post(verifyUser, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)

export default router