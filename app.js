//CHECK OUT NODE.JS-PRACTICE FOLDER FOR DETAILED EXPLANATIONS WHAT IS WHAT...ROUTING IS HANDELED IN A DIFFERENT FILE

const fs = require("fs"); //file system module

const path = require("path");

const express = require("express"); //returns a function

const bodyParser = require("body-parser");

const placesRoutes = require("./routes/routes/places-routes");

const eventsRoutes = require("./routes/routes/events-routes");

const usersRoutes = require("./routes/routes/users-routes");

const menuRoutes = require("./routes/routes/menu-routes");

const HttpError = require("./models/http-error");

const mongoose = require("mongoose");

const app = express(); // returns an object

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images"))); //express.static is a Middleware build into the Express. It just returns the requested file. Only images requested from defined locations are returned

app.use((req, res, next) => {
  //see 81) of the instructions for explanations

  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/places", placesRoutes); //this will only be sent to placesRoutes if the path starts with /api/places

app.use("/api/events", eventsRoutes);

app.use("/api/users", usersRoutes);

app.use("/api/menu", menuRoutes);

app.use((req, res, next) => {
  //this Middleware will only run if some of the routes above didn't get a response...we use this for error handling for such routes that do not exist

  const error = new HttpError("Could not find this route", 404);

  throw error;
});

app.use((error, req, res, next) => {
  //if you provide four arguments Express recognizes this as a special Middleware function (error being the fourth argument (first in order though))

  //This Middleware will only execute when a Middleware before it yields an error

  if (req.file) {
    //here we check if the request has a file in it. The idea is to delete the image if we get an error, because otherwise the image would be stored in the images folder even if signup wasn't succesful. file property is something Multer adds to the request when there is a file.

    fs.unlink(req.file.path, (err) => {
      //unlink() is a method the file system has. req.file.path refers to the existing file in the request. The second argument is a callback funtion which triggers in case there is an error
    });
  }

  if (res.headersSent) {
    //checking if a response have been sent already, can't send more than one response

    return next(error);
  }

  res.status(error.code || 500); //500 code indicates that something went wrong in the server side

  res.json({ message: error.message || "An unknown error occurred!" });
});

//mongoose.connect('mongodb+srv://:tig2020noSQL@mern-cluster-skijr.mongodb.net/mern?retryWrites=true&w=majority').then(()=>{  //connect() returns a Promise which allows us to use this logic here. We have places opening a connection to the database here, because if the connection to the server fails then we don't need database either

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mern-cluster-skijr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    //connect() returns a Promise which allows us to use this logic here. We have places opening a connection to the database here, because if the connection to the server fails then we don't need database either

    app.listen(process.env.PORT || 5000); //process.env.PORT is used for Heroku deployment (something that Heroku provides)  //when in production use process.env.PORT || 5000
  })
  .catch((err) => {
    //        console.log(err);
  });
