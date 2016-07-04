/// <reference path="_all.d.ts" />
"use strict";

import * as bodyParser from "body-parser";
import * as express from "express";
import * as expressSession from "express-session";
import * as path from "path";
import * as cookieParser from "cookie-parser";
import * as mongoose from "mongoose";
import * as passport from "passport";
import * as passportLocal from "passport-local";
import * as favicon from "serve-favicon";
import * as logger from "morgan";
import * as connectMongo from "connect-mongo";
import * as bCrypt from "bcrypt-nodejs";
import * as nodemailer from "nodemailer";

import User = require("../models/user");

enum EmailStatus {
    NO_ATTEMPT = 0,
    FAILED,
    SUCCESS
}

var mongoStore: connectMongo.MongoStoreFactory = connectMongo(expressSession);
var flash = require("connect-flash");

/**
 * The server.
 *
 * @class Server
 */
class Server {

  public app: express.Application;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
    //create expressjs application
    this.app = express();

   //configure application
    this.config();

    //configure passport for authentication
    this.passportConfig();

    //configure routes
    this.routes();
  }

  public static isValidPassword(user: any, password: string) {
    return bCrypt.compareSync(password, user.password);
  }

  public static createHash(password: string) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10));
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   * @return void
   */
  private config() {
    //configure jade
    this.app.set("views", path.join(__dirname, "../views"));
    this.app.set("view engine", "pug");

    this.app.use(favicon(__dirname + "/../public/resources/favicon.ico"));
    this.app.use(logger("dev"));
    this.app.use(flash());

    //mount json form parser
    this.app.use(bodyParser.json());

    //mount query string parser
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

    //add static paths
    this.app.use(express.static(path.join(__dirname, "..", "public")));
    this.app.use(express.static(path.join(__dirname, "..", "bower_components")));

    // catch 404 and forward to error handler
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      var error = new Error("Not Found");
      err.status = 404;
      next(err);
    });
  }

  private passportConfig() {
    mongoose.connect(require("./db").url);

    this.app.use(passport.initialize());
    this.app.use(passport.session());

    passport.serializeUser(function(user: any, done: any) {
      done(null, user._id);
    });

    passport.deserializeUser(function(id: any, done: any) {
      User.findById(id, function(err: any, user: any) {
        done(err, user);
      });
    });

    passport.use("login", new passportLocal.Strategy({
        passReqToCallback: true
      },
      function(req: any, username: string, password: string, done: any) {
        User.findOne({
          "username": username
          },
          function(err: any, user: any) {
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
          }
        );
    }));

    passport.use("signup", new passportLocal.Strategy({
        passReqToCallback: true
      },
      function(req: express.Request, username: string, password: string, done: any) {
        var confirmPassword = req.body.confirmPassword;
        var confirmEmail = req.body.confirmEmail;

        if (confirmEmail !== req.body.email) {
          return done(null, false, req.flash("message", "Email addresses do not match"));
        }

        if (confirmPassword !== password) {
          return done(null, false, req.flash("message", "Passwords do not match"));
        }

        console.log("Password and email match");

        let findOrCreateUser = function() {
          User.findOne({
             "username": username
            },
            function(err: any, user: any) {
              if (err) {
                console.log("Error in signup: " + err);
                return done(err);
              }

              if (user) {
                console.log("User already exists");
                return done(null, false, req.flash("message", "User already exists"));
              } else {
                let newUser = new User({
                  username: username,
                  password: Server.createHash(password),
                  email: req.body.email,
                  childsFirst: req.body.childFirst,
                  childsLast: req.body.childLast
                });

                newUser.save(function(err: any) {
                  if (err) {
                    console.log("Error in saving new user: " + err);
                    throw err;
                  }

                  console.log("User registration successful");
                  req.session.currentUser = username;
                  return done(null, newUser);
                });
              }
            }
          );
        };
        process.nextTick(findOrCreateUser);
      })
    );
  }

  /**
   * Configure routes
   *
   * @class Server
   * @method routes
   * @return void
   */
  private routes() {
    //get router
    let router: express.Router;
    router = express.Router();

    //home page
    router.get("/", function(req: express.Request, res: express.Response, next: any) {
      //If the user has already logged in, display their profile page
      if (req.session.logInSuccess) {
        return res.redirect("/home");
      }

      var parameters = null;
      //Check for session variable, then reset it if it's true
      if (req.session.error) {
        req.session.error = false;
        parameters = { pageData: { loginError: true } };
      }
      res.render("index", parameters);
    });

    router.post("/login", function(req: express.Request, res: express.Response, next: any) {
      passport.authenticate("login", function(err: any, user: any, info: any) {
        if (err) {
          return next(err);
        }
        if (!user) {
          console.log("User not found with name " + req.body.username);
          //Set session variable then redirect. This way the URL remains the same
          //but the error message shows
          req.session.error = true;
          return res.redirect("/");
        }

        req.logIn(user, function(err: any) {
          if (err) {
            return next(err);
          }
          req.session.logInSuccess = true;
          return res.redirect("/home");
        });
      })(req, res, next);
    });

    router.get("/signup", function(req: express.Request, res: express.Response) {
      res.render("register", { message: req.flash("message") });
    });

    router.post("/signup", passport.authenticate("signup"), function(req: express.Request, res: express.Response) {
      req.session.logInSuccess = true;
      res.redirect("/home");
    });

    router.get("/home", function(req: express.Request, res: express.Response) {
      if (req.session.logInSuccess) {
        res.render("home");
      } else {
        res.redirect("/");
      }
    });

    router.get("/account_page", function(req: express.Request, res: express.Response) {
      if (req.session.logInSuccess) {
        req.session.lastTab = "account";
        let currUser;
        User.findOne({
          "username": req.session.currentUser
        }).lean().exec(
          function(err: any, user: any) {
            res.render("account_page", { pageData: user });
          });
        return;
      }
      res.redirect("/");
    });

    router.post("/logout", function(req: express.Request, res: express.Response) {
      req.session.logInSuccess = false;
      res.redirect("/");
    });

    router.get("/contact_info", function(req: express.Request, res: express.Response) {
      if (req.session.logInSuccess) {
        res.render("contact_info");
      } else {
        res.redirect("/");
      }
    });

    router.post("/updateAccount", function(req: express.Request, res: express.Response) {
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
      User.findOneAndUpdate(query, update, {new: true}, function(err: any, user: any) {
        if (err) {
          return res.send(500, {error: err});
        }
        return res.redirect(req.get("referer"));
      });
    });

    router.get("/feedback_form", function(req: express.Request, res: express.Response) {
      if (req.session.logInSuccess) {
        User.findOne({ username: req.session.currentUser }).lean().exec(function(err: any, user: any) {
          var pageData;
          if (req.session.emailStatus === EmailStatus.SUCCESS || req.session.emailStatus === EmailStatus.FAILED) {
            var emailSuccess = (req.session.emailStatus === EmailStatus.FAILED) ? false : true;
            pageData = { pageData: {user: user, emailStatus: emailSuccess}};
          } else {
            pageData = { pageData: { user: user }};
          }
          req.session.emailStatus = EmailStatus.NO_ATTEMPT;
          console.log("Sending page data: " + pageData);
          res.render("feedback_form", pageData);
        });
      } else {
        res.redirect("/");
      }
    });

    router.post("/submitFeedback", function(req: express.Request, res: express.Response) {
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

      transport.sendMail(mailOptions, function(err: any, info: any) {
        if (err) {
          console.log("Email failure: " + err);
          req.session.emailStatus = EmailStatus.FAILED;
          return res.redirect(req.get("referer"));
        } else {
          console.log("Email Sent: " + info.response);
          req.session.emailStatus = EmailStatus.SUCCESS;
          return res.redirect(req.get("referer"));
        }
      });
    });

    //use router middleware
    this.app.use(router);
  }
}

var server = Server.bootstrap();
export = server.app;