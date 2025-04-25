import asyncHandler from "../utils/asyncHandler.js"
import ApiResponse from "../utils/ApiResponse.js"
import ApiError from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import passport from "passport"

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

const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

const googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err, user) => {
        if (err) {
            return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(err.message || "Authentication failed")}`);
        }

        if (!user) {
            return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
        }

        try {
            const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

            const loggedInUser = {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || "",
                role: user.role
            };

            const encodedUser = encodeURIComponent(JSON.stringify(loggedInUser));
            return res
                .redirect(`${process.env.CLIENT_URL}/login/success?user=${encodedUser}&accessToken=${accessToken}&refreshToken=${refreshToken}`);
        } catch (error) {
            return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(error.message || "Login failed")}`);
        }
    })(req, res, next);
};

const googleAuthStatus = asyncHandler(async (req, res) => {
    // Get the access token from cookies
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
        return res.status(401).json(
            new ApiResponse(401, {}, "Not authenticated")
        );
    }

    try {
        // Verify the token
        const decodedToken = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        // Get user from database
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return res.status(401).json(
                new ApiResponse(401, {}, "Invalid token")
            );
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    user,
                    accessToken: req.cookies.accessToken,
                    refreshToken: req.cookies.refreshToken
                },
                "Authentication status retrieved successfully"
            )
        );
    } catch (error) {
        return res.status(401).json(
            new ApiResponse(401, {}, "Invalid or expired token")
        );
    }
});

const register = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body

    if ([firstName, lastName, email, phone, password, confirmPassword].some((value) => !value)) {
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
        firstName,
        lastName,
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
        firstName: user.firstName,
        lastName: user.lastName,
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
    const { firstName, lastName, email, phone } = req.body

    if ([firstName, lastName, email, phone].some((value) => !value)) {
        throw new ApiError(400, "All fields are required")
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        {
            firstName,
            lastName,
            email,
            phone
        },
        { new: true, select: "-password -refreshToken" }
    )

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while updating profile")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"))
})

const recreateAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json({
                status: 200,
                success: true,
                accessToken,
                refreshToken: newRefreshToken,
                message: "Recreate access token successfully"
            })
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const getUsers = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10 } = req.query
    const users = await User.find().select("-password -refreshToken").limit(limit).skip((page - 1) * limit)

    if (!users) {
        throw new ApiError(500, "Something went wrong while retrieving users")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, users, "Users retrieved successfully"))
})

const updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { role } = req.body
    if (role !== "admin" && role !== "user") {
        throw new ApiError(400, "Invalid role")
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: id },
        { role },
        { new: true, select: "-password -refreshToken" }
    )

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while updating user role")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User role updated successfully"))
})

const getUserCount = asyncHandler(async (_, res) => {
    const userCount = await User.countDocuments()

    if (!userCount) {
        throw new ApiError(500, "Something went wrong while retrieving user count")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, userCount, "User count retrieved successfully"))
})

export {
    register,
    login,
    logout,
    recreateAccessToken,
    updateProfile,
    getUsers,
    updateUserRole,
    googleAuth,
    googleAuthCallback,
    googleAuthStatus,
    getUserCount
}