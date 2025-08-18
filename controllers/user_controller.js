import User from '../models/user_model.js' ;
import multer from 'multer' ;
import sharp from 'sharp' ;
import { cloudinary , upload } from '../utils/cloudinary_config.js';
import { InvokeError , catchAsync } from '../utils/capture_errors.js' ;

const multerFilter = ( req , file , cb ) => {
    if( file.mimetype.startsWith('image/') )
        cb( null , true ) ;
    else
        cb( new InvokeError( 'Image file is required for profile. Unknown file type given!' , 400 ) , false ) ;
}

const imageUpload = multer( {
    storage: multer.memoryStorage() ,
    fileFilter: multerFilter
} ) ;

export const uploadImage = imageUpload.single( 'photo' ) ;
export const preprocessImage = catchAsync( async( req , res , next ) => {
    if( !req.file )
        return next() ;    

    req.file.filename = `user_${ Date.now() }.jpg` ;
    await sharp( req.file.buffer).resize( 500 , 500 , { fit: 'contain' } ).jpeg( { quality: 90 } ).toFile( `./public/img/users/${ req.file.filename }` ) ;
    next() ;
} ) ;

export const getAllUsers = catchAsync( async ( req , res ) => {
    const users = await User.find().exec() ;
    res.status(200).json( {
        status: 'success',
        results: users.length,
        data: {
            users
        }
    } ) ;
} ) ;

export const createUser = catchAsync( async( req , res ) => {
    const newUser = await User.create( req.body ) ;
    res.status(201).json( {
        status: 'success',
        data: {
            user: newUser
        }
    } ) ;
} ) ;

export const getUser = catchAsync( async( req , res , next ) => {
    const user = await User.findById( req.params.id ).exec() ;
    
    if( !user )
        return next( new InvokeError( 'No user found with that ID' , 404 ) ) ;

    res.status(200).json( {
        status: 'success',
        data: {
            user
        }
    } ) ;
} ) ;

export const getUserStats = catchAsync( async( req , res , next ) => {
    // const start = Date.now() ;
    const stats = await User.aggregate( [
        // Reduced memory usage and I/O by using required fields. ( This helped a lot for large datasets. )
        { 
            $project: {
                email: 1,
                'fileUploads.url': 1
            }
        },
        {
            $unwind: { path: '$fileUploads' }
        },
        {
            $addFields: {
                ext: {
                    $last: {
                        $split: ['$fileUploads.url', '.']
                    }
                }
            }
        },
        {
            $group: {
                _id: '$ext',
                count: { $sum: 1 },
                tempUsers: { $push: '$email' } // No need use "$addToSet" as emails are unique so get directly.
            }
        },
        {
            $sort: { count: -1 }
        },
        {
            $group: {
                _id: null,
                stats: {
                    $push: {
                        ext: '$_id',
                        count: '$count'
                    }
                },
                users: { $push: '$tempUsers' } // Made array of all users collected for "$setUnion".
            }
        },
        {
            $project: {
                stats: 1,
                users: {
                    $reduce: {
                        input: '$users' , // Give <array-of-arrays> MUST.
                        initialValue: [],
                        in: { $setUnion: ['$$value', '$$this'] } // $setUnion merges both arrays and removes duplicates giving flat array.
                    }
                }
            }
        },
        {
            $project: {
                stats: 1,
                usersCount: { $size: '$users' }
            }
        },
        // {
        //     $limit: 6
        // }
    ] ) ;
    // res.status(200).json( {
    //     status: 'success',
    //     data: {
    //         stats
    //     }
    // } ) ;
    const result = ( stats.length > 0 ) ? stats[0] : { stats: [], totalUsersCount: 0 } ;
    res.locals.stats = ( result.stats.length > 6 ) ? result.stats.slice( 0, 6 ) : result.stats ;
    res.locals.totalUsers = result.usersCount ;
    res.locals.totalFiles = result.stats.reduce( ( acc , cur ) => acc + cur.count , 0 ) ;
    // console.log( `Query took ${ Date.now() - start } ms` ) ; // .explain() is unsupported due to writeConcern, so did manually.
    next() ;
} ) ;

export const deleteUser = catchAsync( async( req , res , next ) => {
    const user = await User.findByIdAndDelete( req.params.id ).exec() ;
    if( !user )
        return next( new InvokeError( 'No user found with that ID' , 404 ) ) ;

    res.status(204).json( {
        status: 'success',
        data: null
    } ) ;
} ) ;

export const allowedFiles = catchAsync( async( req , res , next ) => {
    const curUploads = req.user.fileUploads || [] ;
    if( curUploads.length >= 10 )
        return next( new InvokeError( 'Your upload limit has been reached.Please delete some files OR upgrade your account!' , 400 ) ) ;

    req.fileCap = 10 - curUploads.length ;
    next() ;
} ) ;

export const uploadFiles = ( req , res , next ) => {
    const multerMiddleware = upload.array( 'files' , req.fileCap ) ;
    multerMiddleware( req , res , next ) ; // Will call next() internally.
    // multerMiddleware(req, res, (err) => {
    //     if (err) return next(err);
    //     next();
    // });
}

export const addUploads = catchAsync( async ( req , res , next ) => {
    if( !req.files || req.files.length === 0 )
        return next( new InvokeError( 'No files found for upload!' , 400 ) ) ;

    const newFiles = req.files.map( file => {
        const match = file.path.match( /res\.cloudinary\.com\/[^/]+\/([^/]+)\/upload/ ) ; // ! "resource_type" required for uploader.destroy() BUT not for uploader.upload().
        const resourceType = match ? match[1] : 'raw' ;
        return {
            public_id: file.filename ,
            size: file.size ,
            resource_type: resourceType ,
            url: file.path
        }
    } ) ;
    req.user.fileUploads = req.user.fileUploads.concat( newFiles ) ;
    await req.user.save() ;
    res.status( 200 ).json( {
        status: 'success' ,
        data: {
            files: req.files.map( file => file.originalname )
        }
    } ) ;
} ) ;

export const deleteUploads = catchAsync( async ( req , res , next ) => {
    const { deleteToken } = req.query ;
    if( !deleteToken )
        return next( new InvokeError( 'No delete token was specified' , 400 ) ) ;

    const idx = req.user.fileUploads.findIndex( file => file.delete_token === deleteToken ) ;
    if ( idx === -1 )
        return next( new InvokeError('No Uploaded file found with that ID.', 404 ) ) ;

    const file = req.user.fileUploads[idx] ;
    const response = await cloudinary.uploader.destroy( file.public_id, {
        resource_type: file.resource_type ,
        invalidate: true  // To delete from cached on CDN also but backup will remain intact.
    } ) ;  // If its not an image OR of delivery type 'upload', you need to include the resource_type

    if ( response.result !== 'ok' )
        return next(new InvokeError( 'Something went wrong while deleting the file', 500 ) ) ;

    req.user.fileUploads.splice( idx , 1 ) ;
    await req.user.save() ;

    const { resources } = await cloudinary.api.resources( {
        type: 'upload',
        prefix: 'cloud_uploads_folder/',
        max_results: 1
    } );

    if ( !resources.length )
        await cloudinary.api.delete_folder('cloud_uploads_folder') ; // As this will only pass if the folder is empty.

    res.status(204).json( {
        status: 'success',
        data: null
    } ) ;
} ) ;