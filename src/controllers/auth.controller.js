import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, roleBasedRegisterSchema } from "../utils/validation/user.validation.js";
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import transporter from "../utils/nodemailer.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found")
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.lastLogin = new Date()

        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens")
    }
}

const roleBasedRegisterUser = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body
    const userData = { username, email, password, role }

    const validated = roleBasedRegisterSchema.safeParse(userData)

    if (!validated.success) {
        throw new ApiError(400, "All fields are required")
    }
    const allowedRoles = ["patient", "doctor"]

    if (!allowedRoles.includes(validated.data.role)) {
        throw new ApiError(400, "Invalid role")
    }

    const existingUser = await User.findOne({ email: validated.data.email })

    if (existingUser) {
        throw new ApiError(400, "User with this email already exists")
    }
    const newUser = await User.create(validated.data)
    const createdUser = await User.findById(newUser._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "Failed to create user")
    }

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: createdUser.email,
        subject: "Welcome to Smart Telemedicine System",
        text: `Dear ${createdUser.username},\n\nThank you for registering as a ${createdUser.role} on our Smart Telemedicine System. We are excited to have you on board!\n\nBest regards,\nSmart Telemedicine Team`
    }

    const response = await transporter.sendMail(mailOptions)
    if (!response.accepted.length) {
        throw new ApiError(500, "Failed to send welcome email")
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"))

})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const validated = loginSchema.safeParse({ email, password })

    if (!validated.success) {
        throw new ApiError(400, "Email and password are required")
    }

    const existedUser = await User.findOne({ email: validated.data.email }).select("+password")

    if (!existedUser) {
        throw new ApiError(401, "Invalid email or password")
    }

    const isMatch = await existedUser.isPasswordCorrect(validated.data.password)
    if (!isMatch) {
        throw new ApiError(401, "Invalid email or password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existedUser._id)


    const loggedInUser = await User.findById(existedUser._id)
        .select("_id username email role isActive isVerified status");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: { refreshToken: null },
        },
        {
            new: true,
        })
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, null, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Unauthorized: No refresh token provided")
    }
    try {
        const decodedTokem = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedTokem?._id)
        if (!user) {
            throw new ApiError(401, "Unauthorized: Invalid refresh token")
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized: Refresh token mismatch")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed successfully")
            )
    } catch (error) {
        throw new ApiError(401, "Unauthorized: Invalid refresh token")
    }
})

const sendVerifyOTP = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (user.isVerified) {
        throw new ApiError(400, "User already verified")
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    user.verifyOTP = otp
    user.verifyOTPExpiry = new Date(Date.now() + 10 * 60 * 1000)

    await user.save({ validateBeforeSave: false })

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Your OTP for Email Verification",
        text: `Dear ${user.username},\n\nYour OTP for email verification is: ${otp}. This OTP is valid for 10 minutes.\n\nBest regards,\nSmart Telemedicine Team`
    }
    try {
        await transporter.sendMail(mailOptions)
    } catch (error) {
        user.verifyOTP = null
        user.verifyOTPExpiry = 0
        await user.save({ validateBeforeSave: false })
        throw new ApiError(500, "Failed to send OTP email")
    }
    res.status(200).json(new ApiResponse(200, null, "OTP sent to email successfully"))
})

const verifyEmail = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const { otp } = req.body
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    if (user.isVerified) {
        throw new ApiError(400, "User already verified")
    }
    if (!user.verifyOTP) {
        throw new ApiError(400, "No OTP found")
    }

    if (user.verifyOTPExpiry < Date.now()) {
        throw new ApiError(400, "OTP has expired")
    }

    if (user.verifyOTP !== String(otp)) {
        throw new ApiError(400, "Invalid OTP")
    }

    user.isVerified = true
    user.verifyOTP = null
    user.verifyOTPExpiry = 0
    await user.save({ validateBeforeSave: false })

    res.status(200).json(new ApiResponse(200, null, "Email verified successfully"))
})

const checkUserIsAuthenticated = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, { user: req.user }, "User is authenticated"))
})

const sendResetPasswordOTP = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) {
        throw new ApiError(400, "Email is required")
    }
    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    user.resetOTP = otp
    user.resetOTPExpiry = Date.now() + 10 * 60 * 1000
    await user.save({ validateBeforeSave: false })

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "Your OTP for Password Reset",
        text: `Dear ${user.username},\n\nYour OTP for password reset is: ${otp}. This OTP is valid for 10 minutes.\n\nBest regards,\nSmart Telemedicine Team`
    }
    try {
        await transporter.sendMail(mailOptions)
    } catch (error) {
        user.resetOTP = null
        user.resetOTPExpiry = 0
        await user.save({ validateBeforeSave: false })
        throw new ApiError(500, "Failed to send OTP email")
    }
    res.status(200).json(new ApiResponse(200, null, "OTP sent to email successfully"))
})

const verifyResetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP and New Password are required")
    }
    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    if (!user.resetOTP) {
        throw new ApiError(400, "No OTP found")
    }

    if (user.resetOTPExpiry < Date.now()) {
        throw new ApiError(400, "OTP has expired")
    }

    if (user.resetOTP !== String(otp)) {
        throw new ApiError(400, "Invalid OTP")
    }
    user.resetOTP = null
    user.resetOTPExpiry = 0
    user.password = newPassword
    await user.save()

    res.status(200).json(new ApiResponse(200, null, "OTP verified successfully"))
})


export { roleBasedRegisterUser, loginUser, logoutUser, refreshAccessToken, checkUserIsAuthenticated, sendVerifyOTP, verifyEmail, sendResetPasswordOTP, verifyResetPassword }