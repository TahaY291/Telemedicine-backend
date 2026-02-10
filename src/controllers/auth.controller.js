import { asyncHandler } from "../utils/asyncHandler.js";
import { roleBasedRegisterSchema } from "../utils/validation/patient.validation.js";
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Patient } from "../models/patient.model.js";
import {Doctor} from "../models/doctor.model.js";
import {Admin} from "../models/admin.model.js";


const roleBasedRegisterUser = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body
    const userData = { username, email, password, role }

    const validated = roleBasedRegisterSchema.safeParse(userData)

    if (!validated.success) {
        throw new ApiError(400, "All feilds are required")
    }

    const existedUser = await Patient.findOne({ email })
    if (existedUser) {
        throw new ApiError(400, "Email already in use")
    }

    if (role === "patient") {
        const patient = await Patient.create(userData)
        return res.status(201).json(new ApiResponse(201, patient, "Patient registered successfully"))
    } else if (role === "doctor") {
        const doctor = await Doctor.create(userData)
        return res.status(201).json(new ApiResponse(201, doctor, "Doctor registered successfully"))
    } else if (role === "admin") {
        const admin = await Admin.create(userData)
        return res.status(201).json(new ApiResponse(201, admin, "Admin registered successfully"))
    }
})

export { roleBasedRegisterUser }