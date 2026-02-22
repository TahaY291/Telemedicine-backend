import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'


const userSchema = new Schema({

    username: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        index: true,
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'is invalid']
    },

    password: {
        type: String,
        required: true,
        select: false,
    },

    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: "patient",
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    status: {
        type: String,
        enum: ["active", "blocked", "pending"],
        default: "active",
    },
    refreshToken: {
        type: String
    },
    lastLogin: {
        type: Date,
    },
    verifyOTP: {
        type: String,
        default: null,
    },
    verifyOTPExpiry: {
        type: Number,
        default: 0,
    },
    resetOTP:{
        type: String,
        default: null,
    },
    resetOTPExpiry: {
        type: Number,
        default: 0,
    }
},
    { timestamps: true }
)

userSchema.pre("save", async function(){
    if (!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 10);
    
})


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, role: this.role , username: this.username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const User = mongoose.model("User", userSchema)