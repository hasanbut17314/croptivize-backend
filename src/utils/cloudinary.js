import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteFromCloudinary = async (publicId, url) => {
    try {
        // First try as raw file
        try {
            const rawResponse = await cloudinary.uploader.destroy(publicId, {
                resource_type: 'raw'
            });
            if (rawResponse.result === 'ok') {
                return rawResponse;
            }
        } catch (rawError) {
            // If raw deletion fails, try as image
            console.log("Raw deletion failed, trying as image");
        }

        // Try as image if raw failed
        const imageResponse = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image'
        });
        return imageResponse;

    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error.message);
        console.error("Public ID:", publicId);
        console.error("URL:", url);
        return null;
    }
};

// Updated to accept file buffer instead of local file path
const uploadOnCloudinary = async (fileBuffer, originalFilename) => {
    try {
        if (!fileBuffer) return null;

        // Create a promise to handle the upload
        return new Promise((resolve, reject) => {
            // Create upload stream to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "auto",
                    filename_override: originalFilename,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            // Convert buffer to readable stream and pipe to uploadStream
            const readableStream = new Readable();
            readableStream.push(fileBuffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);
        });

    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };