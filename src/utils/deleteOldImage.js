import { v2 as cloudinary } from "cloudinary";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const deleteOldImage = async (imageUrl) => {
    try {
        if (!imageUrl) return null;
        const publicId = imageUrl.split('/').pop().split('.')[0]; // Extract public ID from URL
        const response = await cloudinary.uploader.destroy(publicId);
        console.log("fn deleteOldImage, response", response);
        return response;
    } catch (error) {
        console.log(`failed to delete image`);
        return null;
    }
}

export {deleteOldImage}