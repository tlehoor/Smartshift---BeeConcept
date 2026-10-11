import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import type { DbClient } from './types.js';

const { Client } = pg;

export interface BootstrapAdminOptions {
  client?: DbClient | any;
  databaseUrl?: string;
  phone?: string;
  name?: string;
  email?: string;
  password?: string;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
  };
}

export interface BootstrapAdminResult {
  success: boolean;
  adminId: string;
  phone: string;
  name: string;
  email: string;
}

export function sanitizeLog(msg: string): string {
  return msg.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
}

/**
 * Checks if an administrator account already exists in the database.
 */
export async function checkAdminExists(client: DbClient | any): Promise<boolean> {
  const res = await client.query(
    "SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"
  );
  return (res.rows?.length || 0) > 0;
}

/**
 * Core function to initialize the first ADMIN account safely.
 * Aborts if an ADMIN account already exists to prevent accidental overwrites.
 */
export async function bootstrapAdmin(options: BootstrapAdminOptions = {}): Promise<BootstrapAdminResult> {
  const logger = options.logger || console;
  let client = options.client;
  let ownClient = false;

  if (!client) {
    const databaseUrl = (options.databaseUrl ?? process.env.DATABASE_URL)?.trim();
    if (!databaseUrl) {
      throw new Error('BOOTSTRAP_ADMIN_FAILED: DATABASE_URL is required.');
    }

    const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
    const isSslRequired = databaseUrl.includes('sslmode=require') || isSupabase;

    client = new Client({
      connectionString: databaseUrl,
      ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    ownClient = true;
  }

  try {
    // 1. Validate input parameters
    const cleanPhone = normalizePhone(options.phone || '');
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('VALIDATION_FAILED: Số điện thoại không hợp lệ (tối thiểu 9 chữ số).');
    }

    const name = (options.name || '').trim();
    if (!name || name.length < 2) {
      throw new Error('VALIDATION_FAILED: Tên quản trị viên không hợp lệ (tối thiểu 2 ký tự).');
    }

    const email = (options.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('VALIDATION_FAILED: Email không hợp lệ.');
    }

    const password = options.password || '';
    if (!password || password.length < 8) {
      throw new Error('VALIDATION_FAILED: Mật khẩu quản trị viên phải có tối thiểu 8 ký tự.');
    }

    // 2. Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Execute creation within atomic transaction with exclusive advisory lock
    await client.query('BEGIN');
    try {
      // 3.1 Acquire transaction-level advisory lock to serialize concurrent executions
      await client.query("SELECT pg_advisory_xact_lock(hashtext('smartshift_bootstrap_admin'))");

      // 3.2 Guard check: Check if an ADMIN already exists AFTER acquiring the lock
      const adminExists = await checkAdminExists(client);
      if (adminExists) {
        const msg = 'BOOTSTRAP_ADMIN_ABORTED: Hệ thống đã tồn tại tài khoản Quản trị viên (ADMIN). Script chỉ dùng để khởi tạo ADMIN đầu tiên cho cơ sở dữ liệu trống.';
        logger.warn(`[BootstrapAdmin] ${msg}`);
        throw new Error(msg);
      }

      // 3.3 Check for conflict with existing phone or email
      const phoneRes = await client.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
      if (phoneRes.rows?.length > 0) {
        throw new Error('VALIDATION_FAILED: Số điện thoại này đã tồn tại trên hệ thống.');
      }

      const emailRes = await client.query('SELECT id FROM employees WHERE email = $1', [email]);
      if (emailRes.rows?.length > 0) {
        throw new Error('VALIDATION_FAILED: Email này đã được đăng ký trên hệ thống.');
      }

      const userRes = await client.query(
        `INSERT INTO users (phone, password_hash, role, account_status, is_first_login)
         VALUES ($1, $2, 'ADMIN', 'ACTIVE', FALSE)
         RETURNING id`,
        [cleanPhone, passwordHash]
      );
      const newId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO employees (id, name, email, target_shifts)
         VALUES ($1, $2, $3, 0)`,
        [newId, name, email]
      );

      await client.query(
        `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
         VALUES ($1, $2, 'Khởi tạo tài khoản Quản trị viên đầu tiên (Bootstrap Admin)', 'SYSTEM', $2, 'Khởi tạo tài khoản ADMIN ban đầu thông qua script CLI an toàn', 'SUCCESS')`,
        [newId, name]
      );

      await client.query('COMMIT');
      logger.info(`[BootstrapAdmin] Tạo tài khoản ADMIN thành công: ${name} (Phone: ${cleanPhone}, Email: ${email}).`);

      return {
        success: true,
        adminId: newId,
        phone: cleanPhone,
        name,
        email,
      };
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  } catch (err: any) {
    logger.error(`[BootstrapAdmin] Error: ${sanitizeLog(err.message)}`);
    throw err;
  } finally {
    if (ownClient && client) {
      await client.end().catch(() => {});
    }
  }
}

// -------------------------------------------------------------
// Interactive CLI helper for manual execution
// -------------------------------------------------------------
function promptInput(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function promptPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    let password = '';

    const onData = (buf: Buffer) => {
      const str = buf.toString('utf-8');
      for (const char of str) {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY) {
            stdin.setRawMode(false);
          }
          process.stdout.write('\n');
          resolve(password);
          return;
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (char === '\u007f' || char === '\b') {
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      }
    };

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('data', onData);
    } else {
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

async function runCli() {
  console.log('=== SMARTSHIFT — INITIAL ADMIN BOOTSTRAP ===');
  console.log('Script này dùng để tạo duy nhất 1 tài khoản ADMIN khởi thủy khi database đang rỗng.');

  const phone = process.env.ADMIN_PHONE || await promptInput('Nhập số điện thoại ADMIN (VD: 0901999888): ');
  const name = process.env.ADMIN_NAME || await promptInput('Nhập họ và tên ADMIN: ');
  const email = process.env.ADMIN_EMAIL || await promptInput('Nhập email ADMIN: ');
  const password = process.env.ADMIN_PASSWORD || await promptPassword('Nhập mật khẩu ADMIN (tối thiểu 8 ký tự): ');

  if (!password) {
    console.error('[BootstrapAdmin] Lỗi: Mật khẩu không được để trống.');
    process.exit(1);
  }

  await bootstrapAdmin({
    phone,
    name,
    email,
    password,
  });

  console.log('=== HOÀN TẤT KHỞI TẠO TÀI KHOẢN ADMIN ===');
}

// Standalone execution detection
const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  runCli()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
