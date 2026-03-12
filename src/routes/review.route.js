import { Router } from "express";
import { verifyUser } from "../middlewares/auth.middleware.js";
import {
  createReview,
  deleteReview,
  getDoctorReviews,
  getMyReviews,
  updateReview,
} from "../controllers/review.controller.js";
import verifyJWT from "../middlewares/verifyjwt.middleware.js";
const router = Router()

router.route('/rate-doctor').post(verifyJWT, verifyUser, createReview)
router.route('/doctor-reviews/:doctorId').get(verifyJWT, getDoctorReviews)
router.route('/review/:reviewId').put(verifyJWT ,verifyUser, updateReview).delete(verifyJWT, verifyUser, deleteReview)
router.route('/my-reviews').get(verifyJWT, verifyUser, getMyReviews)

export default router