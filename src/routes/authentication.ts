import { Router } from "express";
const router = Router();

router.get("/login", (_req, res) =>
  res.render("auth/login", { title: "Login" })
);

router.get("/register", (_req, res) =>
  res.render("auth/register", { title: "Register" })
);

router.get("/logout", (_req, res) =>
  res.render("auth/logout", { title: "Logged out" })
);

router.get("/signedin", (_req, res) =>
  res.render("pages/signedin", { title: "Dashboard", username: "User" })
);


router.post("/login", (req, res) => {
  /* TODO: real auth here */
  console.log(req.body);
  res.redirect("/signedin");
});

router.post("/register", (req, res) => {
  /* TODO: save user here */
  console.log(req.body);
  res.redirect("/signedin");
});

export default router;
