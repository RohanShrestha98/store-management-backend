const express = require("express");
const router = express.Router();
const categoryControler = require("../controllers/category");
const createUserValidateToken = require("../middleware/createUserValidateToken");

router.use(createUserValidateToken);
router.get("/", categoryControler.getCategory);
router.get("/name-list", categoryControler.getCategoryName);
router.get("/details/:id", categoryControler.getCategoryDetailsById);
router.post("/create", categoryControler.createCategory);
router.patch("/update/:id", categoryControler.updateCategory);
router.delete("/delete/:id", categoryControler.deleteCategory);

module.exports = router;
