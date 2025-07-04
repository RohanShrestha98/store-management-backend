const express = require("express");
const router = express.Router();
const storeControler = require("../controllers/store");

const createUserValidateToken = require("../middleware/createUserValidateToken");

router.use(createUserValidateToken);
router.get("/", storeControler.getStore);
router.get("/count", storeControler.getTotalStoreCount);
router.post("/create", storeControler.createStore);
router.patch("/update/:id", storeControler.updateStore);
router.delete("/delete/:id", storeControler.deleteStore);

module.exports = router;
