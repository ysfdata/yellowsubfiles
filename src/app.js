"use strict";
const bodyParser = require("body-parser");
const express = require("express");
const expressSession = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocal = require("passport-local");
const favicon = require("serve-favicon");
const logger = require("morgan");
const connectMongo = require("connect-mongo");
const bCrypt = require("bcrypt-nodejs");
const nodemailer = require("nodemailer");
const User = require("../models/user");
var EmailStatus;
(function (EmailStatus) {
    EmailStatus[EmailStatus["NO_ATTEMPT"] = 0] = "NO_ATTEMPT";
    EmailStatus[EmailStatus["FAILED"] = 1] = "FAILED";
    EmailStatus[EmailStatus["SUCCESS"] = 2] = "SUCCESS";
})(EmailStatus || (EmailStatus = {}));
var mongoStore = connectMongo(expressSession);
var flash = require("connect-flash");
class Server {
    constructor() {
        this.app = express();
        this.config();
        this.passportConfig();
        this.routes();
    }
    static bootstrap() {
        return new Server();
    }
    static isValidPassword(user, password) {
        return bCrypt.compareSync(password, user.password);
    }
    static createHash(password) {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10));
    }
    config() {
        this.app.set("views", path.join(__dirname, "../views"));
        this.app.set("view engine", "pug");
        this.app.use(favicon(__dirname + "/../public/resources/favicon.ico"));
        this.app.use(logger("dev"));
        this.app.use(flash());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(expressSession({
            secret: "l1f3k1lls",
            resave: false,
            saveUninitialized: false,
            store: new mongoStore({
                url: "mongodb://localhost/yellowsub"
            })
        }));
        this.app.use(express.static(path.join(__dirname, "..", "public")));
        this.app.use(express.static(path.join(__dirname, "..", "bower_components")));
        this.app.use(function (err, req, res, next) {
            var error = new Error("Not Found");
            err.status = 404;
            next(err);
        });
    }
    passportConfig() {
        mongoose.connect(require("./db").url);
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        passport.serializeUser(function (user, done) {
            done(null, user._id);
        });
        passport.deserializeUser(function (id, done) {
            User.findById(id, function (err, user) {
                done(err, user);
            });
        });
        passport.use("login", new passportLocal.Strategy({
            passReqToCallback: true
        }, function (req, username, password, done) {
            User.findOne({
                "username": username
            }, function (err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    console.log("User not found with username " + username);
                    return done(null, false, req.flash("message", "User not found."));
                }
                if (!Server.isValidPassword(user, password)) {
                    console.log("Invalid password");
                    return done(null, false, req.flash("message", "Invalid password"));
                }
                req.session.currentUser = username;
                return done(null, user);
            });
        }));
        passport.use("signup", new passportLocal.Strategy({
            passReqToCallback: true
        }, function (req, username, password, done) {
            var confirmPassword = req.body.confirmPassword;
            var confirmEmail = req.body.confirmEmail;
            if (confirmEmail !== req.body.email) {
                return done(null, false, req.flash("message", "Email addresses do not match"));
            }
            if (confirmPassword !== password) {
                return done(null, false, req.flash("message", "Passwords do not match"));
            }
            console.log("Password and email match");
            let findOrCreateUser = function () {
                User.findOne({
                    "username": username
                }, function (err, user) {
                    if (err) {
                        console.log("Error in signup: " + err);
                        return done(err);
                    }
                    if (user) {
                        console.log("User already exists");
                        return done(null, false, req.flash("message", "User already exists"));
                    }
                    else {
                        let newUser = new User({
                            username: username,
                            password: Server.createHash(password),
                            email: req.body.email,
                            childsFirst: req.body.childFirst,
                            childsLast: req.body.childLast
                        });
                        newUser.save(function (err) {
                            if (err) {
                                console.log("Error in saving new user: " + err);
                                throw err;
                            }
                            console.log("User registration successful");
                            req.session.currentUser = username;
                            return done(null, newUser);
                        });
                    }
                });
            };
            process.nextTick(findOrCreateUser);
        }));
    }
    routes() {
        let router;
        router = express.Router();
        router.get("/", function (req, res, next) {
            if (req.session.logInSuccess) {
                return res.redirect("/home");
            }
            var parameters = null;
            if (req.session.error) {
                req.session.error = false;
                parameters = { pageData: { loginError: true } };
            }
            res.render("index", parameters);
        });
        router.post("/login", function (req, res, next) {
            passport.authenticate("login", function (err, user, info) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    console.log("User not found with name " + req.body.username);
                    req.session.error = true;
                    return res.redirect("/");
                }
                req.logIn(user, function (err) {
                    if (err) {
                        return next(err);
                    }
                    req.session.logInSuccess = true;
                    return res.redirect("/home");
                });
            })(req, res, next);
        });
        router.get("/signup", function (req, res) {
            res.render("register", { message: req.flash("message") });
        });
        router.post("/signup", passport.authenticate("signup"), function (req, res) {
            req.session.logInSuccess = true;
            res.redirect("/home");
        });
        router.get("/home", function (req, res) {
            if (req.session.logInSuccess) {
                res.render("home");
            }
            else {
                res.redirect("/");
            }
        });
        router.get("/account_page", function (req, res) {
            if (req.session.logInSuccess) {
                req.session.lastTab = "account";
                let currUser;
                User.findOne({
                    "username": req.session.currentUser
                }).lean().exec(function (err, user) {
                    res.render("account_page", { pageData: user });
                });
                return;
            }
            res.redirect("/");
        });
        router.post("/logout", function (req, res) {
            req.session.logInSuccess = false;
            res.redirect("/");
        });
        router.get("/contact_info", function (req, res) {
            if (req.session.logInSuccess) {
                res.render("contact_info");
            }
            else {
                res.redirect("/");
            }
        });
        router.post("/updateAccount", function (req, res) {
            var query = { username: req.session.currentUser };
            console.log(req.body);
            var update = {
                email: req.body.parentEmail,
                childsFirst: req.body.childFirst,
                childsLast: req.body.childLast,
                firstname: req.body.parentFirst,
                lastname: req.body.parentLast,
                homePhone: req.body.homePhone,
                cellPhone: req.body.cellPhone,
                workPhone: req.body.workPhone,
                address: {
                    street: req.body.streetAddr,
                    cityState: req.body.cityState,
                    zip: req.body.zip
                },
                birthday: req.body.birthday,
                emerFirst: req.body.emerFirst,
                emerLast: req.body.emerLast,
                emerAddress: {
                    street: req.body.emerAddr,
                    cityState: req.body.emerCityState,
                    zip: req.body.emerZip
                },
                emerPhone: req.body.emerPhone
            };
            User.findOneAndUpdate(query, update, { new: true }, function (err, user) {
                if (err) {
                    return res.send(500, { error: err });
                }
                return res.redirect(req.get("referer"));
            });
        });
        router.get("/feedback_form", function (req, res) {
            if (req.session.logInSuccess) {
                User.findOne({ username: req.session.currentUser }).lean().exec(function (err, user) {
                    var pageData;
                    if (req.session.emailStatus === EmailStatus.SUCCESS || req.session.emailStatus === EmailStatus.FAILED) {
                        var emailSuccess = (req.session.emailStatus === EmailStatus.FAILED) ? false : true;
                        pageData = { pageData: { user: user, emailStatus: emailSuccess } };
                    }
                    else {
                        pageData = { pageData: { user: user } };
                    }
                    req.session.emailStatus = EmailStatus.NO_ATTEMPT;
                    console.log("Sending page data: " + pageData);
                    res.render("feedback_form", pageData);
                });
            }
            else {
                res.redirect("/");
            }
        });
        router.post("/submitFeedback", function (req, res) {
            var transport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "rob.ysfdata@gmail.com",
                    pass: "1Panther"
                }
            });
            var mailOptions = {
                from: req.body.email,
                to: "rob.ysfdata@gmail.com",
                subject: "Yellow Submarine Daycare Feedback",
                text: req.body.first_name + "\n" + req.body.email + "\n" + req.body.comments
            };
            transport.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log("Email failure: " + err);
                    req.session.emailStatus = EmailStatus.FAILED;
                    return res.redirect(req.get("referer"));
                }
                else {
                    console.log("Email Sent: " + info.response);
                    req.session.emailStatus = EmailStatus.SUCCESS;
                    return res.redirect(req.get("referer"));
                }
            });
        });
        this.app.use(router);
    }
}
var server = Server.bootstrap();
module.exports = server.app;
