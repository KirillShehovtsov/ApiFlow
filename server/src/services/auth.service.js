// src/services/auth.service.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export const register = async ({ name, email, password }) => {
  // Проверяем что такой email ещё не зарегистрирован
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  // Хэшируем пароль — никогда не храним пароль в открытом виде
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return generateToken(user);
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Одинаковое сообщение для "нет юзера" и "неверный пароль" —
  // чтобы нельзя было перебором узнать какие email зарегистрированы
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  return generateToken(user);
};

export const getProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    // select — возвращаем только нужные поля, passwordHash не отдаём никогда
    select: { id: true, name: true, email: true, createdAt: true },
  });
};

export const updateProfile = async (userId, { name, email, currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const updates = {};
  
  // Обновление имени
  if (name !== undefined) {
    updates.name = name;
  }
  
  // Обновление email с проверкой уникальности
  if (email !== undefined && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }
    updates.email = email;
  }
  
  // Обновление пароля
  if (newPassword) {
    if (!currentPassword) {
      const err = new Error('Current password is required to change password');
      err.status = 400;
      throw err;
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Current password is incorrect');
      err.status = 401;
      throw err;
    }
    
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  // Если нет изменений
  if (Object.keys(updates).length === 0) {
    return getProfile(userId);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return updatedUser;
};

const generateToken = (user) => {
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
};