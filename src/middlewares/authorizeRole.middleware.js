export const authorizeRole = (...roles) => (req, _, next) => {
    if (!roles.includes(req.user.role)) {
        throw new ApiError(403, "You are not authorized to perform this action");
    }
    next();
};