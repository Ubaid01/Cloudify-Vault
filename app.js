/* const path = require('path.cjs') ; // Can use Legacy Imports by renaming file to .cjs for CommonJS OR .mcjs FOR ES6-modules
OR BY custom require.
    import { createRequire } from 'module'; 
    const require = createRequire(import.meta.url);

    const legacyMiddleware = require('./legacy-module');

    import { fileURLToPath } from 'url';
    __filename and __dirname are NOT available in ES6-modules so define manually.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    console.log('__dirname:', __dirname);

    --> For app.all('*') OR optional parameters routing error. Use Express-5 versions: 
        https://github.com/pillarjs/path-to-regexp#errors
*/

import path from 'node:path' ;
import express from 'express' ;
import helmet from 'helmet';
import compression from 'compression' ;
import cors from 'cors' ;
import mongoSanitize from 'express-mongo-sanitize' ;
import rateLimit from 'express-rate-limit' ;
import hpp from 'hpp' ;
import xss from 'xss-clean' ;
import cookieParser from 'cookie-parser' ;
import viewRouter from './routes/view_routes.js' ;
import userRouter from './routes/user_routes.js' ;
import { InvokeError } from './utils/capture_errors.js' ;

const app = express() ;
const __dirname = import.meta.dirname ;

// ? Since in Express5 ; req.query is immutable AND is read-only SO this prevents modification of req.query, which causes errors WITH xss() OR mongoSanitize() AS they modify req.params, req.query, req.body etc. SO we redefined the "query-prop" of request-object.
app.use( ( req , res , next ) => {
    Object.defineProperty( req , 'query', {
        ...Object.getOwnPropertyDescriptor(req, 'query'),
        value: req.query , // Reassign the value of `query` to itself (or a modified version)
        writable: true,
    } ) ;
    next();
} ) ;

app.use( helmet.contentSecurityPolicy ( {
    directives: {
        // defaultSrc: ["'self'"], // Allow resources from the same origin
        // scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://res.cloudinary.com"], // Allow scripts from Cloudinary (or any CDN)
        imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],  // Allow hosted Cloudinary images and data for overview.pug.
        connectSrc: ["'self'"], // API Connections via Axios.
    }
} ) ) ;

app.use( compression() ) ;
app.use( mongoSanitize() ) ;
app.use( cors() ) ;
app.use( hpp( { whitelist:['deleteToken'] } ) ) ;
app.use( xss() ) ;
app.use( express.json( { limit: '10kb' } ) ) ;
app.use( cookieParser() ) ;
app.set( 'view engine' , 'pug' ) ;
app.set( 'views' , path.join( __dirname , 'views' ) ) ;
app.use( express.static( path.join( __dirname , 'public' ) ) ) ;

const limiter = rateLimit( {
    max: 50,
    windowMs: 60 * 60 * 1000,
    message: {
        status: 'error',
        message: 'Too many request are being made currently! Please try again after some time.'
    }
} ) ;

app.use( '/api' , limiter ) ;
app.use( '/', viewRouter ) ;
app.use( '/api/users' , userRouter ) ;
app.all( '/{*path}' , ( req , res , next ) => { // MISTAKE ; Use all() NOT use(). Can use '{*path}' also.
    // console.log( req.params.path ) ;
    next( new InvokeError( `Can't find ${req.url} route on this server!` , 404 ) ) ;
} ) ;
app.use( ( err, req, res, next ) => {
    err.statusCode = err.statusCode || 500 ;
    err.status = err.status || 'error' ;
    if( req.originalUrl.startsWith( '/api' ) ) {
        return res.status( err.statusCode ).json( {
            status: err.status,
            message: err.message,
            err
        } ) ;
    }
    res.status( err.statusCode ).render( 'error' , { err } ) ;
} ) ;

export default app ;