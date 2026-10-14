#!/usr/bin/env node

/**
 * MSLX Plugin Dev Skill - 双通道发布助手
 * 支持将当前 Skill 同时发布为：
 * 1. 组织级包: @mslteam/mslx-plugin-dev-skill
 * 2. 个人/全局包: mslx-plugin-dev-skill
 * 支持 Token 自动写入临时 .npmrc，支持 2FA OTP 验证码传入。
 * 发布完成后自动恢复 package.json 与 .npmrc，不影响 Git 仓库状态。
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const skillDir = path.resolve(__dirname, '..');
const pkgPath = path.join(skillDir, 'package.json');
const npmrcPath = path.join(skillDir, '.npmrc');

const originalPkgStr = fs.readFileSync(pkgPath, 'utf8');
const originalPkg = JSON.parse(originalPkgStr);

const hadNpmrc = fs.existsSync(npmrcPath);
const originalNpmrc = hadNpmrc ? fs.readFileSync(npmrcPath, 'utf8') : null;

const packagesToPublish = [
  '@mslteam/mslx-plugin-dev-skill',
  'mslx-plugin-dev-skill'
];

function askInput(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('[INFO] 正在启动双通道 npm 发布助手 (组织级 + 个人/全局级)...\n');

  // 1. 检索或询问 Token
  let token = process.argv.find((a) => a.startsWith('--token='))?.split('=')[1]
           || process.env.NPM_TOKEN
           || process.env.npm_config__auth_token;

  if (token) {
    console.log('[INFO] 检测到传入的 NPM Token，正在配置临时认证配置...');
    fs.writeFileSync(npmrcPath, `//registry.npmjs.org/:_authToken=${token.trim()}\n`);
  }

  // 2. 检索或询问 2FA OTP
  let otp = process.argv.find((a) => a.startsWith('--otp='))?.split('=')[1];
  if (!otp && !token) {
    otp = await askInput('若账号开启了 2FA，请输入 6 位动态验证码 (OTP) [若使用 Token 或未开启直接按回车]: ');
  }
  console.log('');

  try {
    for (const name of packagesToPublish) {
      console.log(`[INFO] [${packagesToPublish.indexOf(name) + 1}/${packagesToPublish.length}] 正在发布 ${name} ...`);
      const currentPkg = JSON.parse(JSON.stringify(originalPkg));
      currentPkg.name = name;
      fs.writeFileSync(pkgPath, JSON.stringify(currentPkg, null, 2) + '\n');

      const otpParam = otp ? ` --otp=${otp}` : '';
      const cmd = `npm publish --access public --registry=https://registry.npmjs.org/${otpParam}`;

      try {
        execSync(cmd, {
          cwd: skillDir,
          stdio: 'inherit'
        });
        console.log(`[SUCCESS] ${name} 发布成功。\n`);
      } catch (cmdErr) {
        console.error(`\n[ERROR] ${name} 发布失败。\n`);
        throw cmdErr;
      }
    }
    console.log('[SUCCESS] 双通道发布全部完成。');
  } catch (err) {
    console.error('\n[ERROR] 发布中断:', err.message);
    process.exitCode = 1;
  } finally {
    // 恢复原始 package.json
    fs.writeFileSync(pkgPath, originalPkgStr);
    console.log('[INFO] package.json 已恢复为默认规范包名: @mslteam/mslx-plugin-dev-skill');

    // 清理或恢复临时 .npmrc，避免 Token 泄露
    if (token) {
      if (hadNpmrc && originalNpmrc !== null) {
        fs.writeFileSync(npmrcPath, originalNpmrc);
      } else if (fs.existsSync(npmrcPath)) {
        fs.unlinkSync(npmrcPath);
      }
      console.log('[INFO] 临时认证配置已自动清除。');
    }
    console.log('');
  }
}

main();
