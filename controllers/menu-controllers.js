const uuid=require('uuid/v4');

const bcrypt=require('bcryptjs');

const jwt=require('jsonwebtoken');

const HttpError=require('../models/http-error');

const {validationResult}=require('express-validator');

const Event=require('../models/event');

const Place=require('../models/place');



const getEvents= async (req, res, next) =>{
    
    
    let events;
    
    try{
        
         events= await Event.find({}); //we leave this object empty, because we want to find every event
        
    } catch(err){
        
        const error=new HttpError('Fetching events failed', 500);
        
        return next(error);
    }
  
    res.json( {events: events.map(event=> event.toObject({ getters: true })
                               )
              });
}

const getPlaces= async (req, res, next) =>{
    
    
    let places;
    
    try{
        
         places= await Place.find({}); //we leave this object empty, because we want to find every place
        
    } catch(err){
        
        const error=new HttpError('Fetching places failed', 500);
        
        return next(error);
    }
  
    res.json( {places: places.map(place=> place.toObject({ getters: true })
                               )
              });
}


exports.getEvents=getEvents;
exports.getPlaces=getPlaces;
