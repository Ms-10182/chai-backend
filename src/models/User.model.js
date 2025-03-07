import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = mongoose.Schema(
    {
    username:{
        type:String,
        required: true,
        unique:true,
        lowercase: true,
        trim:true,
        indexed:true,
    },
    email:{
        type:String,
        required: true,
        unique:true,
        lowercase: true,
        trim:true,
    },
    fullName:{
        type:String,
        required: true,
        lowercase: true,
        trim:true,
        indexed:true,
    },
    avatar:{
        type:String,
        // required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,"password is required"],
    },
    refreshToken:{
        type:String,
    }

},{timestamps:true})

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = async function (){
    //both jwt token
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
    )
}

userSchema.methods.generaterefreshToken = async function(){
    //both jwt token
    return jwt.sign({
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model("User",userSchema)