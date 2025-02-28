import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJwt,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/update-cover-image").post(verifyJwt,upload.fields([
    { 
        name: "coverImage",
        maxCount: 1 
    }]
), updateUserCoverImage);

export default router;
