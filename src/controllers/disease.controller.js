import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Disease } from "../models/disease.model.js";
import axios from "axios";

export const addDisease = asyncHandler(async (req, res) => {
    const {
        name,
        risk
    } = req.body

    if (!name || !risk) {
        throw new ApiError(400, "Name and risk are required")
    }

    const newDisease = await Disease.create({
        name,
        risk,
        detectBy: req.user._id
    })

    if (!newDisease) {
        throw new ApiError(500, "Something went wrong while adding disease")
    }

    return res.status(201).json(new ApiResponse(201, newDisease, "Disease added successfully"))
})

export const getRecentDiseases = asyncHandler(async (_, res) => {
    const diseases = await Disease.find().sort({ createdAt: -1 }).limit(5)

    if (!diseases) {
        throw new ApiError(500, "Something went wrong while fetching diseases")
    }

    return res.status(200).json(new ApiResponse(200, diseases, "Diseases fetched successfully"))
})

export const diseaseAnalytics = asyncHandler(async (_, res) => {

    const totalDetections = await Disease.countDocuments();

    const analytics = await Disease.aggregate([
        {
            $group: {
                _id: "$name",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                name: "$_id",
                count: 1,
                percentage: {
                    $round: [{ $multiply: [{ $divide: ["$count", totalDetections] }, 100] }, 1]
                }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    const result = [];

    analytics.forEach(disease => {

        const { name, count, percentage } = disease;
        result.push({
            name,
            count,
            percentage: parseFloat(percentage.toFixed(1))
        });
    });

    if (!result) {
        throw new ApiError(500, "Something went wrong while fetching disease analytics")
    }

    return res.status(200).json(new ApiResponse(200, result, "Disease analytics fetched successfully"))
})

export const predictDisease = asyncHandler(async (req, res) => {
    try {
        const image = req.body.image
        if (!image) {
            throw new ApiError(400, "Image is required")
        }

        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/predict`, {
            image: image
        })

        if (!response) {
            throw new ApiError(500, "Something went wrong while predicting disease", response)
        }

        return res.status(200).json(new ApiResponse(200, response.data, "Disease predicted successfully"))
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while predicting disease", error)
    }
})

export const getAllDiseases = asyncHandler(async (_, res) => {
    const diseases = await Disease.find().populate("detectBy", "firstName lastName email").sort({ createdAt: -1 })

    if (!diseases) {
        throw new ApiError(500, "Something went wrong while fetching diseases")
    }

    return res.status(200).json(new ApiResponse(200, diseases, "Diseases fetched successfully"))
})