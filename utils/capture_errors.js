export const catchAsync = fn => {
    return ( req , res , next ) => {
        Promise.resolve( fn( req , res , next ) ).catch( next ) ;
    }
}

export class InvokeError extends Error {
    constructor( msg , code ) {
        super( msg ) ;
        this.statusCode = code ;
        this.status = ( code >= 400 && code < 500 ) ? 'fail' : 'error' ;
        Error.captureStackTrace( this , this.constructor ) ;
    }
} ;