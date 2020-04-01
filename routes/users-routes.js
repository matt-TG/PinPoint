const express=require('express');

const usersControllers=require('../controllers/users-controllers');

const {check}=require('express-validator');

const HttpError=require('../models/http-error');

const fileUpload=require('../middleware/file-upload');

const router=express.Router(); //gives us an object


//NOTE THAT THE ORDER OF THESE ROUTES MIGHT MATTER: IN CASE WE WOULD GET TO /API/PLACES/USER, THE FIRST ROUTE WOULD BE RENDERED BECAUSE "USER" IS THE :PID (JUST MEANS ANY VALUE)...SO IF WE WOULD HAVE SOMETHING ON THAT PATH WE WOULD HAVE TO MOVE THE ROUTE BEFORE THE /:PID ROUTE

router.get('/', usersControllers.getUsers);


router.post('/signup', fileUpload.single('image'), [check('name').not().isEmpty(), check('email').normalizeEmail().isEmail(), check('password').isLength({min: 6})], usersControllers.signup);

router.post('/login', usersControllers.login);

router.delete('/delete/:uid', usersControllers.deleteUser);



module.exports=router;