import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js"

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const register = asyncHandler(async (req, res) => {
    const { email, phone, password, confirmPassword } = req.body

    if ([email, phone, password, confirmPassword].some((value) => !value)) {
        throw new ApiError(400, "All fields are required")
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match")
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    const user = await User.create({
        email,
        phone,
        password
    })

    if (!user) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Registered successfully"))
})

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if ([email, password].some((value) => !value)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (!await user.isPasswordCorrect(password)) {
        throw new ApiError(401, "Incorrect password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "Logged in successfully"
            )
        )
})

const logout = asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        { _id: req.user._id },
        { refreshToken: null }
    )

    return res
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .status(200)
        .json(new ApiResponse(200, {}, "Logged out successfully"))
})

const updateProfile = asyncHandler(async (req, res) => {
    const { email, phone } = req.body

    if ([email, phone].some((value) => !value)) {
        throw new ApiError(400, "All fields are required")
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        { email, phone },
        { new: true, select: "-password -refreshToken" }
    )

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while updating profile")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"))
})

export { register, login, logout, updateProfile }