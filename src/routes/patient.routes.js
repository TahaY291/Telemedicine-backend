import { Router } from "express";
import { roleBasedRegisterUser } from "../controllers/auth.controller.js";
import  {upload} from '../middlewares/multer.middleware.js'
const router = Router()
router.route('/register').post(roleBasedRegisterUser)

export default router