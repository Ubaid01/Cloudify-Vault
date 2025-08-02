import multer from 'multer' ;
import { v2 as cloudinary } from 'cloudinary' ;
import { CloudinaryStorage } from 'multer-storage-cloudinary' ;
import { InvokeError } from './capture_errors.js';
import mime from 'mime-types' ;

cloudinary.config( {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
} ) ;

// const multerStorage = new CloudinaryStorage( {
//     cloudinary,
//     params: {
//         folder: (req, file) => 'cloud_uploads_folder',
//         format: async (req, file) => 'png',
//         public_id: (req, file) => file.originalname.split('.')[0] + "_" + Date.now(),
//         transformation: [
//             { width: 800, height: 600, crop: "fill" }
//         ]
//     }
// } ) ;

// export const uploadFiles = upload.single( 'image' ) ;

const multerStorage = new CloudinaryStorage( {
    cloudinary,
    params: async (req, file) => {
        const ext = mime.extension( file.mimetype ) ; // Can use file.mimetype.split('/')[1] ; BUT that could be wrong encoded.

        const config = {
            folder: 'cloud_uploads_folder',
            public_id: file.originalname.split('.')[0] + "_" + Date.now(),
            format: ext ,
            resource_type: 'auto' , // MISTAKE ; By default, Cloudinary assumes uploaded files are images SO setting this avoid the ERROR of image transformation even though isImage is false. Other rsc are 'video','raw','image'.

            // authenticated: true ( Make asset authenticated (not publicly accessible unless via signed URL) ) ; And while deleting, { type: 'authenticated' }
        } ;

        if ( file.mimetype.startsWith('image/') ) {
            config.transformation = [
                { width: 800, height: 600, crop: 'fill' , quality: 90 }   ];
        }
        else if( file.mimetype.startsWith('video/') ) {
            config.format = 'mp4' ; // Convert to efficient format
            config.transformation = [
                {
                    width: 480 ,
                    crop: 'limit', // Keeps aspect ratio, avoids upscaling while resizing.
                    // quality: 'auto', 
                    quality: 'auto:eco', // Prioritizes smaller size, still decent quality. OR auto:low.
                    fetch_format: 'auto'
                }
            ];
        }
        return config ;
    }
} ) ;

const multerFilter = ( req , file , cb ) => {
    const checkExts  = ['exe', 'bat', 'sh', 'bin', 'cmd', 'cpl', 'js', 'py'] ; // More efficient method is to avoid multerFiler and use file-types as fileTypeFromBuffer.
    const ext = mime.extension( file.mimetype ) ;
    const extFromName = file.originalname.split('.').pop().toLowerCase() ;
    
    if( ext !== extFromName || checkExts.includes( ext ) )
        cb( new InvokeError( 'File type is not supported. Try another file!' , 400 ) , false ) ;
    else
        cb( null , true ) ;
} ;

const upload = multer( { 
    storage: multerStorage ,
    fileFilter: multerFilter ,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB 
    // Can also set file: 1 here also for single file upload.
} ) ;

export { cloudinary , upload } ;