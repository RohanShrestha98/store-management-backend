const { statusHandeler } = require("./statusHandler");

const requiredFieldHandler = (res, requiredFields) => {
  for (const [key, value] of Object.entries(requiredFields)) {
    const isMissing = !value || (Array.isArray(value) && value.length === 0);
    if (isMissing) {
      statusHandeler(res, 400, false, `${key} is a required field`, key);
      return true;
    }
  }
  return false;
};

module.exports = {
  requiredFieldHandler,
};
