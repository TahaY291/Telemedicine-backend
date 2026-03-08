import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res , next) => {
    
    const token = req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, "Unauthorized");
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        throw new ApiError(401, "Access token expired");
    }

});
export default verifyJWT