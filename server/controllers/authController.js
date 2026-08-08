import { User } from "../models/User.model.js";
import jwt from "jsonwebtoken";

const setSessionCookie = (res, payload) => {

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    // generate token
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:  30 * 24 * 60 * 60 * 1000, //30 days
        path: "/"
    })

}

export async function register(req, res) {
    const { name, email, password } = req.body;
    if(!name || !email || !password) {
        return res.status(400).json({error: "Please provide the required fields."});
    }
    const trimmedEmail = email.toLowerCase().trim();

    // check if user exist with the email
    const exisiting = await User.findOne({email: trimmedEmail});
    if(exisiting) {
        return res.status(400).json({error: "An account with this email already exists"});
    }

    const user = await User.create({
        name, 
        email: trimmedEmail, 
        password
    });

    // set token in browser cookie
    setSessionCookie(res, {userId: user._id, email: user.email});

    return res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    });
}

export async function login(req, res) {
    const { email, password } = req.body;
    if( !email || !password) {
        return res.status(400).json({error: "Please provide the required fields."});
    }
    
    const trimmedEmail = email.toLowerCase().trim();

    // check if user exist with the email
    const user = await User.findOne({email: trimmedEmail});
    if(!user) {
        return res.status(400).json({error: "Invalid email or password"});
    }

    // validate password
    const isValid = await user.comparePassword(password);
    if(!isValid) {
        return res.status(400).json({error: "Invalid email or password"});
    }
    
    // set token in browser cookie
    setSessionCookie(res, {userId: user._id, email: user.email});

    return res.status(200).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    });
}

export async function logout(_req, res) {
    res.cookie("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/"
    });

    res.json({success: true});
}

export async function me(req, res) {
    if(!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findById(req.user.userId).select("-password");
    if(!user){
         return res.status(404).json({ error: "User not found" });
    }

    return res.status({user});
}
