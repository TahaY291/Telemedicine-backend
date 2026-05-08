import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer directly to Cloudinary (no temp file needed)
 * @param {Buffer} buffer  - file buffer from multer memoryStorage
 * @param {string} folder  - cloudinary folder name e.g. "avatars"
 * @returns cloudinary response or null
 */
const uploadOnCloudinary = (buffer, folder = "uploads") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", folder, use_filename: false },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    resolve(null);
                } else {
                    console.log("File uploaded to Cloudinary:", result.secure_url);
                    resolve(result);
                }
            }
        );
        stream.end(buffer);
    });
};

export { uploadOnCloudinary };