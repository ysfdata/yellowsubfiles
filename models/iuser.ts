/* This is the interface for the User model. This is needed
    to get typescript to recognize the various attributes on the 
    user model */
interface IUser {
    //The username on the account
    username: string,
    //The password for the account (this will be hashed and can't be modified directly)
    password: string,
    //The parent's email
    email: string,
    //The child's first name
    childsFirst: string,
    //The child's last name
    childsLast: string,
    //The parent's first name
    firstname: string,
    //The parent's last name
    lastname: string,
    //The parent's home phone
    homePhone: string,
    //The parent's cell phone
    cellPhone: string,
    //The parent's work phone
    workPhone: string,
    //The parent's street address in the format street no./city,state/zip
    address: {
        street: string,
        cityState: string,
        zip: string
    },
    //The child's birthday
    birthday: string,
    //The emergency contact's first name
    emerFirst: string,
    //The emergency contact's last name
    emerLast: string,
    //The emergency contact's address
    emerAddress: {
        street: string,
        cityState: string,
        zip: string
    },
    //The emergency contact's phone number
    emerPhone: string
}

export = IUser;