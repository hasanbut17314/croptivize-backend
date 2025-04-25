import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const createProduct = asyncHandler(async (req, res) => {
    const { name, price, description, rating, category, isFeatured, link } = req.body;
    const createdBy = req.user._id;

    if ([name, price, description, rating, category, link].some((value) => !value)) {
        throw new ApiError(400, "All fields are required");
    }

    let image = null;
    if (req.file) {
        const result = await uploadOnCloudinary(req.file.buffer, req.file.originalname);
        if (!result) throw new ApiError(500, "Something went wrong while uploading image");
        image = result.url;
    }

    const newProduct = await Product.create({
        name, price, description, rating, image, category, isFeatured, createdBy, link
    });

    return res.status(201).json(new ApiResponse(201, newProduct, "Product created successfully"));
});

export const getProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search, category, sort, minPrice, maxPrice, minRating, featured } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (featured === 'true') filter.isFeatured = true;

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

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
        isFeatured,
        link
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
            isFeatured,
            link
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

export const addOrder = asyncHandler(async (req, res) => {

    const { prodId } = req.params;
    if (!prodId) throw new ApiError(400, "Product ID is required");

    const product = await Product.findById(prodId);
    if (!product) throw new ApiError(404, "Product not found");

    const order = await Order.create({
        user: req.user._id,
        product: product._id
    });

    if (!order) throw new ApiError(500, "Something went wrong while placing order");

    return res.status(201).json(new ApiResponse(201, order, "Order placed successfully"));
})

export const getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        populate: [
            { path: 'user', select: 'firstName lastName email' },
            { path: 'product', select: 'name price' },
        ]
    };

    const orders = await Order.paginate({}, options);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, {
                orders: orders.docs,
                pagination: {
                    totalDocs: orders.totalDocs,
                    limit: orders.limit,
                    totalPages: orders.totalPages,
                    page: orders.page,
                    hasPrevPage: orders.hasPrevPage,
                    hasNextPage: orders.hasNextPage,
                    prevPage: orders.prevPage,
                    nextPage: orders.nextPage
                },
            },
                "Orders fetched successfully"
            )
        );
})

export const orderAnalytics = asyncHandler(async (req, res) => {

    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate([
        { path: 'user', select: 'firstName lastName email' },
        { path: 'product', select: 'name price' },
    ]);

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const pipeline = [
        {
            $match: {
                createdAt: {
                    $gte: startOfYear,
                    $lte: endOfYear
                }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "product",
                foreignField: "_id",
                as: "productData"
            }
        },
        {
            $unwind: "$productData"
        },
        {
            $group: {
                _id: { month: { $month: "$createdAt" } },
                count: { $sum: 1 },
                total: { $sum: "$productData.price" }
            }
        },
        {
            $sort: { "_id.month": 1 }
        },
        {
            $project: {
                _id: 0,
                month: "$_id.month",
                count: 1,
                total: 1
            }
        }
    ];

    const monthlySales = await Order.aggregate(pipeline);

    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const salesData = monthNames.map((name, index) => {
        const monthData = monthlySales.find(item => item.month === index + 1);

        return {
            name: name,
            count: monthData ? monthData.count : 0,
            total: monthData ? Math.round(monthData.total) : 0
        };
    });

    const currentMonth = new Date().getMonth();
    const filteredSalesData = salesData.slice(0, currentMonth + 1);

    return res.status(200).json(new ApiResponse(200, {
        totalProducts,
        totalOrders,
        recentOrders,
        salesData: filteredSalesData
    }, "Order analytics fetched successfully"));

})


