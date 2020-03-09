const multer  = require('multer');

const uuid=require('uuid/v1');

const MIME_TYPE_MAP={
    
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const fileUpload=multer({
    
    limits: 500000, //kb size
    storage: multer.diskStorage({
        
        destination: (req, file, cb)=>{
            
            cb(null, 'uploads/images');//destination for the file (we have a folder called "uploads" and it contains a folder called "images")
        },
        filename: (req, file, cb)=>{
            
            const ext=MIME_TYPE_MAP[file.mimetype];
            
            cb(null, uuid() + '.' + ext);
        }
    }),
    fileFilter: (req, file, cb)=>{
        
        const isValid=!!MIME_TYPE_MAP[file.mimetype]; //!! means that undefined or null value is converted to false
        
        let error= isValid? null: new Error('Invalid mime type!');
        
        cb(error, isValid); // second value tells if we accept the file or not, true meaning that we accept it. File gets also denided if the error holds a real error
    }
}); //this is a group of Middlewares

module.exports=fileUpload;