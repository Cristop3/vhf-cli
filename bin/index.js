#!/usr/bin/env node

// 可以自动的解析命令和参数，用于处理用户输入的命令。
const program = require('commander');

// 解析参数
const minimist = require('minimist');
// 终端样式库
const chalk = require('chalk');

// 打印缩写
const log = console.log;

// 初始化命令相关
program
  .version(
    `${require('../package.json').version}`,
    '-v, --version',
    '打印当前脚手架版本号'
  )
  .usage('<command>');

// create命令
program
  .command('create <project-name>')
  .description('克隆h5基础模板 快速开发')
  .action((pName) => {
    // 判断新项目名称是否合规
    // 为什么使用slice(3) 因为他前面有两个node系统参数  node 程序位置和js脚本位置，数组中随后的元素都是我们启动Node.js后的参数
    if (minimist(process.argv.slice(3))['_'].length > 1) {
      log(
        chalk.rgb(
          255,
          130,
          71
        )(
          '警告:你输入了多个参数,我们只会取第一个参数作为该新项目名称,其余参数会舍弃！'
        )
      );
    }
    require('../lib/create')(pName);
  });

// 未知命令提示
program.arguments('<command>').action((cmd) => {
  program.outputHelp();
  console.log(`  ` + chalk.red(`没有当前这个 ${chalk.yellow(cmd)} 命令.`));
  console.log();
});

// 参数挂载
program.parse(process.argv);
