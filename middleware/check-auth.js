const jwt = require("jsonwebtoken");

const HttpError = require("../../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    //sometime the request type is OPTIONS even though you send a POST request...this is a type that checks if the server accepts certain options.

    return next(); //we just skip ahead here to the POST request if the first request is OPTIONS for some reason
  }

  try {
    const token = req.headers.authorization.split(" ")[1]; //we do not get this from req-body, because for example in the case of GET and DELETE requests there is no req.body. Query params is one option, but here we use headers. Headers property is provided by the Express.js. Note that we are allowing authorization header in the app.js (not case sensitive). Convention is Authorization: 'Bearer TOKEN' so the actual token is the second part of the string. With split() we split it from the middle and get an array with two items, the TOKEN beiong the second item

    if (!token) {
      throw new Error("Authentication failed!"); //this happens if there isn't a token
    }

    const decodedToken = jwt.verify(token, process.env.JWT_KEY); //returns the payload that was set for the token (the first argument), object data in our case. process.env.JWT_KEY is in nodemon.json and the value is 'ProjectX_MP_2020'

    req.userData = { userId: decodedToken.userId }; //we can add data to the request before sending it over to the next Middleware

    next();
  } catch (err) {
    //this happens if there isn't any authorization header

    const error = new HttpError("Authentication failed!", 403);

    return next(error);
  }
};
