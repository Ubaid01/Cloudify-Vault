// Why to use buffer to get file type AS user can manipulate the mimetype AND extension of the file before uploading AS those are sent by client. Further explanation can be found on :   https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l

/* Output of fileTypeFromBuffer.
    {
        asset_id: '7758287ba67d971e98537ec7a4d66725',
        public_id: 'cloud-path',
        version: 1753958341,
        version_id: 'cd67b89dd0b2e2c69dca72cfc2b51d41',
        signature: '0886119cf8ec92c34eabe3fdcc76ab253deee758',
        width: 800,
        height: 600,
        format: 'png',
        resource_type: 'image',
        created_at: '2025-07-31T10:39:01Z',
        tags: [],
        bytes: 234657,
        type: 'upload',
        etag: '2361bc1bcb03503599202653eb5a0628',
        placeholder: false,
        url: 'Cloudinary-URL',       
        secure_url: 'fileTypes-URL',
        asset_folder: 'cloud_uploads_folder',
        display_name: 'test_image_1753958338937',
        original_filename: 'file',
        api_key: '...'
    }
*/

// file.stream = Readable.from(buffer) ; // <-- required for Cloudinary as we had exhausted the stream by reading it so replace it. ( Streams in Node.js are one-time readable unless manually reset. )

// router.post( '/uploads', userController.allowedFiles, userController.uploadFiles, userController.validateFileType , userController.uploadToCloudinary, userController.addUploads ) ;

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary' ;
import { fileTypeFromBuffer } from 'file-type';
import { InvokeError , catchAsync } from '../utils/capture_errors.js' ;

// Use multer memory storage so files are available as buffers.
const upload = multer( { storage: multer.memoryStorage() } ) ;

cloudinary.config( {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
} ) ;

export const allowedFiles = catchAsync( async( req , res , next ) => {
    const curUploads = req.user.fileUploads || [] ;
    if( curUploads.length >= 8 )
        return next( new InvokeError( 'Your upload limit has been reached!' , 400 ) ) ;

    req.fileCap = 8 - curUploads.length ;
    next() ;
} ) ;

export const uploadFiles = ( req , res , next ) => {
    const multerMiddleware = upload.array( 'files' , req.fileCap ) ;
    multerMiddleware( req , res , next ) ; // Will call next() internally.
}

export const validateFileType = catchAsync( async (req, res, next) => {
    const checkExts  = ['exe', 'bat', 'sh', 'bin', 'cmd', 'cpl', 'js', 'py'] ;
    const files = req.files || [];
    
    for ( const file of files ) {
      const type = await fileTypeFromBuffer(file.buffer) ;
      if ( !type || checkExts.includes( type.exts ) )
        return next( new InvokeError('Invalid file type detected', 400) ) ;
      
      // Optionally, you can replace the mimetype and extension here if you want
      file.detectedMimeType = type.mime;
      file.detectedExtension = type.ext;
    }
    
    next();
} ) ;

// Use "fileTypeFromBuffer" to detect the real type of the file by inspecting the file's binary signature (magic number)
export const uploadToCloudinary = (req, res, next) => {
    const uploadResults = [] ;
    const files = req.files || [] ;
    let completed = 0 ;

    if ( !files.length )
        return next( new InvokeError('No files to upload', 400) ) ;

    files.forEach((file, index) => {
        
        // 1st build Cloudinary config for the upload.
        const ext = file.detectedExtension;
        const config = {
            folder: 'cloud_uploads_folder',
            public_id: file.originalname.split('.')[0] + "_" + Date.now(),
            format: ext,
            resource_type: 'auto'
        } ;

        if ( file.detectedMimeType.startsWith('image/') ) {
            config.transformation = [
                { width: 800, height: 600, crop: 'fill', quality: 90 }
            ];
        } 
        else if ( file.detectedMimeType.startsWith('video/') ) {
        config.format = 'mp4';
            config.transformation = [
                {
                width: 480,
                crop: 'limit',
                quality: 'auto:eco',
                fetch_format: 'auto'
                }
            ];
        }

        // 2nd create upload stream with the config and a callback to handle response
        const stream = cloudinary.uploader.upload_stream( config, (error, result) => {
            if ( error )
                return next( new InvokeError('Cloudinary upload failed: ' + error.message, 500 ) ) ;

            uploadResults[index] = result ;
            completed++ ;
            // Check if all streams have been properly made OR not.
            if ( completed === files.length ) {
                req.uploadResults = uploadResults ;
                next() ;
            }
        } ) ;
        stream.end(file.buffer) ;
    } ) ;
};

export const addUploads = catchAsync( async (req, res, next) => {
    const newFiles = req.uploadResults.map( file => ( {
        size: file.bytes ,
        url: file.secure_url
    } ) ) ;

    req.user.fileUploads = req.user.fileUploads.concat(newFiles) ;
    await req.user.save() ;

    res.status(200).json( {
        status: 'success',
        data: {
            files: req.uploadResults.map( file => file.original_filename )
        }
    } ) ;
} ) ;
