"use strict";
const mongoose = require("mongoose");
;
var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    childsFirst: String,
    childsLast: String,
    firstname: { type: String, default: "" },
    lastname: { type: String, default: "" },
    homePhone: { type: String, default: "" },
    cellPhone: { type: String, default: "" },
    workPhone: { type: String, default: "" },
    address: {
        street: { type: String, default: "" },
        cityState: { type: String, default: "" },
        zip: { type: String, default: "" }
    },
    birthday: { type: String, default: "" },
    emerFirst: { type: String, default: "" },
    emerLast: { type: String, default: "" },
    emerAddress: {
        street: { type: String, default: "" },
        cityState: { type: String, default: "" },
        zip: { type: String, default: "" }
    },
    emerPhone: { type: String, default: "" }
});
var User = mongoose.model("User", userSchema, "userProfiles");
module.exports = User;
