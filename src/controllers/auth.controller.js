import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, roleBasedRegisterSchema } from "../utils/validation/user.validation.js";
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

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

export { roleBasedRegisterUser, loginUser, logoutUser, refreshAccessToken }