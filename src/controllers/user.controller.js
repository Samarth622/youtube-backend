import { ApiError } from "../utils/ApisError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
