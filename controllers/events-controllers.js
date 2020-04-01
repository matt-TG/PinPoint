const uuid=require('uuid/v4'); //here we are also defining what version we want

const fs=require('fs');

const {validationResult}=require('express-validator');

const HttpError=require('../models/http-error');

const getCoordsForAddress=require('../util/location');

const Event=require('../models/event');

const User=require('../models/user');

const Comment=require('../models/comment');

const mongoose=require('mongoose');


//NOTE: The right side of these functions were in places-routes.js (as second arguments for router.get() methods) before... we moved them here to apply the Controller logic...that is why I have the commented out sections left here too (some of them wouldn't even work here, because we do not use Express in this file)




const getEventById=async  (req,res,next)=>{ //the first argument defined here will be added to the end of the path we define in app.js for this route...so in this case /api/places/:pid
    
    const eventId=req.params.eid; //this is the way to get the concrete id we put in place above as a dynamic value
    
    let event;
    
    try{
        
       event=await Event.findById(eventId); //doesn't return a Promise unless you chain exec() 
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not find an event', 500);
        
        return next(error);
    }
    

    
//    const place=DUMMY_PLACES.find(p=> p.id === placeId); //not using this after connecting to a database
    
    
    if(!event){
        
        return next(new HttpError('Could not find an event for the provided id.', 404));
    }
    
    
    res.json({event: event.toObject({getters:true})}); //this is a JSON method...place: place can be also just place (default JS, possible when the key and value have the same name)
}


const getEventsByUserId= async (req,res,next)=>{
    
    const userId=req.params.uid;

    let events;
    
    try{
        events=await Event.find({creator:userId}); //Mongoose find() method
        
    } catch(err){
        
        const error=new HttpError('Fetching events failed, please try again later', 500);

        return next(error);
}
    

    
    if(!events || events.length === 0){
        
        
        return next(new HttpError('Could not find an event for the provided id.', 404));
    }
    
    res.json({events: events.map(event=>event.toObject({getters:true}))
             }); //can't use toObject on an array so we needed to transform each item of an array separately with the map() method
}



const createEvent=async (req, res, next)=>{
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422)); //note: now that we use next() instead of throw (because of asynchronous code) we need to return so that code execution won't continue. With throw returning to stop was not necessary
    }
    
    const {title, description, address, link, date} =req.body; //we are not extracting creator property here, because it is more unreliable than the method we are using when setting the value for creator in createdUser below
    
    
    let coordinates;
    
    try{
        
        coordinates=await getCoordsForAddress(address);
        
    } catch(error){
        
        return next(error);
    }
    

const createdEvent=new Event({
    
    title,
    description,
    address,
    location: coordinates, //coordinates... atm the getCoordsForAddress() method doesn't work. Google Geocoding API returns REQUEST DENIED https://stackoverflow.com/questions/3212550/google-geocoding-api-request-denied and the app gives "can't define geometry of undefined"...this error comes from util/locations.js
    image: req.file.path,
    creator: req.userData.userId,
    link,
    date,
    comments: []
});
    
    //use {"lat" : 37.4267861, "lng" : -122.0806032} as location property value above if Geocoding API doesn't work
    
    let user;
    
    try{
        
        user=await User.findById(req.userData.userId); //before we used "creator" here which was extracted from the req.body, but we don't send that property in frontend anymore (Place.js)
        
    } catch(err){
        
        const error=new HttpError('Creating event failed, please try again 1', 500);
        
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
        
        await createdEvent.save({ session: sess});
        
        user.events.push(createdEvent); //push() is a Mongoose method here. MongoDB takes the place id behind the scenes and adds it to places
        
        await user.save({ session: sess}); //in addition to the place, we need to save changed user data also. Because we have opened a session and a transaction, we have linked the place and the user together
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
        
    } catch(err){

        
        const error=new HttpError('Creating event failed, please try again 2', 500);
        
        return next(error);
    }
   
    
    res.status(201).json({event: createdEvent}); //status code 201 means that something was succesfully sent
}


