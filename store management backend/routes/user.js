const express = require("express");
const router = express.Router();
const userControler = require("../controllers/user");
const createUserValidateToken = require("../middleware/createUserValidateToken");

router.post("/login", userControler.login);
router.post("/sign-up", userControler.signUp);
router.use(createUserValidateToken);
router.get("/", userControler.getUsers);
router.get("/user-details", userControler.getUserDetails);
router.post("/create", userControler.createUser);
router.patch("/update/:id", userControler.updateUser);
router.delete("/delete/:id", userControler.deleteUser);

module.exports = router;
