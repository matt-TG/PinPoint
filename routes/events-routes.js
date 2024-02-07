const express = require("express");

const { check } = require("express-validator");

const eventsControllers = require("../../controllers/events-controllers");

const HttpError = require("../../models/http-error");

const fileUpload = require("../../middleware/file-upload");

const checkAuth = require("../../middleware/check-auth");

const router = express.Router(); //gives us an object

//NOTE THAT THE ORDER OF THESE ROUTES MIGHT MATTER: IN CASE WE WOULD GET TO /API/PLACES/USER, THE FIRST ROUTE WOULD BE RENDERED BECAUSE "USER" IS THE :PID (JUST MEANS ANY VALUE)...SO IF WE WOULD HAVE SOMETHING ON THAT PATH WE WOULD HAVE TO MOVE THE ROUTE BEFORE THE /:PID ROUTE

//ALSO THE ROUTES RUN FROM TOP TO BOTTOM SO IF YOU USE SOME DATA CHECKING LOGIC THEN PLACE THAT BEFORE THE ROUTES THAT YOU DO NOT WANT TO BE ACCESSED WITHOUT THIS DATA

router.get("/:eid", eventsControllers.getEventById);

router.get("/user/:uid", eventsControllers.getEventsByUserId);

router.get("/comment/all", eventsControllers.getComments);

router.get("/comment/:eid", eventsControllers.getCommentsByEventId); //this is probably not needed anymore, because I can't fetch the matching comments in event.js (frontend) for rerendering reasons (see idea.txt in the MERNX project folder)

router.get("/comment/one/:cid", eventsControllers.getCommentById); //this is used for updateComment.js

router.use(checkAuth); //a Middleware for checking if token exists... those routes that comes after this route will be checked

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
    check("link").not().isEmpty(),
    check("date").not().isEmpty(),
  ],
  eventsControllers.createEvent
); //requests can accept more than one Middleware...reads from left to right. check('title').not().isEmpty() means that we check that title is not empty

router.post(
  "/comment",
  [check("comment").not().isEmpty()],
  eventsControllers.createComment
);

router.patch(
  "/:eid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  eventsControllers.updateEvent
); //for updating a place

router.patch(
  "/comment/:cid",
  [check("comment").not().isEmpty()],
  eventsControllers.updateComment
);

router.delete("/delete/:uid", eventsControllers.deleteEvents);

router.delete("/:eid", eventsControllers.deleteEvent); //for deleting an event

router.delete("/comment/:cid", eventsControllers.deleteComment);

router.delete("/comments/:eid", eventsControllers.deleteComments);

router.delete(
  "/comments/user/:uid",
  eventsControllers.deleteCommentsUserDeletion
);

module.exports = router;
