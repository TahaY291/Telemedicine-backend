import { Router } from "express";
import { checkUserIsAuthenticated, loginUser, logoutUser, refreshAccessToken, roleBasedRegisterUser, sendResetPasswordOTP, sendVerifyOTP, verifyEmail, verifyResetPassword  } from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
const router = Router()

router.route('/register').post(roleBasedRegisterUser)
router.route('/login').post(loginUser)
router.route('/logout').post(verifyJWT, verifyUser, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/send-verify-otp').post(verifyJWT, verifyUser, sendVerifyOTP)
router.route('/verify-email').post(verifyJWT, verifyUser, verifyEmail)
router.route('/is-authenticated').post(verifyJWT, verifyUser, checkUserIsAuthenticated)
router.route('/send-reset-password-otp').post(verifyJWT, verifyUser, sendResetPasswordOTP)
router.route('/verify-reset-password').post(verifyJWT, verifyUser, verifyResetPassword)


export default router