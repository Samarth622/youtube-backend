import { Router } from "express";
import {
    changeAvatar,
    changeCurrentPassword,
    getUser,
    getUserChannelProfile,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateDetail,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        // {
        //     name: "coverImage",
        //     maxCount: 1,
        // },
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/refreshAccessToken").post(refreshAccessToken);

// secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/changePassword").patch(verifyJWT, changeCurrentPassword);
router.route("/userDetail").get(verifyJWT, getUser);
router.route("/updateAvatar").patch(
    verifyJWT,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
    ]),
    changeAvatar
);
router.route("/updateUserDetail").patch(verifyJWT, updateDetail);
router.route("/getChannel/:username").get(verifyJWT, getUserChannelProfile);

export default router;
