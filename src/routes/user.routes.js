import { Router } from "express";
import {
    changeAvatar,
    changeCurrentPassword,
    getUser,
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
router.route("/changePassword").post(verifyJWT, changeCurrentPassword);
router.route("/userDetail").get(verifyJWT, getUser);
router.route("/updateAvatar").post(
    verifyJWT,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
    ]),
    changeAvatar
);
router.route("/updateUserDetail").post(verifyJWT, updateDetail);

export default router;
