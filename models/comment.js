const mongoose=require('mongoose');

const commentSchema=new mongoose.Schema({ // this could be in two parts also: 1) const Schema=mongoose.Schema(); 2) const placeSchema=new Schema({...});
    
    comment: {type: String, required: true},
    event: {type: mongoose.Types.ObjectId, required: true, ref: 'Event'},//ref: 'User' referes to the Schema name (collection name) in the user.js...type is expected to be Mongoose ObjectId
    creator: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},
    commentBy: {type: String, required: true},
    posted: {type: String, required: true},
    image: {type: String, required: true}
}); //construction function...find out more in  https://mongoosejs.com/docs/guide.html

module.exports=mongoose.model('Comment', commentSchema); //requires two arguments: 1. Name of the product (this becomes the Collection name) 2. The Schema variable name