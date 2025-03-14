import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Product } from "../models/product.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const createProduct = asyncHandler(async (req, res) => {
    const { name, price, description, rating, category, isFeatured } = req.body;
    const createdBy = req.user._id;

    if ([name, price, description, rating, category].some((value) => !value)) {
        throw new ApiError(400, "All fields are required");
    }

    let image = null;
    if (req.file) {
        const result = await uploadOnCloudinary(req.file.buffer, req.file.originalname);
        if (!result) throw new ApiError(500, "Something went wrong while uploading image");
        image = result.url;
    }

    const newProduct = await Product.create({
        name, price, description, rating, image, category, isFeatured, createdBy
    });

    return res.status(201).json(new ApiResponse(201, { product: newProduct }, "Product created successfully"));
});

export const getProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category, sort, minPrice, maxPrice, minRating, featured } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (featured === 'true') filter.isFeatured = true;

    const sortOptions = {
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        rating_desc: { rating: -1 },
        newest: { createdAt: -1 },
    }[sort] || { createdAt: -1 };

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: sortOptions,
        populate: { path: 'createdBy', select: 'name email' }
    };

    const products = await Product.paginate(filter, options);

    return res.status(200).json(new ApiResponse(200, {
        products: products.docs,
        pagination: {
            totalDocs: products.totalDocs,
            limit: products.limit,
            totalPages: products.totalPages,
            page: products.page,
            hasPrevPage: products.hasPrevPage,
            hasNextPage: products.hasNextPage,
            prevPage: products.prevPage,
            nextPage: products.nextPage
        }
    }));
});

export const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id).populate('createdBy', 'name email');

    if (!product) throw new ApiError(404, "Product not found");

    return res.status(200).json(new ApiResponse(200, { product }));
});

export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        name,
        price,
        description,
        rating,
        category,
        isFeatured
    } = req.body;
    const product = await Product.findById(id);

    if (!product) throw new ApiError(404, "Product not found");

    let image = product.image || null;
    if (req.file) {
        if (product.image) {
            const publicId = product.image.split("/").pop().split(".")[0];
            const result = await deleteFromCloudinary(publicId, product.image);
            if (!result) throw new ApiError(500, "Something went wrong while deleting image");
        }
        const result = await uploadOnCloudinary(req.file.buffer, req.file.originalname);
        if (!result) throw new ApiError(500, "Something went wrong while uploading image");
        image = result.url;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
            name,
            price,
            description,
            rating,
            image,
            category,
            isFeatured
        },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) throw new ApiError(404, "Product not found");

    if (product.image) {
        const publicId = product.image.split("/").pop().split(".")[0];
        const result = await deleteFromCloudinary(publicId, product.image);
        if (!result) throw new ApiError(500, "Something went wrong while deleting image");
    }
    await Product.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, {}, "Product deleted successfully"));
});


