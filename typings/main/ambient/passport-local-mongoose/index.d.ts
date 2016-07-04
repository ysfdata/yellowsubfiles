/// <reference path="../mongoose/index.d.ts" />

declare module 'mongoose' {
    // methods
    export interface PassportLocalDocument extends Document {
        setPassword(pass: string, cb: (err: any) => void);
    }

    // statics
    export interface PassportLocalModel<T extends PassportLocalDocument> extends Model<T> {
        authenticate(username: string, password: string, cb: (err: any) => void);
    }

    // plugin options
    export interface PassportLocalOptions {
        usernameField?: string;
        usernameLowerCase?: boolean;
    }

    export interface PassportLocalSchema extends Schema {
        plugin(
            plugin: (schema: PassportLocalSchema, options?: PassportLocalOptions) => void,
            options?: PassportLocalOptions): Schema;
    }

    export function model<T extends PassportLocalDocument>(
        name: string,
        schema?: PassportLocalSchema,
        collection?: string,
        skipInit?: boolean): PassportLocalModel<T>;
}

declare module 'passport-local-mongoose' {
    import mongoose = require('mongoose');
    var _: (schema: mongoose.Schema, Options?: Object) => void;
    export = _;
}