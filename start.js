// baipiaoTiny
const fs = require('fs');
const Path = require("path");
const Https = require("https");

// 文件夹存在判断
const hasImgDirectory = fs.existsSync('./img')
const hasAimDirectory = fs.existsSync('./aim')

!hasAimDirectory && fs.mkdirSync('./aim');

if (!hasImgDirectory) {
  fs.mkdirSync('./img')
  console.log('img文件夹下没有文件')
  return
}

const rootDirector = './img/'
const fileNameArr = []
// 同步读取这个文件夹下所有的文件信息
const files = fs.readdirSync(rootDirector)

// 保存文件的名字
files.forEach(ele => {
  // 获取文件信息
  let stat = fs.lstatSync(rootDirector + ele)
  if (stat.isFile()) {
    fileNameArr.push(ele)
  }
})

// 使用这两个网站的压缩功能
const TINYIMG_URL = [
    "tinyjpg.com",
    "tinypng.com"
];

// 生成随机请求信息
function RandomHeader() {
    const fakeIp = new Array(4).fill(0).map(() => parseInt(Math.random() * 255)).join(".");
    const index = Math.floor(Math.random() * 2)
    return {
      headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
          // 模拟ip，不然会被服务器标识，不能一次性压缩多个文件
          "X-Forwarded-For": fakeIp
      },
      hostname: TINYIMG_URL[index],
      method: "POST",
      path: "/web/shrink"
    };
}

function UploadImg(file) {
  const opts = RandomHeader();
  return new Promise((resolve, reject) => {
    const req = Https.request(opts, res => res.on("data", data => {
    
      // 得到的返回值是buffer类型
      // 用toString变成人看的形式, 发现是一个对象
      // 用parse转换一下来使用,里面正好有压缩好的图片地址
      // console.log(obj)
      // {
      //   input: { size: 4860, type: 'image/png' },
      //   output: {
      //     size: 4860,
      //     type: 'image/png',
      //     width: 520,
      //     height: 428,
      //     ratio: 1,
      //     url: 'https://tinypng.com/web/output/5yfjp5hg1wjw5wqx8axcqx0ujfe0vw97'
      //   }
      // }
      // 测试失败的情况下返回的数据,上传一个.gif文件
      // 得到的是
      // {
      //   error: 'Unsupported media type',      
      //   message: 'File type is not supported.'
      // }
      
      const obj = JSON.parse(data.toString());
      obj.error ? reject(obj.message) : resolve(obj);
    }));
    req.write(file, "binary");
    req.on("error", e => reject(e));
    req.end();
  });
}

function DownloadImg(url) {
  return new Promise((resolve, reject) => {
    // 参考文档 http://nodejs.cn/api/https.html#httpsrequestoptions-callback
    const req = Https.request(url, res => {
      let file = "";
      // 关于setEncoding: http://nodejs.cn/api/stream/readable_setencoding_encoding.html
      res.setEncoding("binary");
      res.on("data", data => file += data);
      res.on("end", () => resolve(file));
    });
    req.on("error", e => reject(e));
    req.end();
  });
}

async function CompressImg(path) {
  try {
    // 文件类型限制
    if (!/\.png|\.jpg$/.test(path)) {
      console.log(path,"--是非png,jpg文件跳过压缩")
      return
    }
    const file = fs.readFileSync(path, "binary");
    const obj = await UploadImg(file);
    const data = await DownloadImg(obj.output.url);
    const dpath = Path.join("./aim/", Path.basename(path));
    fs.writeFileSync(dpath, data, "binary");
  } catch (err) {
    console.log('错误发生', err, '当前文件--', path)
  }
}

fileNameArr.forEach(ele => {
  // 延迟操作
  setTimeout(() => {
    CompressImg(rootDirector + ele)
  }, 50)
})