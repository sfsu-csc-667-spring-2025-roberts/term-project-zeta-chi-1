import { Router } from "express";
const router = Router();

router.get("/", (_req, res) => {
  res.render("pages/home", { title: "Home" });
});

router.get("/play", (_req, res) => {
  res.render("pages/play", { title: "Play" });
});

router.get("/home", (_req, res) => {
  res.redirect("/");           // keep one canonical path
});

export default router;
