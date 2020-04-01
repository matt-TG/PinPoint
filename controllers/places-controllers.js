const uuid=require('uuid/v4'); //here we are also defining what version we want

const fs=require('fs');

const {validationResult}=require('express-validator');

const HttpError=require('../models/http-error');

const getCoordsForAddress=require('../util/location');

const Place=require('../models/place');

const User=require('../models/user');

const mongoose=require('mongoose');


//let DUMMY_PLACES=[{
//    
//    
//    id:'p1',
//    title:'Empire State Building',
//    description: 'One of the most famous skyscrapesrs in the world',
//    imageUrl:'https://www.attractionticketsdirect.de/sites/default/files/imagecache/472x352/empire_state_building5.jpg',
//    address:'20 W 34th St, New York, NY 10001, United States',
//    location:{
//        
//        lat: 40.7484405,
//        lng: -73.9878584
//    },
//    creator: 'u1'
//    
//}];


//NOTE: The right side of these functions were in places-routes.js (as second arguments for router.get() methods) before... we moved them here to apply the Controller logic...that is why I have the commented out sections left here too (some of them wouldn't even work here, because we do not use Express in this file)




const getPlaceById=async  (req,res,next)=>{ //the first argument defined here will be added to the end of the path we define in app.js for this route...so in this case /api/places/:pid
    
    const placeId=req.params.pid; //this is the way to get the concrete id we put in place above as a dynamic value
    
    let place;
    
    try{
        
       place=await Place.findById(placeId); //doesn't return a Promise unless you chain exec() 
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not find a place', 500);
        
        return next(error);
    }

    
    
    if(!place){
        
        
        return next(new HttpError('Could not find a place for this user.', 404));
    }

    
    res.json({place: place.toObject({getters:true})}); //this is a JSON method...place: place can be also just place (default JS, possible when the key and value have the same name)
}


const getPlacesByUserId= async (req,res,next)=>{
    
    const userId=req.params.uid;

    
    let places;
    
    try{
        places=await Place.find({creator:userId}); //Mongoose find() method
        
    } catch(err){
        
        const error=new HttpError('Fetching places failed, please try again later', 500);

        return next(error);
}
    

    
    if(!places || places.length === 0){
        
        
        return next(new HttpError('Could not find a place for this user.', 404));
    }
    
    res.json({places: places.map(place=>place.toObject({getters:true}))
             }); //can't use toObject on an array so we needed to transform each item of an array separately with the map() method
}



const createPlace=async (req, res, next)=>{
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422)); //note: now that we use next() instead of throw (because of asynchronous code) we need to return so that code execution won't continue. With throw returning to stop was not necessary
    }
    
    const {title, description, address} =req.body; //we are not extracting creator property here, because it is more unreliable than the method we are using when setting the value for creator in createdUser below
    
    
    let coordinates;
    
    try{
        
        coordinates=await getCoordsForAddress(address);
        
    } catch(error){
        
        return next(error);
    }
    

const createdPlace=new Place({
    
    title,
    description,
    address,
    location: coordinates, //coordinates... atm the getCoordsForAddress() method doesn't work. Google Geocoding API returns REQUEST DENIED https://stackoverflow.com/questions/3212550/google-geocoding-api-request-denied and the app gives "can't define geometry of undefined"...this error comes from util/locations.js
    image: req.file.path,
    creator: req.userData.userId
});
    
    //use {"lat" : 37.4267861, "lng" : -122.0806032} as location property value above if Geocoding API doesn't work
    
    let user;
    
    try{
        
        user=await User.findById(req.userData.userId); //before we used "creator" here which was extracted from the req.body, but we don't send that property in frontend anymore (Place.js)
        
    } catch(err){
        
        const error=new HttpError('Creating place failed, please try again 1', 500);
        
        return next(error);
    }
    
    if(!user){
        
        const error=new HttpError('Could not find user for provided id', 404);
        
        return next (error);
    }

    
    
    try{
        
//        await createdPlace.save();
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
   
        
        sess.startTransaction();
        
        
        await createdPlace.save({ session: sess});
   
        
        user.places.push(createdPlace); //push() is a Mongoose method here. MongoDB takes the place id behind the scenes and adds it to places
        
        await user.save({ session: sess}); //in addition to the place, we need to save changed user data also. Because we have opened a session and a transaction, we have linked the place and the user together
        
 
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
        
    } catch(err){
        
        const error=new HttpError('Creating place failed, please try again 2', 500);
        
        return next(error);
    }
   
    
    res.status(201).json({place: createdPlace}); //status code 201 means that something was succesfully sent
}


const updatePlace=async (req, res, next)=>{
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    const {title, description}= req.body;
    
    const placeId=req.params.pid;
    
    
    let place;
    
      try {
          
        place = await Place.findById(placeId);
          
      } catch (err) {
          
        const error = new HttpError(
          'Something went wrong, could not update place.',
          500
        );
          
        return next(error);
      }
    
    if(place.creator.toString() !== req.userData.userId){
        
        const error = new HttpError(
          'You are not allowed to edit this place.',
          401
        );
          
        return next(error);
    }
    
    
    place.title=title;
    place.description=description;
    
    
    try{
        
        await place.save(); // probably because of the same id, Mongoose will overwrite old data. With Firebase for example, you would have to delete the old data first (though I haven't tried PATCH request)
        
    } catch(err){
        
        const error=new HttpError('Something went wrong, could not update place', 500);
        
        return next(error);
    }
    
    res.status(200).json({place:place.toObject({getters:true})});
};


    
const deletePlace=async (req, res, next)=>{
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const placeId=req.params.pid;
    
    
    let place;
    
    try{
        
       place=await Place.findById(placeId).populate('creator'); //doesn't return a Promise unless you chain exec(). populate() method can be used only if there are a connection created between places and users (which we have done in place.js and user.js). This basically gives us the full User object linked to this place
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete a place 1', 500);
        
        return next(error);
    }
    
    
    if(!place){
        
        const error=new HttpError('Could not find a place for this id.', 404);
        
        return next(error);
    }
    
    
    
    if(place.creator.id !== req.userData.userId){
        
        const error=new HttpError('You are not allowed to delete this place.', 404);
        
        return next(error);
    }
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();
        
        await place.remove({ session: sess});
        
        place.creator.places.pull(place); //this will tell Mongoose to automatically remove the id...not sure if the "places" here refers to the colection name or places property in "user" collection
        
        await place.creator.save({session:sess});
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
        
        fs.unlink(place.image, (err)=>{}); //deleting location image from our images folder
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete a place 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted a place.'});
};


const deletePlaces=async (req, res, next)=>{
    
    
    const userId=req.params.uid;
    
    
    let places;
    
    try{
        
        places=await Place.find({creator:userId});
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete places 1', 500);
        
        return next(error);
    }
    
    
    if(!places){
        
        const error=new HttpError('Could not find a place for this id.', 404);
        
        return next(error);
    }

        if(places[0].creator.toString() !== userId){ //req.userData comes from localStorage...so the req carries localStorage items in it
        
            const error=new HttpError('You are not allowed to delete these places.', 404);
            
            return next(error);
        }
    
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();

        if(places.length===1){

            await places[0].remove({ session: sess});

        } else{

            for(place of places){
            
                await place.remove({ session: sess}); 
             }
        }

        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
    
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete places 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted places.'});
};

exports.getPlaceById=getPlaceById;
exports.getPlacesByUserId=getPlacesByUserId;
exports.createPlace=createPlace;exports.updatePlace=updatePlace;
exports.deletePlace=deletePlace;
exports.deletePlaces=deletePlaces;

