/// <reference path="../src/_all.d.ts" />
import * as passport from "passport";
import * as mongoose from "mongoose";
import * as passportLocalMongoose from "passport-local-mongoose";

import User = require("../models/User.ts");

class AuthController {
    public login = function() {
        passport.authenticate('local', {
            successRedirect: '/auth/login/success',
            failureRedirect: '/auth/login/failure'
        });
    }
    
    public loginSuccess = function(req, res) {
        res.json({
            success: true,
            user: req.session.passport.user
        });
    }
    
    public loginFailure = function(req, res) {
        res.json({
            success: false,
            message: 'Invalid username or password.'
        });
    }
    
    public logout = function(req, res) {
        req.logout();
        res.end();
    }
    
    public register = function(req, res) {
        console.log("registering: " + req.body.username);
        
    }
}

export = AuthController;