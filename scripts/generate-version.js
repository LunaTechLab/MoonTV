#!/usr/bin/env node
/* eslint-disable */

const fs = require('fs');
const path = require('path');

// 获取当前时间并格式化为 YYYYMMDDHHMMSS 格式
function generateVersion() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const version = `${year}${month}${day}${hours}${minutes}${seconds}`;

  return version;
}

// 生成版本号
const currentVersion = generateVersion();

// 读取现有的 version.ts 文件
const versionFilePath = path.join(__dirname, '..', 'src', 'lib', 'version.ts');
let fileContent = fs.readFileSync(versionFilePath, 'utf8');

// 使用正则表达式替换 CURRENT_VERSION 的值
const updatedContent = fileContent.replace(
  /const CURRENT_VERSION = '.*?'/,
  `const CURRENT_VERSION = '${currentVersion}'`
);

// 写入更新后的内容
fs.writeFileSync(versionFilePath, updatedContent, 'utf8');

// 将版本号写入根目录下的 VERSION.txt 文件
const versionTxtPath = path.join(__dirname, '..', 'VERSION.txt');
fs.writeFileSync(versionTxtPath, currentVersion, 'utf8');

console.log(`版本号已更新为: ${currentVersion}`);
console.log(`文件已更新: ${versionFilePath}`);
console.log(`VERSION.txt 已更新: ${versionTxtPath}`);
