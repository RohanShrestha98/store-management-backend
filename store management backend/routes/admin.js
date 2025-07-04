const express = require("express");
const router = express.Router();
const adminControler = require("../controllers/admin");

router.get("/", adminControler.getAdmin);
router.get("/user-details", adminControler.getAdminDetails);
router.post("/create", adminControler.createAdmin);
router.post("/login", adminControler.login);
router.patch("/update/:id", adminControler.updateAdmin);
router.delete("/delete/:id", adminControler.deleteAdmin);

module.exports = router;
