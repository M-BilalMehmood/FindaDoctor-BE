import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class ImageUploadService {
    uploadImage(file, folder) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: folder },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }

    async uploadProfilePicture(file, userId) {
        try {
            const result = await this.uploadImage(file, 'profile_pictures');
            return result.secure_url;
        } catch (error) {
            console.error('Error uploading profile picture: ', error);
            throw error;
        }
    }

    async uploadPrescriptionImage(file) {
        try {
            const result = await this.uploadImage(file, 'prescriptions');
            return result.secure_url;
        } catch (error) {
            console.error('Error uploading prescription image: ', error);
            throw error;
        }
    }
}

export default new ImageUploadService();

