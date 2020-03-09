const mongoose=require('mongoose');

const placeSchema=new mongoose.Schema({ // this could be in two parts also: 1) const Schema=mongoose.Schema(); 2) const placeSchema=new Schema({...});
    
    title: {type: String, required: true},
    description: {type: String, required: true},
    image: {type: String, required: true},
    address: {type: String, required: true},
    location: {
        lat: {type: Number, required: true},
        lng: {type: Number, required: true}
    },
    creator: {type: mongoose.Types.ObjectId, required: true, ref: 'User'} //ref: 'User' referes to the Schema name (collection name) in the user.js...type is expected to be Mongoose ObjectId
}); //construction function...find out more in  https://mongoosejs.com/docs/guide.html

module.exports=mongoose.model('Place', placeSchema); //requires two arguments: 1. Name of the product (this becomes the Collection name) 2. The Schema variable name