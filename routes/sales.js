const express = require("express");
const router = express.Router();
const salesControler = require("../controllers/sales");
const createUserValidateToken = require("../middleware/createUserValidateToken");

router.use(createUserValidateToken);

router.get("/", salesControler.getSales);
router.post("/create", salesControler.createSales);
router.get("/details/:id", salesControler.getSalesDetails);
router.delete("/delete/:id", salesControler.deleteStore);

module.exports = router;
