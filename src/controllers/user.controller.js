import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/User.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteOldImage } from "../utils/deleteOldImage.js";
import mongoose from "mongoose";

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
  console.log(existingUser);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
  }
    console.log("cover image:",coverImageLocalPath)

  if (!avatarLocalPath) throw new ApiError(400, "avatar is required");
  // if(!coverImageLocalPath) throw new ApiError(400,"coverimage is required")

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if (!avatar) throw new ApiError(400, "avatar file is required");

  const user = await User.create({
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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

  // const decodedToken = jwt;
  // console.log(isLoggedIn)

  if (isLoggedIn) {
    throw new ApiError(401, "already loggedin");
  }

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

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  // console.log(incomingRefreshToken)

  try {
    const user = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!user) {
      throw new ApiError(401, "invalid token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "invalid or expired token");
    }

    const { accessToken, refreshToken } =
      await generateAccessAndrefreshToken(user);

    const options = {
      httpOnly: true,
      secure: true,
    };
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "access token refereshed sucessfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.find(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "incorrect oldpassword");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed sucessfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, "current user fetched"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;
  if (!email || !fullName || !username) {
    throw new ApiError(400, "all feilds are required");
  }

  const user =await  User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
        username,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.avatar[0]?.path;

  if (!avatarLocalPath) throw new ApiError(400, "avatar file is missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) throw new ApiError(400, "error while uploading avatar");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "avatar updated sucessfully"));
});

const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if(!coverImageLocalPath) throw new ApiError(400,"coverimage file not uploaded")

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage) throw new ApiError(400,"error while upload coverimage to cloud");

  const oldImageUrl = req.user.coverImage;
  console.log("old image url:",oldImageUrl)
  const deleteStatus = await deleteOldImage(oldImageUrl);

  console.log(deleteStatus)

  const updatedUser = await User.findByIdAndUpdate(req.user?._id,
    {
    $set:{coverImage:coverImage.url},},
    {new:true}
  ).select("-password");
  res.status(200)
  .json(new ApiResponse(200,updatedUser,"coverimage uploaded sucessfully"))
})

const getUserChannel = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) throw new ApiError(404, "username not found");

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        subscribedToCount: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!channel.length) throw new ApiError(404, "channel doesn't exist");

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "channel retrieved successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannel,
  getWatchHistory
}
