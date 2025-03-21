import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const setupPassport = () => {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists with this Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // Check if user exists with the same email
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Update existing user with Google ID
                    user.googleId = profile.id;
                    await user.save({ validateBeforeSave: false });
                    return done(null, user);
                }

                // Create new user
                const newUser = await User.create({
                    googleId: profile.id,
                    firstName: profile.name.givenName || profile.displayName.split(' ')[0],
                    lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' '),
                    email: profile.emails[0].value,
                    password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
                });

                return done(null, newUser);
            } catch (error) {
                return done(error, null);
            }
        }));
};

export default setupPassport;