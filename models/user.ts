/// <reference path="../src/_all.d.ts" />

import * as mongoose from "mongoose";
import IUser = require("../models/iuser");

interface IUserModel extends IUser, mongoose.PassportLocalDocument {};

var userSchema = new mongoose.Schema({
    //The username on the account
    username: String,
    //The password for the account (this will be hashed and can't be modified directly)
    password: String,
    //The parent's email
    email: String,
    //The child's first name
    childsFirst: String,
    //The child's last name
    childsLast: String,
    //The parent's first name
    firstname: { type: String, default: "" },
    //The parent's last name
    lastname: { type: String, default: "" },
    //The parent's home phone
    homePhone: { type: String, default: "" },
    //The parent's cell phone
    cellPhone: { type: String, default: "" },
    //The parent's work phone
    workPhone: { type: String, default: "" },
    //The parent's address
    address: { 
        street: { type: String, default: "" },
        cityState: { type: String, default: "" },
        zip: { type: String, default: "" }
    },
    //The child's birthday
    birthday: { type: String, default: "" },
    //The emergency contact's first name
    emerFirst: { type: String, default: "" },
    //The emergency contact's last name
    emerLast: { type: String, default: "" },
    //The emergency contact's address
    emerAddress: { 
        street: { type: String, default: "" },
        cityState: { type: String, default: "" },
        zip: { type: String, default: "" }
    },
    //The emergency contact's phone number
    emerPhone: { type: String, default: "" }
});

var User = mongoose.model<IUserModel>("User", userSchema, "userProfiles");

export = User;