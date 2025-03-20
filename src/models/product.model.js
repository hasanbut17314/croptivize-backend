import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    rating: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        enum: ["Fertilizers", "Tools", "Seeds", "Pesticides", "Equipment"],
        required: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    link: {
        type: String
    }
}, {
    timestamps: true
})

productSchema.plugin(mongoosePaginate)
export const Product = mongoose.model("Product", productSchema)