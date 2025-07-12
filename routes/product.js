const express = require("express");
const router = express.Router();
const productControler = require("../controllers/product");
const createUserValidateToken = require("../middleware/createUserValidateToken");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const safeFilename = file.originalname.replace(/\s+/g, "_");
    cb(null, safeFilename);
  },
});

router.get("/user", productControler.getProductForUser);
router.use(createUserValidateToken);

const upload = multer({ storage: storage });

router.get("/", productControler.getProduct);
router.post(
  "/create",
  upload.array("images", 5),
  productControler.createProduct
);
// router.patch("/update/:id", productControler.updateCategory);
router.delete("/delete/:id", productControler.deleteProduct);
router.patch(
  "/update/:id",
  upload.array("images", 5),
  productControler.updateProduct
);
router.get("/bar-code/", productControler.getProductByBarcode);

module.exports = router;
