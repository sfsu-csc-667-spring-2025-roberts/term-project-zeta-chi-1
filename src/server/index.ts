// import cookieParser from "cookie-parser";

// import express from "express";
// import httpErrors from "http-errors";
// import morgan from "morgan";
// import * as path from "path";
// import { timeMiddleware } from "./middleware/time";
// import authRoutes from "../routes/authentication";


// import dotenv from "dotenv";
// dotenv.config();

// import rootRoutes from "../routes/root";

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(morgan("dev"));

// app.use(timeMiddleware);

// app.use(express.json());

// app.use(express.urlencoded({ extended: false }));

// app.use(express.static(path.join(process.cwd(), "src", "public")));

// app.use(cookieParser());

// app.set("views", path.join(process.cwd(), "src", "server", "views"));

// app.set("view engine", "ejs");

// import engine from "ejs-mate";
// app.engine("ejs", engine);

// app.use("/", rootRoutes);
// app.use("/", authRoutes);

// app.use(express.static("src/public"));

// app.use((_request, _response, next) => {
//   next(httpErrors(404));
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// src/server/index.ts  (your current file)

import express from 'express';
import session from 'express-session';
// import connectPgSimple from 'connect-pg-simple';   // ➊ optional – DB store
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import engine from 'ejs-mate';
import httpErrors from 'http-errors';

import { timeMiddleware } from './middleware/time';
import rootRoutes from '../routes/root';
import authRoutes from '../routes/authentication';
import pool from '../config/db';                   // ➊ reuse existing pg Pool

import 'dotenv/config';                            // loads .env early

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------- core middleware ---------- */
app.use(morgan('dev'));
app.use(timeMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(process.cwd(), 'src', 'public')));
app.use(cookieParser());

/* ---------- session ---------- */
// app.use(
//   session({
//     store: new (connectPgSimple(session))({        // ➊ comment-out if
//       pool,                                        //    you just want
//       tableName: 'session',                        //    in-memory store
//     }),
//     secret: process.env.SESSION_SECRET ?? 'dev-secret',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { maxAge: 24 * 60 * 60 * 1000 },       // 1 day
//   })
// );

/* ---------- view engine ---------- */
app.set('views', path.join(process.cwd(), 'src', 'server', 'views'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

/* ---------- routes ---------- */
app.use('/', rootRoutes);
app.use('/', authRoutes);

/* ---------- 404 fall-through ---------- */
app.use((_req, _res, next) => next(httpErrors(404)));

/* ---------- start server ---------- */
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
