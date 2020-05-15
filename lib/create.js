// 下载远程仓库
const download = require('download-git-repo');

// 用户交互
const inquirer = require('inquirer');

// 终端样式库
const chalk = require('chalk');

// 下载动画
const ora = require('ora');

// 提示图标
const symbols = require('log-symbols');

// 操作文件
const fse = require('fs-extra');

// 路径
const { resolve } = require('path');

// 调命令
const spawn = require('cross-spawn')

// console.log('__dirname : ' + __dirname)
// console.log('resolve   : ' + resolve('./'))
// console.log('cwd       : ' + process.cwd())
// console.log('cwd       : ' + resolve(process.cwd(),'../'))

// 暴露出去的创建方法
async function create() {
  const { gitAddress, gitBranch, flag } = await _questionPrompt();
  const dir = `${process.cwd()}\\clone`;

  if (flag) {
    const spinner = ora('正在下载模板...');
    spinner.start();
    download(
      `direct:${gitAddress}.git#${gitBranch}`,
      'clone',
      { clone: true },
      (err) => {
        if (err) {
          // 若下载失败 则清除已下载好的文件夹
          spinner.fail();
          console.log(
            symbols.error,
            chalk.red(
              '下载失败:请确认地址是否写正确?确认模板分支是否存在?确认是否有模板工程的权限?'
            )
          );
          // 首先判断我们这边是否已下载生成了名字叫clone的文件夹
          if (fse.existsSync(dir)) {
            // 清除文件夹
            const dropSpinner = ora('正在清理失败下载的废弃文件夹...');
            dropSpinner.start();
            deleteDir(dir, function () {
              dropSpinner.succeed();
            });
          }
        } else {
          // 若下载成功 则需要将clone下的文件全部copy到上一节目录下 并删除clone文件夹
          if (fse.existsSync(dir)) {
            copyFolder(dir, process.cwd(), function () {
              // 再删除
              deleteDir(dir, function () {
                spinner.succeed();
                console.log(symbols.success, chalk.yellow('下载模板成功'));
                // 下载成功后 执行自动安装
                const installSpinner = ora('自动安装依赖...')
                installSpinner.start()
                install({cmd:dir}).then(res=>{
                  installSpinner.succeed()
                  console.log(symbols.success, chalk.yellow('依赖安装成功'));
                  console.log()
                  console.log(chalk.yellow('执行 npm run serve开启新项目'))
                }).catch(err=>{
                  console.log(chalk.red('安装失败 请手动执行npm install'))
                })
              });
            });
          }
        }
      }
    );
  }
}

/**
 * @func 问题交互
 */
async function _questionPrompt() {
  // 校验ip
  const ipPattern = /^http:\/\/((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}\/gitlab\//g;

  // 校验分支模板
  const branchPattern = /^feature\/feature-/g;
  // 提示输入git地址
  const promptInput = [
    {
      type: 'input',
      message: '请输入需要下载的h5-gitlab模板地址:',
      name: 'gitAddress',
      validate: function (v) {
        v = trim(v);
        if (ipPattern.test(v)) {
          // 校验过关需要返回true
          return true;
        } else {
          return chalk.red('请输入正确的gitlab地址!');
        }
      },
    },
    {
      type: 'input',
      message: '请输入您需要下载的模板分支(格式feature/feature-xxx):',
      name: 'gitBranch',
      validate: function (v) {
        v = trim(v);
        if (branchPattern.test(v)) {
          // 校验过关需要返回true
          return true;
        } else {
          return chalk.red('请输入正确的模板分支(格式feature/feature-xxx)');
        }
      },
    },
  ];

  // 获取用户输入值
  let { gitAddress, gitBranch } = await inquirer.prompt(promptInput);

  // 根据用户输入值拼接真实git地址
  if (!!gitAddress && !!gitBranch) {
    // 格式化字符串
    gitAddress = trim(gitAddress);
    gitBranch = trim(gitBranch);

    console.log(
      '当前请求路径：',
      chalk.yellow(`${gitAddress}.git#${gitBranch}`)
    );

    // 再次询问用户当前地址是否正确
    const promptList = [
      {
        type: 'list',
        message: '请您再次确认当前地址是否为您想下载的地址？',
        name: 'isGitCorrect',
        choices: ['Yes', 'No'],
      },
    ];

    const { isGitCorrect } = await inquirer.prompt(promptList);
    if (!!isGitCorrect && isGitCorrect === 'Yes') {
      return { gitAddress, gitBranch, flag: true };
    } else {
      return _questionPrompt();
    }
  }
}

/**
 * @func 去掉字符串前后空格
 * @param  v 字符串
 */
function trim(v) {
  if (!!v) return v.replace(/(^\s*)|(\s*$)/g, '');
}

/**
 * @func 递归删除文件夹
 * @param  path 文件夹路径
 * @param  cb 回调函数
 */
function deleteDir(path, cb) {
  var files = [];
  if (fse.existsSync(path)) {
    files = fse.readdirSync(path);
    files.forEach(function (file, index) {
      var curPath = path + '/' + file;
      if (fse.statSync(curPath).isDirectory()) {
        // recurse
        deleteDir(curPath, function () {});
      } else {
        // delete file
        fse.unlinkSync(curPath);
      }
    });
    fse.rmdirSync(path);
    cb();
  }
}

/**
 * @func 递归移动文件夹
 * @param  from 移动哪个文件夹路径
 * @param  to 移动到哪个文件夹去
 * @param  cb 移动完成后回调
 */
function copyFolder(from, to, cb) {
  // 复制文件夹到指定目录
  let files = [];
  if (fse.existsSync(to)) {
    // 文件是否存在 如果不存在则创建
    files = fse.readdirSync(from);
    files.forEach(function (file, index) {
      var targetPath = from + '/' + file;
      var toPath = to + '/' + file;
      if (fse.statSync(targetPath).isDirectory()) {
        // 复制文件夹
        copyFolder(targetPath, toPath, function () {});
      } else {
        // 拷贝文件
        fse.copyFileSync(targetPath, toPath);
      }
    });
    cb();
  } else {
    fse.mkdirSync(to);
    copyFolder(from, to, function () {});
  }
}

/**
 * @func 自动执行安装命令
 * @param  dir 安装位置
 */
function install(options){
  const cwd = options.cwd || process.cwd();
  return new Promise((resolve, reject) => {
    const command = options.isYarn ? "yarn" : "npm";
    const args = ["install", "--save", "--save-exact", "--loglevel", "error"];
    const child = spawn(command, args, { cwd, stdio: ["pipe", process.stdout, process.stderr] });

    child.once("close", code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(" ")}`
        });
        return;
      }
      resolve();
    });
    child.once("error", reject);
  });
}


module.exports = (...args) => {
  return create();
};
