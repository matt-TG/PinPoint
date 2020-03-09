const express=require('express');

const {check}=require('express-validator');

const placesControllers=require('../controllers/places-controllers');

const HttpError=require('../models/http-error');

const fileUpload=require('../middleware/file-upload');

const checkAuth=require('../middleware/check-auth');

const router=express.Router(); //gives us an object


//NOTE THAT THE ORDER OF THESE ROUTES MIGHT MATTER: IN CASE WE WOULD GET TO /API/PLACES/USER, THE FIRST ROUTE WOULD BE RENDERED BECAUSE "USER" IS THE :PID (JUST MEANS ANY VALUE)...SO IF WE WOULD HAVE SOMETHING ON THAT PATH WE WOULD HAVE TO MOVE THE ROUTE BEFORE THE /:PID ROUTE

//ALSO THE ROUTES RUN FROM TOP TO BOTTOM SO IF YOU USE SOME DATA CHECKING LOGIC THEN PLACE THAT BEFORE THE ROUTES THAT YOU DO NOT WANT TO BE ACCESSED WITHOUT THIS DATA

router.get('/:pid', placesControllers.getPlaceById);


router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(checkAuth); //a Middleware for checking if token exists


router.post('/', fileUpload.single('image'), [check('title').not().isEmpty(), check('description').isLength({min:5}), check('address').not().isEmpty()], placesControllers.createPlace); //requests can accept more than one Middleware...reads from left to right. check('title').not().isEmpty() means that we check that title is not empty

router.patch('/:pid', [check('title').not().isEmpty(), check('description').isLength({min:5})], placesControllers.updatePlace); //for updating a place

router.delete('/:pid', placesControllers.deletePlace); //for deleting a place


module.exports=router;