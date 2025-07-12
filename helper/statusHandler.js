const statusHandeler = (res, statusCode, success, messege, key = "msg") => {
  return res.status(statusCode).json({ success: success, [key]: messege });
};

module.exports = {
  statusHandeler,
};
