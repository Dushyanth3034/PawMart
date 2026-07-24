import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { EmailService } from '../services/email.service.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(config.googleClientId);

// Cookie Options for refresh tokens
const cookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '15m' });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (existingUser) {
      return next(new AppError(400, 'User with this email already exists.'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store refresh token in session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(201).json({
      status: 'success',
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (!user) {
      return next(new AppError(401, 'Invalid email or password.'));
    }

    if (user.isSuspended) {
      return next(new AppError(403, 'Your account has been suspended. Please contact administrator support.'));
    }

    // Match password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError(401, 'Invalid email or password.'));
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store refresh token in session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      status: 'success',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return next(new AppError(401, 'Refresh token not found. Please log in.'));
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);

    // Check if session exists in DB
    const existingSession = await prisma.session.findUnique({
      where: { token: refreshToken },
    });
    if (!existingSession) {
      return next(new AppError(401, 'Session revoked or expired. Please log in again.'));
    }

    // Find User
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      return next(new AppError(401, 'User no longer exists.'));
    }

    // Token rotation: Revoke current refresh token session
    await prisma.session.delete({
      where: { token: refreshToken },
    });

    // Generate new tokens
    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store new refresh token session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set new refresh token in secure cookie
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(new AppError(401, 'Invalid refresh token session.'));
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      // Remove from session db
      await prisma.session.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear client side cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out.',
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new AppError(400, 'Please provide current, new, and confirm passwords.'));
    }

    if (currentPassword === newPassword) {
      return next(new AppError(400, 'Current password and new password cannot be the same.'));
    }

    if (newPassword !== confirmPassword) {
      return next(new AppError(400, 'New password and confirm password do not match.'));
    }

    if (newPassword.length < 8) {
      return next(new AppError(400, 'New password must be at least 8 characters long.'));
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return next(new AppError(404, 'User not found.'));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return next(new AppError(401, 'Incorrect current password.'));
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password in DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash }
    });

    res.status(200).json({ status: 'success', message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    console.log(`[Forgot Password Step 1] Email received: ${email}`);

    if (!email) {
      return next(new AppError(400, 'Email address is required.'));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError(400, 'Invalid email address.'));
    }

    // Check if account exists
    const user = await prisma.user.findUnique({
      where: { email }
    });
    console.log(`[Forgot Password Step 2] User found in database: ${user ? 'YES' : 'NO'}`);

    // Cleanup expired OTPs from DB
    await prisma.otp.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    // Enforce Generic Message regardless of user existence (to prevent user enumeration)
    const successResponse = (stepMsg) => {
      console.log(`[Forgot Password Step 7] API response sent: Success. Reason: ${stepMsg}`);
      res.status(200).json({
        status: 'success',
        message: 'If an account exists with this email, an OTP has been sent.'
      });
    };

    if (!user) {
      return successResponse('User does not exist in DB (silent success to prevent enumeration)');
    }

    // Check for resend OTP cooldown (60 seconds)
    const existingOtp = await prisma.otp.findUnique({
      where: { email }
    });

    if (existingOtp) {
      const timeSinceLastOtp = Date.now() - new Date(existingOtp.createdAt).getTime();
      if (timeSinceLastOtp < 60 * 1000) {
        console.log(`[Forgot Password Exit] Rate limit hit: resend cooldown active.`);
        return next(new AppError(429, 'Please wait 60 seconds before requesting another OTP.'));
      }
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[Forgot Password Step 3] OTP generated: ${otpCode}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Upsert the OTP record
    await prisma.otp.upsert({
      where: { email },
      update: {
        code: otpCode,
        attempts: 0,
        expiresAt,
        createdAt: new Date()
      },
      create: {
        email,
        code: otpCode,
        expiresAt
      }
    });
    console.log(`[Forgot Password Step 4] OTP saved/upserted to database.`);

    // Send OTP using EmailService
    console.log(`[Forgot Password Step 5] Calling EmailService.sendOtpEmail...`);
    const emailResult = await EmailService.sendOtpEmail(email, otpCode);
    console.log(`[Forgot Password Step 6] Brevo response:`, JSON.stringify(emailResult, null, 2));

    return successResponse('OTP email sent successfully via Brevo');
  } catch (error) {
    console.error(`[Forgot Password Failure] Error:`, error);
    next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new AppError(400, 'Email and OTP are required.'));
    }

    const otpRecord = await prisma.otp.findUnique({
      where: { email }
    });

    if (!otpRecord) {
      return next(new AppError(400, 'Invalid OTP.'));
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await prisma.otp.delete({ where: { email } });
      return next(new AppError(400, 'OTP expired.'));
    }

    // Check attempts limit (max 5)
    if (otpRecord.attempts >= 5) {
      await prisma.otp.delete({ where: { email } });
      return next(new AppError(400, 'Too many verification attempts.'));
    }

    // Check if code matches
    if (otpRecord.code !== otp) {
      await prisma.otp.update({
        where: { email },
        data: { attempts: otpRecord.attempts + 1 }
      });
      return next(new AppError(400, 'Invalid OTP.'));
    }

    // OTP verified successfully! Delete OTP after successful verification
    await prisma.otp.delete({ where: { email } });

    // Generate a temporary 10-minute reset token containing user's email
    const resetToken = jwt.sign(
      { email, purpose: 'reset-password' },
      config.jwtAccessSecret,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return next(new AppError(400, 'Please provide all required fields.'));
    }

    if (newPassword !== confirmPassword) {
      return next(new AppError(400, 'Passwords do not match.'));
    }

    // Enforce Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return next(new AppError(400, 'Password does not meet security requirements.'));
    }

    // Verify resetToken
    let decoded;
    try {
      decoded = jwt.verify(resetToken, config.jwtAccessSecret);
    } catch (err) {
      return next(new AppError(400, 'Invalid or expired password reset session. Please request a new OTP.'));
    }

    if (decoded.purpose !== 'reset-password' || !decoded.email) {
      return next(new AppError(400, 'Invalid reset session token.'));
    }

    // Find the user by decoded email
    const user = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    if (!user) {
      return next(new AppError(404, 'User not found.'));
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update in DB
    await prisma.user.update({
      where: { email: decoded.email },
      data: { passwordHash }
    });

    // Revoke any existing active refresh token sessions for this user (force log out from other devices)
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { idToken, accessToken } = req.body;
    let userData = null;

    if (idToken) {
      // Verify Google ID Token securely using google-auth-library
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: config.googleClientId
        });
        const payload = ticket.getPayload();
        
        userData = {
          googleId: payload.sub,
          email: payload.email,
          firstName: payload.given_name || 'User',
          lastName: payload.family_name || '',
          avatarUrl: payload.picture || null,
          isVerified: payload.email_verified || false
        };
      } catch (err) {
        return next(new AppError(401, 'Invalid or expired Google ID Token.'));
      }
    } else if (accessToken) {
      // Fallback: Verify Google Access Token via official UserInfo endpoint
      try {
        const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
        if (!googleResponse.ok) {
          return next(new AppError(401, 'Invalid Google Access Token.'));
        }
        const payload = await googleResponse.json();
        
        userData = {
          googleId: payload.sub,
          email: payload.email,
          firstName: payload.given_name || 'User',
          lastName: payload.family_name || '',
          avatarUrl: payload.picture || null,
          isVerified: payload.email_verified || false
        };
      } catch (err) {
        return next(new AppError(401, 'Failed to verify Google Access Token.'));
      }
    } else {
      return next(new AppError(400, 'Either Google ID Token or Access Token is required.'));
    }

    const { googleId, email, firstName, lastName, avatarUrl, isVerified } = userData;

    if (!email) {
      return next(new AppError(400, 'Email not provided by Google.'));
    }

    // Search for existing user by email
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        googleId: true,
        authProvider: true,
        createdAt: true,
      },
    });

    if (user) {
      // If user exists, associate googleId and authProvider if not already set
      if (!user.googleId || user.authProvider !== 'GOOGLE') {
        user = await prisma.user.update({
          where: { email },
          data: {
            googleId,
            authProvider: 'GOOGLE',
            avatarUrl: user.avatarUrl || avatarUrl
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isVerified: true,
            avatarUrl: true,
            googleId: true,
            authProvider: true,
            createdAt: true,
          }
        });
      }
    } else {
      // Create new Buyer account
      const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      const newUser = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          role: 'BUYER', // Default role for new users
          isVerified,
          avatarUrl,
          googleId,
          authProvider: 'GOOGLE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isVerified: true,
          avatarUrl: true,
          googleId: true,
          authProvider: true,
          createdAt: true,
        },
      });
      user = newUser;
    }

    // Generate tokens using existing system
    const jwtAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Store refresh token in session using the existing session system
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      status: 'success',
      user,
      accessToken: jwtAccessToken,
    });
  } catch (error) {
    next(error);
  }
}
