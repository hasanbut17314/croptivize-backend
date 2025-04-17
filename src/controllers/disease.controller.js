import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Disease } from "../models/disease.model.js";
import axios from "axios";

export const addDisease = asyncHandler(async (req, res) => {
    const {
        name,
        risk,
        percentage
    } = req.body

    if (!name || !percentage) {
        throw new ApiError(400, "Name and percentage are required")
    }

    const newDisease = await Disease.create({
        name,
        risk,
        percentage,
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

    // Main categories: Rust, Blight, Powdery Mildew, Leaf Spot, Other
    const mainCategories = ["Rust", "Blight", "Powdery Mildew", "Leaf Spot"];
    const result = [];
    let otherCount = 0;
    let otherPercentage = 0;

    // Process each disease, grouping minor ones into "Other"
    analytics.forEach(disease => {
        // Check if it's one of the main categories
        if (mainCategories.includes(disease.name)) {
            result.push({
                name: disease.name,
                count: disease.count,
                percentage: disease.percentage
            });
        } else {
            otherCount += disease.count;
            otherPercentage += disease.percentage;
        }
    });

    // Add "Other" category if there are diseases that don't fit main categories
    if (otherCount > 0) {
        result.push({
            name: "Other",
            count: otherCount,
            percentage: parseFloat(otherPercentage.toFixed(1))
        });
    }

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