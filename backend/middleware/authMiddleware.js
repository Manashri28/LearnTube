// JWT authentication middleware.
// Middleware runs before protected route handlers to decide whether a request can continue.

const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
const authHeader = req.headers.authorization;

if(!authHeader || !authHeader.startsWith("Bearer ")) {
return res.status(401).json({
message: "No token provided"
});
}

const token = authHeader.split(" ")[1];

try {
// jwt.verify() checks that the token was signed with our secret and has not expired.
// If valid, it returns the decoded payload, which contains the user data we signed during login.
const decoded = jwt.verify(
token,
process.env.JWT_SECRET
);

req.user = decoded;
next();
} catch (error) {
return res.status(401).json({
message: "Access denied"
});
}
};

module.exports = protect;
