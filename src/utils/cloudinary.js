import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: 'diwtcjgaq', 
    api_key: '525225424652333',
    api_secret: 'C7ZPJ3LBrcDsZrLdZnp7SNyLldM'
});

const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        return response.url;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

export { uploadFileOnCloudinary };