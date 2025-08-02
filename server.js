import "dotenv/config" ;
import mongoose from "mongoose" ;
import app from "./app.js" ;

process.on( 'uncaughtException' , err => {
    console.log( err.name , err.message ) ;
    console.log('Uncaught Exception! Shutting down...') ;
    process.exit( 1 ) ;    
} ) ;

const DB = process.env.DATABASE_URL.replace( '<db_password>' , process.env.DATABASE_PASS ) ;
mongoose.connect( DB ).then( () => console.log( 'DB connection successful!' ) ) ;
const port = process.env.PORT || 3000 ;
const server = app.listen( port , () => {
    console.log( `Server running on http://127.0.0.1:${port}...` ) ;
} ) ;

app.on( 'uncaughtRejection' , err => {
    console.log( err.name , err.message ) ;
    console.log('Uncaught Rejection! Shutting down gracefully...') ;
    server.close( () => process.exit( 1 ) ) ;
} ) ;