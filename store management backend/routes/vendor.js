const express = require("express");
const router = express.Router();
const vendorControler = require("../controllers/vendor");

const createUserValidateToken = require("../middleware/createUserValidateToken");

router.use(createUserValidateToken);
router.get("/", vendorControler.getVendor);
router.post("/create", vendorControler.createVendor);
router.patch("/update/:id", vendorControler.updateVendor);
router.delete("/delete/:id", vendorControler.deleteVendor);

module.exports = router;
