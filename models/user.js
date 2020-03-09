const mongoose=require('mongoose');

const uniqueValidator=require('mongoose-unique-validator');

const userSchema=new mongoose.Schema({ // this could be in two parts also: 1) const Schema=mongoose.Schema(); 2) const placeSchema=new Schema({...});

    name: {type: String, required: true},
    email: {type: String, required: true, unique: true}, //unique gives email an index which simply means that querying email will happen fast (we need this in our app to speed up the process of querying email, because we do that alot)
    password: {type: String, required: true, minlength: 6},
    image: {type: String, required: true},
    places: [{type: mongoose.Types.ObjectId, required: true, ref: 'Place'}],//ref: 'Place' referes to the Schema name (collection name) in the models/place.js (in the MERN course project)...type is expected to be Mongoose ObjectId... wrapped inside [], because this way we tell Mongoose that there can be multiple places connected to a user
    events: [{type: mongoose.Types.ObjectId, required: true, ref: 'Event'}],
    comments: [{type: mongoose.Types.ObjectId, required: true, ref: 'Comment'}]
    
}); //construction function...find out more in  https://mongoosejs.com/docs/guide.html

userSchema.plugin(uniqueValidator); // we need this to make the unique property above to work

module.exports=mongoose.model('User', userSchema); //requires two arguments: 1. Name of the product (this becomes the Collection name, but with lowercase and added with s...so User becomes users) 2. The Schema variable name