import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `Mongodb connected !!  DB HOST: ${connInstance.connection.host}`
    );
  } catch (error) {
    console.log("Mongodb connection err: ", error);
    process.exit(1);
  }
};

export default connectDB;
