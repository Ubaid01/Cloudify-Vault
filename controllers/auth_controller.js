import jwt from 'jsonwebtoken' ;
import User from '../models/user_model.js';
import { InvokeError , catchAsync } from '../utils/capture_errors.js' ;

// const sec = crypto.randomBytes(16).toString('hex') ;
// console.log( sec ) ;

const signToken = ( id , secret , expiresIn ) => {
    return jwt.sign( { id }, secret, { expiresIn } ) ;
} ;

const createSendToken = ( user, res , statusCode = 200 ) => {
    const accessToken = signToken( user._id , process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN ) ;
    const refreshToken = signToken( user._id , process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN ) ;

    res.cookie( 'jwt' , accessToken, {
        // expires: Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 3600000 , // Error: option "expires" is invalid as needed object NOT timestamp.
        expires: new Date( Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 3600000 ) ,
        httpOnly: true ,
        sameSite: 'strict' ,
        secure: process.env.NODE_ENV === 'production'
    } ) ;

    res.cookie( 'refreshJwt', refreshToken, {
        maxAge: parseFloat( process.env.JWT_COOKIE_REFRESH_EXPIRES_IN ) * 24 * 3600000, // Directly in day seconds from now. Date.now() useful for absolute time.
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/users/refresh-token'  // Browser will only send this cookie with requests made to this path or nested.
    } ) ;

    user.password = undefined ;
    res.status( statusCode ).json( {
        status: 'success',
        token: accessToken, // MISTAKE ; I was not sending token as response for setting up via POSTMAN script. Also for req.cookies ; install cookieParser.
        data: { user }
    } ) ;
} ;

export const refreshToken = catchAsync( async (req, res, next) => {
    let decoded;
    try {
        decoded = jwt.verify( req.cookies.refreshJwt , process.env.JWT_REFRESH_SECRET ) ;
    } 
    catch (err) {
        return next( new InvokeError('Invalid refresh token. Please log in again.', 406) ) ;
    }

    const user = await User.findById(decoded.id).exec() ;
    if ( !user )
        return next( new InvokeError( 'User not found. Please log in again.', 401 ) ) ;

    // Generate new access token
    const accessToken = signToken(user._id, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN);
    res.cookie( 'jwt' , accessToken , {
        expires: new Date( Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 3600000 ) ,
        httpOnly: true,
        sameSite: 'strict' ,
        secure: process.env.NODE_ENV === 'production' ,
    } ) ;

    req.user = user ;
    res.locals.user = user ;
    // next() ; // MUST call next() to returns to protect's caller.
    res.status(200).json({
        status: 'success' ,
        token: accessToken ,
    } ) ;
} ) ;

export const signup = catchAsync( async( req , res , next ) => {
    // delete req.body.role ;
    const { name , email , password , passwordConfirm } = req.body ;
    if( !name || !email || !password || !passwordConfirm )
        return next( new InvokeError( 'Name , Email OR Password was unspecified. Try again!' , 400 ) ) ;

    let photo = 'default.jpg' ;
    if( req.file )
        photo = req.file.filename ;

    const newUser = await User.create( { name , email , photo , password , passwordConfirm } ) ;
    createSendToken( newUser , res , 201 ) ;
} ) ;

// .exec() makes the query return a real Promise, enabling better error handling and async/await support.
export const login = catchAsync( async ( req , res , next ) => {
    const { email , password } = req.body ;
    if( !email || !password )
        return next( new InvokeError( 'Email OR Password was unspecified. Try again!' , 400 ) ) ;

    const user = await User.findOne( { email } ).select('+password').exec() ;
    if( !user || ! await user.checkPassword( password ) )
        return next( new InvokeError( 'Incorrect email OR password.' , 401 ) ) ;
    
    createSendToken( user , res ) ;
} ) ;

export const logout = (req, res) => {
    res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    } ) ;
    res.clearCookie('refreshJwt', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/users/refresh-token'
    } ) ;
    res.status(200).json( { status: 'success' } ) ;
} ;

export const protect = catchAsync( async ( req , res , next ) => {
    let token ;
    if( req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer') )
        token = req.headers['authorization'].split(' ')[1] ;
    else if( req.cookies.jwt )
        token = req.cookies.jwt ;

    if( !token )
        return next( new InvokeError( 'You are not logged in! Please log in to get access.' , 401 ) ) ;

    let decoded ;
    try {
        decoded = jwt.verify( token , process.env.JWT_SECRET ) ; // Synchronously verify.
    }
    catch( err ) {
        // if( req.cookies.refreshJwt && err.name === 'TokenExpiredError' )
        //     return refreshToken( req , res , next ) ;

        return next( new InvokeError( 'Invalid token. Please log in to get access.' , 401 ) ) ;
    }
      
    const user = await User.findById( decoded.id ).exec() ;
    if( !user )
        return next( new InvokeError( 'The user does not exist, so please log in again to get access.' , 401 ) ) ;

    req.user = user ;
    res.locals.user = user ; // ? Don't put this ON "req" BUT response TO all renderers.
    next() ;
} ) ;

export const isLoggedIn = catchAsync( async( req , res , next ) => {
    if( !req.cookies.jwt )
        return next() ;
    
    let decoded ;
    try {
        decoded = jwt.verify( req.cookies.jwt , process.env.JWT_SECRET ) ;
        const user = await User.findById( decoded.id ).exec() ;
        if( !user )
            return next() ;
        res.locals.user = user ;
    }
    catch( err ) {
        return next() ;
    }
    next() ;    
} ) ;

export const isAdmin = ( req , res , next ) => {
    if( req.user.role !== 'admin' )
        return next( new InvokeError( 'You do not have permission to perform this action.' , 403 ) ) ;
    next() ;
}  ;