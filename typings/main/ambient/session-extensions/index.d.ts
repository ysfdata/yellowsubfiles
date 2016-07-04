// This file extends the definition for Express.Session to includde any new variables
// you may want to pass along with a session
declare module Express {
  export interface Session {
    //For displaying error messages TODO: expand this to take an error code
    error: boolean;
    //tracks whether someone is logged in
    logInSuccess: boolean;
    //tracks the name of the last tab visited to make page refreshing better
    lastTab: string;
    //tracks the currently logged in user
    currentUser: any;
    //Holds a status code for email messages.
    //Currently -1 = failure, 0 = success
    emailStatus: number;
  }
}