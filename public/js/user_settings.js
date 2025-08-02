import axios from "axios" ; // Can't use without Webpack OR Parcel in Browser.
import alertMsg from "./alert.js" ;
import { setLastRefresh , getLastRefresh } from "./index.js";

export const submitForm = async ( data , type ) => {
    try {
        const url = ( type === 'login' ) ? "/api/users/login" : "/api/users/signup" ; // MISTAKE ; 1st give url in axios THEN configs.
        const res = await axios( url , {
            method: 'POST' ,
            data
        } ) ;
        if( res.data.status === 'success' ) {
            type = ( type === 'login' ) ? 'Logged in' : 'Signed up' ;
            alertMsg( `${type} successfully! Redirecting...` , 'success' ) ;
            window.setTimeout( () => {
                location.assign( '/my-uploads' ) ;
            } , 1500 ) ;
        }
    } catch ( err ) {
        alertMsg( err.response.data.message , 'error' ) ;
    }
}

export const logout = async () => {
    try {
        const response = await axios.get( '/api/users/logout' ) ;
        if( response.data.status === 'success' ) {
            location.reload( true ) ;
            location.href = '/' ;
        }
    }
    catch( err ) {
        alertMsg( err.response.data.message , 'error' ) ;
    }
}


let timer ;
const REFRESH_INTERVAL = 1000 * 60 * 58 ;

const updateToken = async () => {
    try {
        const response = await axios('/api/users/refresh-token', {
            method: 'POST',
            withCredentials: true // Important: send cookies with the request on CORS.
        } ) ;
        if( response.data.status === 'success' ) {
            setLastRefresh( Date.now() ) ;
            startAdjustedTimer() ;  // ? Restart timer with new adjusted time AS it won't be manually reset with new time. So for this used Timeout() instead of Interval() as I am managing timer myself after each API call. Now also don't need to handle firstTime case separately.
            // location.reload( true ) ; // Cookie is updated on browser side, no reload is required.
        }
    }
    catch( err ) {
        console.log( err.response.data.message ) ;
    }
}

export function startAdjustedTimer() {
    const lastRefresh = getLastRefresh() ;
    let elapsed = Date.now() - lastRefresh ; 
    const adjustedTime = Math.max( REFRESH_INTERVAL - elapsed , 0 ) ;
    // console.log( adjustedTime ) ;
    clearTimeout( timer ) ; // Clear previous timer AS setInterval() uses same time for each interval again and again.
    timer = setTimeout( updateToken , adjustedTime ) ;
}