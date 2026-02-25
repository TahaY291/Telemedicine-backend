import { Router } from "express";
import { checkUserIsAuthenticated, loginUser, logoutUser, refreshAccessToken, roleBasedRegisterUser, sendResetPasswordOTP, sendVerifyOTP, verifyEmail, verifyResetPassword  } from "../controllers/auth.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";
const router = Router()

router.route('/register').post(roleBasedRegisterUser)
router.route('/login').post(loginUser)
router.route('/logout').post(verifyUser, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/send-verify-otp').post(verifyUser, sendVerifyOTP)
router.route('/verify-email').post(verifyUser, verifyEmail)
router.route('/is-authenticated').post(verifyUser, checkUserIsAuthenticated)
router.route('/send-reset-password-otp').post(verifyUser, sendResetPasswordOTP)
router.route('/verify-reset-password').post(verifyUser, verifyResetPassword)


export default router