require('dotenv').config();

const readline = require('node:readline');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

function question(prompt) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => terminal.question(prompt, (answer) => {
    terminal.close();
    resolve(answer.trim());
  }));
}

function secret(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Run this recovery command in an interactive terminal.'));
      return;
    }

    let value = '';
    const finish = (error) => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') return finish(new Error('Recovery cancelled.'));
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char >= ' ' && char !== '\u007f' && value.length < 128) {
          value += char;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function resetAdminPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this recovery command directly in an interactive server terminal.');
  }
  const email = (await question('Admin email: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid admin email.');

  const password = await secret('New password (12–128 characters): ');
  const confirmation = await secret('Confirm new password: ');
  if (password.length < 12 || password.length > 128) throw new Error('Use a password between 12 and 128 characters.');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  await connectDB();
  const admin = await User.findOne({ email, role: 'admin', active: { $ne: false } }).select('_id').lean();
  if (!admin) throw new Error('No active administrator account matched that email.');

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await User.updateOne(
    { _id: admin._id, role: 'admin', active: { $ne: false } },
    {
      $set: { password: passwordHash },
      $inc: { sessionVersion: 1 },
      $unset: {
        adminResetOtpHash: 1,
        adminResetOtpExpiresAt: 1,
        adminResetOtpAttempts: 1,
        adminResetOtpSentAt: 1,
        adminResetTokenHash: 1,
        adminResetTokenExpiresAt: 1,
      },
    }
  );
  if (!result.modifiedCount) throw new Error('Password was not changed. Confirm the account is still active and try again.');
  process.stdout.write('Admin password reset. Existing sessions have been signed out.\n');
}

resetAdminPassword()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
