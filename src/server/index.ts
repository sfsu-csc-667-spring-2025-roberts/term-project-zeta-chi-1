import cookieParser from "cookie-parser";

import express from "express";
import httpErrors from "http-errors";
import morgan from "morgan";
import * as path from "path";
import { timeMiddleware } from "./middleware/time";
import authRoutes from "../routes/authentication";


import dotenv from "dotenv";
dotenv.config();

import rootRoutes from "../routes/root";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));

app.use(timeMiddleware);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(process.cwd(), "src", "public")));

app.use(cookieParser());

app.set("views", path.join(process.cwd(), "src", "server", "views"));

app.set("view engine", "ejs");

import engine from "ejs-mate";
app.engine("ejs", engine);

app.use("/", rootRoutes);
app.use("/", authRoutes);

app.use(express.static("src/public"));

app.use((_request, _response, next) => {
  next(httpErrors(404));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
