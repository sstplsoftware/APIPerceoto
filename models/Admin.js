const mongoose = require("mongoose");
const userSchema = require("./User").schema;

module.exports = mongoose.model("Admin", userSchema, "admins");
