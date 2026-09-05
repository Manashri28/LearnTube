// Authentication controller
// Handles registration and login functionality

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

// =======================
// REGISTER USER
// =======================

const registerUser = async (req,res)=>{

try{

const {
name,
email,
password
}=req.body;


// Validate input fields

if(!name || !email || !password){

return res.status(400).json({

message:
"Name, email and password are required"

});

}


// Check if user already exists

const existingUser =
await User.findOne({

email

});

if(existingUser){

return res.status(400).json({

message:
"Email already exists"

});

}


// Passwords should never be stored directly
// Salt adds randomness before hashing
// Hashing creates a secure one-way value

const salt=
await bcrypt.genSalt(10);

const hashedPassword=
await bcrypt.hash(
password,
salt
);


// Create new user

const user=
await User.create({

name,
email,
password:
hashedPassword

});


// Send success response

res.status(201).json({

message:
"Registration successful",

user:{

id:user._id,
name:user.name,
email:user.email,
createdAt:user.createdAt

}

});

}
catch(error){

res.status(500).json({

message:
"Registration failed",

error:error.message

});

}

};


// =======================
// LOGIN USER
// =======================

const loginUser=async(req,res)=>{

try{

const {

email,
password

}=req.body;


// Validate input

if(!email || !password){

return res.status(400).json({

message:
"Email and password are required"

});

}


// Find user

const user=
await User.findOne({

email

});


if(!user){

return res.status(400).json({

message:
"Invalid email or password"

});

}


// Compare entered password with stored hash

const isPasswordCorrect=
await bcrypt.compare(

password,
user.password

);


if(!isPasswordCorrect){

return res.status(400).json({

message:
"Invalid email or password"

});

}


// JWT token generation
// Added name to payload so frontend
// can access req.user.name later

const token=
jwt.sign(

{

userId:user._id,

name:user.name,

email:user.email

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

);


// Success response

res.status(200).json({

message:
"Login successful",

token,

user:{

id:user._id,

name:user.name,

email:user.email

}

});

}
catch(error){

res.status(500).json({

message:
"Login failed",

error:error.message

});

}

};


// =======================
// GOOGLE LOGIN / REGISTER
// =======================

const googleAuth = async (req,res) => {

    try {

        const { credential } = req.body;

        if(!credential){
            return res.status(400).json({
                message:"Google credential is required"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken:credential,
            audience:process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        if(!email){
            return res.status(400).json({
                message:"Google account email could not be verified"
            });
        }

        let user = await User.findOne({ email });

        if(!user){

            user = await User.create({
                name:name || "LearnTube User",
                email,
                googleId
            });

        }else{

            if(!user.googleId){
                user.googleId = googleId;
                await user.save();
            }

        }

        const token = jwt.sign(
            {
                userId:user._id,
                name:user.name,
                email:user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"7d"
            }
        );

        return res.status(200).json({

            message:"Google authentication successful",

            token,

            user:{
                id:user._id,
                name:user.name,
                email:user.email
            }

        });

    } catch(error){

        console.error("Google authentication failed:",error);

        return res.status(500).json({
            message:"Google authentication failed"
        });

    }

};


module.exports={
    registerUser,
    loginUser,
    googleAuth
};