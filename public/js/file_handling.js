import axios from "axios" ;
import alertMsg from "./alert.js" ;

export const uploadFiles = async files => {
    try {
        const response = await axios( '/api/users/uploads' , {
            method: 'POST' ,
            data: files
        } ) ;

        if( response.data.status === 'success' ) {
            alertMsg( 'Files uploaded successfully!' , 'success' ) ;
            window.setTimeout( () => location.reload() , 750 ) ;
        }
    }
    catch( err ) {
        alertMsg( err.response.data.message , 'error' ) ;
    }
} 

export const deleteFile = async id => {
    try {
        const response = await axios.delete(`/api/users/delete-file?deleteToken=${id}`) ;
        if( response.status === 204 )
            alertMsg( 'File deleted successfully!' ) ;
    }
    catch( err ) {
        alertMsg( err.response.data.message , 'error' ) ;
    }
}