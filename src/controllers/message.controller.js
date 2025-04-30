import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Message } from "../models/message.model.js";

const addMessage = asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        throw new ApiError(400, "All fields are required");
    }
    const newMessage = await Message.create({ name, email, subject, message });
    return res.status(201).json(new ApiResponse(201, newMessage, "Message sent successfully"));
});

const getMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) throw new ApiError(404, "Message not found");
    return res.status(200).json(new ApiResponse(200, message, "Message retrieved successfully"));
})

const getAllMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find();
    if (!messages) throw new ApiError(404, "Messages not found");
    return res.status(200).json(new ApiResponse(200, messages, "Messages retrieved successfully"));
})

export { addMessage, getMessage, getAllMessages };