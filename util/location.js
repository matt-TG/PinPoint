const axios=require('axios');

const API_KEY=process.env.GOOGLE_API_KEY;//'AIzaSyCJ9zeEr7G1Wyr-y1Hur6bxLEDSLyHJR-4' is the key, but we are using enviromental variables now from nodemon.json

const getCoordsForAddress=async address=>{
    
  const response= await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`); //encodeURIComponent converts a string into url friendly format
    
    const data=response.data;
    
    if(!data || data.status=== 'ZERO_RESULTS'){ //data.status is Google API object/property...'ZERO_RESULTS' is returned when nothing is found
        
        const error= new HttpError('Could not find location for this spesified error', 422);
        
        throw error;
    }

    
    const coordinates=data.results[0].geometry.location; //see the data structure: https://developers.google.com/maps/documentation/geocoding/start
    
    return coordinates;
    
//    return {
//        
//        lat: 40.7484405,
//        lng: -73.9878584
//    };
}


module.exports=getCoordsForAddress;

