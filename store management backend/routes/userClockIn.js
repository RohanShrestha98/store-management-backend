const express = require("express");
const router = express.Router();
const userClockInControler = require("../controllers/userClockIn");

router.get("/", userClockInControler.getUserClockInDetails);
router.post("/create", userClockInControler.userClockIn);

module.exports = router;
