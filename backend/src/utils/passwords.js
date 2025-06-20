// utils/passwords.js
import bcrypt from 'bcryptjs';
export const hash = (pwd) => bcrypt.hash(pwd, 12);
export const compare = (pwd, hash) => bcrypt.compare(pwd, hash);