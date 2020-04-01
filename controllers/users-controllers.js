const uuid=require('uuid/v4');

const bcrypt=require('bcryptjs');

const jwt=require('jsonwebtoken');

const HttpError=require('../models/http-error');

const {validationResult}=require('express-validator');

const User=require('../models/user');

const mongoose=require('mongoose');


const getUsers= async (req, res, next) =>{

    
    let users;
    
    try{
        
         users= await User.find( {}, '-password'); //or 'email name' which would include email and name, the one we use now excludes password 
        
    } catch(err){
        
        const error=new HttpError('Fetching users failed', 500);
        
        return next(error);
    }
  
    res.json( {users: users.map(user=> user.toObject({ getters: true })
                               )
              });
}


const signup=async (req, res, next) =>{
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422)); //can't use throw here, because we are inside an asynchronous task (the whole function is asynchronous block)
    }
    
    const {name, email, password}=req.body;
    
    
    let existingUser;
    
    try{
        
        existingUser=await User.findOne({email: email});
        
        
    } catch(err){
        
        const error=new HttpError('Signing up failed, please try again later', 500);
        
        return next(error);
    }
    
    if(existingUser){
        
        const error=new HttpError('User exists already, please login instead', 422);
        
        return next(error);
    }
    
    
    let hashedPassword;
    
    try{
        
        hashedPassword= await bcrypt.hash(password, 12); //also note that ideally the password is transmitted to the server side at this point via https request. Second argument is so called "salting rounds", it defines how strong the hash is...with 12 the password can't be reverse engineered, but doesn't take hours to generate either
        
    } catch(err){
        
        const error=new HttpError('Could not create user, please try again', 500);
        
        return next(error);
    }
    
    const stringPath=String(req.file.path); //needed to do this or otherwise deployed app was giving "Unexpected token < in JSON at position 0" error...in localhost no such error appeared
    
    
    const createdUser= new User({
        
        name,
        email,
        image: stringPath,
        password: hashedPassword,
        places: [],
        events: [],
        comments: []
    });
    
    //WITH COMMENTS
    
//       const createdUser= new User({
//        
//        name,
//        email,
//        image: req.file.path, //this comes from Multer. req has file property when a file is attached to a request and the path property points to its relative path so in this case /uploads/images/{theFileNameOfTheImage}...images in our backend will be stored in this location... notice that we need to provide a full path in UserItem.js at frontend side in Avatar component for the imae to show in the app
//        password: hashedPassword, //you should not store non decrypted password to your database...that is why we hash our password here
//        places: [] //starting value for user created places when creating a new user
//    });
    
    
     try{
        
        await createdUser.save();
        
    } catch(err){
        
        
        const error=new HttpError('Signing up failed, please try again', 500);
        
        return next(error);
    }
    
    let token;
    
    try{
        
        token=jwt.sign({userId: createdUser.id, email: createdUser.email}, process.env.JWT_KEY, {expiresIn: '1h'}); //the second argument is so called "private key". Only server side knows this. So even if someone manages to decrypt the password in the front-end side the token wouldn't be right without knowing the private key. See json web token documentation for the third argument (instructions 93) ). process.env.JWT_KEY is from nodemon.json (process is Node.js way of accessing the file and env is the property set there)
        
    } catch(err){
        
        const error=new HttpError('Signing up failed, please try again', 500);
        
        return next(error);
    }
    
                          
    res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token, image: createdUser.image});

    
}


const login=async (req, res, next) =>{
    
    const {email, password}=req.body;

    
    let existingUser;
    
    try{
        
        existingUser=await User.findOne({email: email});
        
    } catch(err){
        
        const error=new HttpError('Logging in failed, please try again later', 500);
        
        return next(error);
    }

    
    if(!existingUser){
        
        const error=new HttpError('Invalid credentials, could not log you in', 403);
        
        return next(error);
    }
    
    
    
    let isValidPassword=false;
    
    try{
        
        isValidPassword=await bcrypt.compare(password, existingUser.password); //returns a boolean, returns false even if this fails. compare() is bcrypt method which is able to see if string format password has the origin in the text format password the user provided.
    
        
    } catch(err){
        
        const error=new HttpError('Could not log you in, please check your credentials and try again');
        
        return next(error);
    }
    
    if(!isValidPassword){ // we are doing this check to see if the password existed.
        
        const error=new HttpError('Invalid credentials, could not log you in.', 403);
        
        return next(error);
    }
    
    
    let token;
    
    try{
        
        token=jwt.sign({userId: existingUser.id, email: existingUser.email}, process.env.JWT_KEY, {expiresIn: '1h'}); //the second argument is so called "private key". Only server side knows this. So even if someone manages to decrypt the password in the front-end side the token wouldn't be right without knowing the private key. See json web token documentation for the third argument (instructions 93) ). process.env.JWT_KEY is from nodemon.json (process is Node.js way of accessing the file and env is the property set there)
        
    } catch(err){
        
        const error=new HttpError('Logging in failed, please try again', 500);
        
        return next(error);
    }
    
    
    res.status(201).json({userId: existingUser.id, email: existingUser.email, token: token, image: existingUser.image});
    
}

const deleteUser=async (req, res, next)=>{
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const userId=req.params.uid;
    
    
    let user;
    
    try{
        
        user=await User.findById(userId);
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete the user 1', 500);
        
        return next(error);
    }
    
    
    if(!user){
        
        const error=new HttpError('Could not find the user for this id.', 404);
        
        return next(error);
    }

    
    
    if(user.id !== userId){
        
        const error=new HttpError('You are not allowed to delete this user.', 404);
        
        return next(error);
    }
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();
        
        await user.remove({ session: sess});

        // await user.save({session: sess});
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete the user 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted the user.'});
};


exports.getUsers=getUsers;
exports.signup=signup;
exports.login=login;
exports.deleteUser=deleteUser;