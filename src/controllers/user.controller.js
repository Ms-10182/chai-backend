import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/User.modal.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from front end

  const { username, email, fullName, password } = req.body;
  // console.log(username, email, fullName, password);

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(400, "already exists, please change email or username");
  }

  const user = await User.create({
    fullName,
    email,
    avatar: "",
    coverImage: "",
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "user not registerd");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered sucessfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get id pass word
  // check if id password is same or not
  // generate access token and give to user
  // generate referesh token and give to user

  const { email, username, password } = req.body;
  const isLoggedIn =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  const decodedToken = jwt;
  // console.log(isLoggedIn)

  if (isLoggedIn) {
    throw new ApiError(401, "already loggedin");
  }

  const generateAccessAndrefreshToken = async (user) => {
    try {
      // const user = await User.findById(userId);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generaterefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(500, error);
    }
  };

  if (!username && !email) {
    // can be used also ->     (!(username || email))
    throw new ApiError(400, "username and email missing");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "password is incorrect");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndrefreshToken(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true, //only modifiable by server
    secure: true,
  };
  console.log(accessToken);
  console.log(typeof accessToken);
  console.log(loggedInUser);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user loggedin sucessfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  console.log("trying to logout");
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true, //only modifiable by server
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});
export { registerUser, loginUser, logoutUser };
