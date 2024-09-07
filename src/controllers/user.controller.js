import { ApiError } from "../utils/ApisError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options = {
    httpOnly: true,
    secure: false,
};

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user detail
    const { username, email, fullName, password } = req.body;

    // validation
    if (fullName === "" || email === "" || username === "" || password === "") {
        throw new ApiError(400, "All fields are required");
    }

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    if (!validateEmail(email)) {
        throw new ApiError(422, "Email is not valid");
    }

    if (password.length <= 6) {
        throw new ApiError(422, "Minimum password length is 7");
    }

    // check user already exist
    const existUsername = await User.findOne({ username });
    if (existUsername) {
        throw new ApiError(409, "Username already registered.");
    }

    const existEmail = await User.findOne({ email });
    if (existEmail) {
        throw new ApiError(409, "Email already registered.");
    }

    // check for images and check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.");
    }

    // upload to clodinary, check avatar
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    // const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is not upload on cloudinary.");
    }

    // create user object and save data in database
    const user = await User.create({
        fullName,
        avatar: avatar,
        // coverImage: coverImage || "",
        username,
        email,
        password,
    });

    // check for user creation
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user");
    }

    // return res json data with user data except password and refresh token
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                createdUser,
                "User registered successfully!!!!"
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // get data
    const { email, username, password } = req.body;

    // check validation
    if (email == "" && username == "") {
        throw new ApiError(400, "Username or email is required.");
    }

    if (password == "") {
        throw new ApiError(400, "Password is required");
    }

    // check if the user present in the database
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User doesn't exist");
    }

    // check password
    const checkPassword = await user.isPasswordCorrect(password);

    if (!checkPassword) {
        throw new ApiError(401, "Password is incorrect.");
    }

    // give refresh and access token to user
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // Send cookie
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User LoggedIn successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedInfo = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedInfo?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(
                401,
                "Incoming refresh token is invalid or expired"
            );
        }

        const { accessToken, newrefreshToken } =
            await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        newrefreshToken,
                    },
                    "New Access token generated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    const passwordCheck = await user.isPasswordCorrect(oldPassword);
    if (!passwordCheck) {
        throw new ApiError(400, "Invalid Old Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                user: req.user,
            },
            "Cuurent user fetched successfully"
        )
    );
});

const changeAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(400, "User is not authorized");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Your new avatar is required");
    }

    const newAvatar = await uploadFileOnCloudinary(avatarLocalPath);
    if (!newAvatar) {
        throw new ApiError(400, "New Avatar is not upload on cloudinary.");
    }

    user.avatar = newAvatar;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                newAvatar,
            },
            "Avatar changes successfully"
        )
    );
});

const updateDetail = asyncHandler(async (req, res) => {
    const { newemail, newfullName } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(401, "User is unauthorized");
    }

    if (newemail !== "") {
        user.email = newemail;
    }

    if (newfullName !== "") {
        user.fullName = newfullName;
    }

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "Email or Fullname changed successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getUser,
    changeAvatar,
    updateDetail
};
