import { Router } from "express";import { verifyUser } from "../middlewares/auth.middleware.js";
import { createReview, deleteReview, getDoctorReviews, getMyReviews, updateReview } from "../controllers/review.controller";
const router = Router()

router.route('/rate-doctor').post(verifyUser, createReview)
router.route('/doctor-reviews/:doctorId').get(getDoctorReviews)
router.route('/review/:reviewId').put(verifyUser, updateReview).delete(verifyUser, deleteReview)
router.route('/my-reviews').get(verifyUser, getMyReviews)

export default router