const createComment=async (req, res, next)=>{
    
    const errors=validationResult(req);
    
    
    if(!errors.isEmpty()){

        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    
    const {comment, eventId, image} =req.body;
    
    let event;
    
    
    try{
        
        event=await Event.findById(eventId);;
        
    } catch(err){
        
        const error=new HttpError('Creating event failed, please try again 1', 500);

        return next(error);
        
    }
    
    if(!event){
        
        const error=new HttpError('Could not find event for provided id', 404);

        return next (error);
    }
    
    
    let user;
    
    try{
        
        user=await User.findById(req.userData.userId); //before we used "creator" here which was extracted from the req.body, but we don't send that property in frontend anymore (Place.js)
        
    } catch(err){
        
        const error=new HttpError('Creating event failed, please try again 1', 500);
        
        return next(error);
    }
    
    if(!user){
        
        const error=new HttpError('Could not find user for provided id', 404);
        
        return next (error);
    }

    
    const newDate=new Date();

    
    let emptyString='';
    
    emptyString+=newDate.getFullYear();

    emptyString=emptyString+'-'+(Number(newDate.getMonth())+1);

    emptyString=emptyString+'-'+newDate.getDate();

    
    
    
    const createdComment=new Comment({
        comment,
        creator: req.userData.userId, //can't use this one for some reason...same thing in comment.js, if I just have comment property there I can send the comment to the database...need to figure out what is wrong with the other properties
        event: eventId,
        commentBy: user.name,
        posted: emptyString,
        image: image
    });
    
    
    
    try{
        
        const sess=await mongoose.startSession();
        
        sess.startTransaction();

        await createdComment.save({ session: sess});

        event.comments.push(createdComment);
        
        await event.save({ session: sess});
        
        user.comments.push(createdComment);
        
        await user.save({ session: sess});
        
        await sess.commitTransaction();
        
    } catch(err){
        
        const error=new HttpError('Creating event failed, please try again 2', 500);
        
        return next(error);
 }
    
    
    res.status(201).json({comment: createdComment});
}


const getCommentById=async  (req,res,next)=>{ //the first argument defined here will be added to the end of the path we define in app.js for this route...so in this case /api/places/:pid

    
    const commentId=req.params.cid; //this is the way to get the concrete id we put in place above as a dynamic value

    
    let comment;
    
    try{
        
       comment=await Comment.findById(commentId); //doesn't return a Promise unless you chain exec()
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not find an event', 500);
        
        return next(error);
    }
    
    
    if(!comment){
        
        return next(new HttpError('Could not find an event for the provided id.', 404));
    }
    
    
    res.json({comment: comment.toObject({getters:true})}); //this is a JSON method...place: place can be also just place (default JS, possible when the key and value have the same name)
}



const updateEvent=async (req, res, next)=>{
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    const {title, description}= req.body;
    
    const eventId=req.params.eid;

    
    
    let event;
    
      try {
          
        event = await Event.findById(eventId);
          
      } catch (err) {
          
        const error = new HttpError(
          'Something went wrong, could not update event.',
          500
        );
          
        return next(error);
      }
    
    if(event.creator.toString() !== req.userData.userId){
        
        const error = new HttpError(
          'You are not allowed to edit this event.',
          401
        );
          
        return next(error);
    }
    
    
    event.title=title;
    event.description=description;
    
    try{
        
        await event.save(); // probably because of the same id, Mongoose will overwrite old data. With Firebase for example, you would have to delete the old data first (though I haven't tried PATCH request)
        
    } catch(err){
        
        const error=new HttpError('Something went wrong, could not update event', 500);
        
        return next(error);
    }
    
    res.status(200).json({event:event.toObject({getters:true})});
};


    
const deleteEvent=async (req, res, next)=>{
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const eventId=req.params.eid;
    
    
    let event;
    
    try{
        
       event=await Event.findById(eventId).populate('creator'); //doesn't return a Promise unless you chain exec(). populate() method can be used only if there are a connection created between places and users (which we have done in place.js and user.js). This basically gives us the full User object linked to this place
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete an event 1', 500);
        
        return next(error);
    }
    
    
    if(!event){
        
        const error=new HttpError('Could not find an event for this id.', 404);
        
        return next(error);
    }

    
    
    if(event.creator.id !== req.userData.userId){
        
        const error=new HttpError('You are not allowed to delete this event.', 404);
        
        return next(error);
    }
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();
        
        await event.remove({ session: sess});
        
        event.creator.events.pull(event); //this will tell Mongoose to automatically remove the id...not sure if the "places" here refers to the colection name or places property in "user" collection
        
        await event.creator.save({session:sess});
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
        
        fs.unlink(event.image, (err)=>{}); //deleting location image from our images folder
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete an event 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted an event.'});
};



const updateComment=async (req, res, next)=>{
    
    
    const errors=validationResult(req);
    
    if(!errors.isEmpty()){
        
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    const {comment}= req.body;
    
    
    const commentId=req.params.cid;
    
    
    
    let fetchedComment;
    
      try {
          
        fetchedComment = await Comment.findById(commentId);
          
      } catch (err) {
          
        const error = new HttpError(
          'Something went wrong, could not update event.',
          500
        );
          
        return next(error);
      }
    
    
    if(fetchedComment.creator.toString() !== req.userData.userId){
        
        const error = new HttpError(
          'You are not allowed to edit this event.',
          401
        );
          
        return next(error);
    }
    
    
    fetchedComment.comment=comment;

    try{
        
        await fetchedComment.save(); // probably because of the same id, Mongoose will overwrite old data. With Firebase for example, you would have to delete the old data first (though I haven't tried PATCH request)
        
    } catch(err){
        
        const error=new HttpError('Something went wrong, could not update event', 500);
        
        return next(error);
    }
    
    res.status(200).json({comment:fetchedComment.toObject({getters:true})});
};




const deleteComment=async (req, res, next)=>{
    
    
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const commentId=req.params.cid;
    
    let comment;
    
    try{
        
       comment=await Comment.findById(commentId).populate('event creator'); //doesn't return a Promise unless you chain exec(). populate() method can be used only if there are a connection created between places and users (which we have done in place.js and user.js). This basically gives us the full User object linked to this place
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete an event 1', 500);
        
        return next(error);
    }
    
    
    if(!comment){
        
        const error=new HttpError('Could not find an comment for this id.', 404);
        
        return next(error);
    }

    
    
    if(comment.creator.id !== req.userData.userId){
        
        const error=new HttpError('You are not allowed to delete this event.', 404);
        
        return next(error);
    }
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();
        
        await comment.remove({ session: sess});
        
        comment.creator.comments.pull(comment); //this will tell Mongoose to automatically remove the id...not sure if the "places" here refers to the colection name or places property in "user" collection
        
        comment.event.comments.pull(comment); 
        
        await comment.creator.save({session:sess});
        
        await comment.event.save({session:sess});
        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
    
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete an event 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted a comment.'});
};


const getCommentsByEventId= async (req,res,next)=>{
    
    const eventId=req.params.eid;

    
    let comments;
    
    try{
        comments=await Comment.find({event:eventId}); //Mongoose find() method
        
    } catch(err){
        
        
        const error=new HttpError('Fetching comments failed, please try again later', 500);

        return next(error);
}
    

    
    if(!comments){ //do not put comments.length===0 here, because otherwise error message will be played in events.js (frontend) even if no comments exist for a place...so this error message should be provided only if there is no response above, though I think the catch block above should handle those cases already
        
        return next(new HttpError('Could not find a comment for the provided id.', 404));
    }
    
    res.json({comments: comments.map(comment=>comment.toObject({getters:true}))
             }); //can't use toObject on an array so we needed to transform each item of an array separately with the map() method
}

const getComments= async (req, res, next) =>{
    
    
    let comments;
    
    try{
        
         comments= await Comment.find({}); //we leave this object empty, because we want to find every event
        
    } catch(err){
        
        const error=new HttpError('Fetching events failed', 500);
        
        return next(error);
    }
  
    res.json( {comments: comments.map(comment=> comment.toObject({ getters: true })
                               )
              });
}



const deleteComments=async (req, res, next)=>{
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const eventId=req.params.eid;
    
    
    let comments;
    
    try{
        
       comments=await Comment.find({event:eventId}).populate('creator'); //doesn't return a Promise unless you chain exec(). populate() method can be used only if there are a connection created between places and users (which we have done in place.js and user.js). This basically gives us the full User object linked to this place
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete an comment 1', 500);
        
        return next(error);
    }
    
    
    if(!comments){
        
        const error=new HttpError('Could not find an comment for this id.', 404);
        
        return next(error);
    }

    // console.log(typeof comments[0].creator.id); //string
    // console.log(typeof req.userData.userId); //string

        if(comments[0].creator.id !== req.userData.userId){ //req.userData comes from localStorage...so 
                                                            //the req carries localStorage items in it. 
                                                            //Note that here I don't have to turn creator
                                                            //id into a string. There are two differences
                                                            //here compared to other delete functions
                                                            //1) We have populated comments with creator
                                                            //2) We use req.userData instead of req.params
                                                            //Both are of type string in this case
                                                            //Comment.find({creator:userId})-->
                                                            //comments[0].creator //typeof=object...creator
                                                            //is MongoDB object type id in this case while
                                                            //creator.id here is id property of the User
                                                            //model which is a string
                                            
        
            const error=new HttpError('You are not allowed to delete this comment.', 404);
            
            return next(error);
        }

    
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();

        if(comments.length===1){

            await comments[0].remove({ session: sess});

        } else{

            for(comment of comments){
            
                await comment.remove({ session: sess}); 
             }
        }

        
        for(comment of comments){
            
            comment.creator.comments.pull(comment); //this will tell Mongoose to automatically remove the id...not sure if the "places" here refers to the colection name or places property in "user" collection
        }
             
        await comments[0].creator.save({session:sess});

        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
    
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete events 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted comments.'});
};


const deleteCommentsUserDeletion=async (req, res, next)=>{
    
    //we need to make sure that when we delete a place we also check what user has this place and then delete the place from the user also
    
    const userId=req.params.uid;
    
    
    let comments;
    
    try{
        
       comments=await Comment.find({creator:userId}); //doesn't return a Promise unless you chain exec(). populate() method can be used only if there are a connection created between places and users (which we have done in place.js and user.js). This basically gives us the full User object linked to this place
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete an comment 1', 500);
        
        return next(error);
    }
    
    
    if(!comments){
        
        const error=new HttpError('Could not find an comment for this id.', 404);
        
        return next(error);
    }

        if(comments[0].creator.toString() !== req.userData.userId){ //req.userData comes from localStorage...so the req carries localStorage items in it
        
            const error=new HttpError('You are not allowed to delete this comment.', 404);
            
            return next(error);
        }

    
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();

        if(comments.length===1){

            await comments[0].remove({ session: sess});

        } else{

            for(comment of comments){
            
                await comment.remove({ session: sess}); 
             }
        }

        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
    
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete events 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted comments.'});
};


const deleteEvents=async (req, res, next)=>{
    
    const userId=req.params.uid;

    let events;
    
    try{
        
        events=await Event.find({creator:userId});
        
    } catch (err){
        
        const error=new HttpError('Something went wrong, could not delete events 1', 500);
        
        return next(error);
    }
    
    
    if(!events){
        
        const error=new HttpError('Could not find an event for this id.', 404);
        
        return next(error);
    }

    // console.log(typeof userId); //type is string
    // console.log(typeof events[0].creator); //type was object


        if(events[0].creator.toString() !== userId){ //req.userData comes from localStorage...so the req carries localStorage items in it
        
            const error=new HttpError('You are not allowed to delete these events.', 404);
            
            return next(error);
        }
    
    
    
    
    try{
        
        const sess=await mongoose.startSession(); //Mongoose provides this method
        
        sess.startTransaction();

        if(events.length===1){

            await events[0].remove({ session: sess});

        } else{

            for(event of events){
            
                await event.remove({ session: sess}); 
             }
        }

        
        await sess.commitTransaction(); //only at this point the changes are saved in the database. If any of the phases with "await" fails then the changes won't save. Using this approach the collection won't be created automatically if it doesn't already exist, but you need to create it manually in the database (a button with plus icon)
    
        
    } catch(err){
        
           const error=new HttpError('Something went wrong, could not delete events 2', 500);
        
        return next(error);
    }
    
    
    res.status(200).json({message: 'Deleted events.'});
};


exports.getEventById=getEventById;
exports.getCommentsByEventId=getCommentsByEventId;
exports.getEventsByUserId=getEventsByUserId;
exports.createEvent=createEvent;
exports.createComment=createComment;
exports.updateEvent=updateEvent;
exports.deleteEvent=deleteEvent;
exports.getCommentById=getCommentById;
exports.getComments=getComments;
exports.updateComment=updateComment;
exports.deleteComment=deleteComment;
exports.deleteComments=deleteComments;
exports.deleteCommentsUserDeletion=deleteCommentsUserDeletion;
exports.deleteEvents=deleteEvents;

