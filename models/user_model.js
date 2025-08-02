import mongoose from "mongoose" ;
import bcrypt from 'bcrypt' ;
import crypto from 'crypto' ;
// import { v4 as uuidv4 } from 'uuid' ;

const uploadSchema = new mongoose.Schema( {
    // Only used this so it can be indexed ELSE can extract from path also.
    public_id: {
        type: String ,
        unique: true ,
        sparse: true ,  // MISTAKE ; Now using this MongoDB will only apply the unique constraint to documents where url exists, ignoring null. BUT still it will be global SO give with userSchema.
        required: true 
    },
    resource_type: {
        type: String,
        required: true
    } ,
    // ? Used this so it is passed as data-attribute to expose on front-end.
    delete_token: {
        type: String ,
        unique: true,
        sparse: true ,
        // default: () => crypto.randomBytes(16).toString('hex')  // Can be non-unique some minor-times also.
        default: crypto.randomUUID // uuidv4() OR 128 bit number with 122 random bits. hex-len = 36.
    },
    size: Number,
    url: {
        type: String,
        required: true
    }
} ,
{
    _id: false, // No separate _id for each file
    timestamps: true
} ) ;

const userSchema = new mongoose.Schema( {
    name: {
        type: String,
        trim: true ,
        default: 'Anonymous User'
    } ,
    email: {
        type: String ,
        unique: true , // As this will also create an index so don't duplicate below.
        lowercase: true ,
        required: [true , 'Please provide an email'] ,
        validate: {
            validator: function (value) {
                return /^[a-zA-Z0-9](\.?[a-zA-Z0-9_\-+%])*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(value)
            } ,
            message: props => `${props.value} is not a valid email address`
        }
    } ,
    photo: {
        type: String ,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: {
            values: ['user' , 'admin'] ,
            message: '{VALUE} is not a valid role'
        } ,
        default: 'user'
    },
    password: {
        type: String,
        select: false ,
        min: [8, 'Password must be at least 8 characters long'] ,
        required: [true , 'Please provide a password']
    } ,
    passwordConfirm: {
        type: String,
        select: false ,
        required: [true , 'Please confirm your password'] ,
        validate: {
            validator: function (value) {
                return value === this.password
            } ,
            message: 'Passwords do not match'
        }
    } ,
    fileUploads: [uploadSchema]
} ) ;

// userSchema.index( { email: 1 } , { unique: true } ) ;

userSchema.pre('save', async function ( next ) {
    if( !this.isModified('password') ) return next() ;
    this.password = await bcrypt.hash( this.password , 10 ) ;
    this.passwordConfirm = undefined ;
    next()
} ) ;

userSchema.pre( /^find/ , function( next ) {
    this.select('-__v') ;
    next() ;
} ) ;

userSchema.methods.checkPassword = async function( givenPassword ) {
    return await bcrypt.compare( givenPassword , this.password ) ;
}

const User = mongoose.model('User' , userSchema) ;
export default User