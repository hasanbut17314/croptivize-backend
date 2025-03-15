import mongoose, { Schema } from "mongoose";

const diseaseSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    risk: {
        type: String
    },
    percentage: {
        type: Number
    },
    detectBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

export const Disease = mongoose.model("Disease", diseaseSchema)