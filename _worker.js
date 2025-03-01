// 定义外部变量
let sitename = "域名监控"; //变量名SITENAME，自定义站点名称，默认为"域名监控"
let domains = ""; //KV空间创建SECRET_KV后，新增一组kv对，填入域名信息json格式，必须设置的变量
let tgid = ""; //变量名TGID，填入TG机器人ID，不需要提醒则不填
let tgtoken = ""; //变量名TGTOKEN，填入TG的TOKEN，不需要提醒则不填
let days = 7; //变量名DAYS，提前几天发送TG提醒，默认为7天，必须为大于0的整数

async function sendtgMessage(message, tgid, tgtoken) {
  if (!tgid || !tgtoken) return;
  const url = `https://api.telegram.org/bot${tgtoken}/sendMessage`;
  const params = {
    chat_id: tgid,
    text: message,
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error('Telegram 消息推送失败:', error);
  }
}

// 保存域名信息
async function saveDomainToKV(env, domainInfo) {
  const domainsKV = env.SECRET_KV;
  const domains = await domainsKV.get('domains') || '[]';
  const domainsArray = JSON.parse(domains);

  domainsArray.push(domainInfo);
  await domainsKV.put('domains', JSON.stringify(domainsArray));
}

// 删除域名信息
async function deleteDomainFromKV(env, domainName) {
  const domainsKV = env.SECRET_KV;
  const domains = await domainsKV.get('domains') || '[]';
  const domainsArray = JSON.parse(domains);

  const updatedDomainsArray = domainsArray.filter(domain => domain.domain !== domainName);
  await domainsKV.put('domains', JSON.stringify(updatedDomainsArray));
}

// 生成密码验证页面
async function generatePasswordPage() {
  const siteIcon = 'https://pan.811520.xyz/icon/domain.png';
  const bgimgURL = 'https://bing.img.run/1920x1080.php';
  
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>域名监控系统</title>
      <link rel="icon" href="${siteIcon}" type="image/png">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-image: url('${bgimgURL}');
          color: #333;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .password-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          flex-direction: column;
        }
        .password-input {
          background-color: rgba(255, 255, 255, 0.7);
          border: none;
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          margin-bottom: 10px;
        }
        .login-title {
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin-bottom: 20px;
        }
        .login-button {
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 10px 20px;
          cursor: pointer;
          margin-top: 10px;
          font-weight: bold;
        }
        .login-button:hover {
          background-color: #2980b9;
        }
      </style>
    </head>
    <body>
      <div class="password-container">
        <h2 class="login-title">域名监控系统</h2>
        <input type="password" id="password-input" class="password-input" placeholder="请输入密码">
        <button id="login-button" class="login-button">登录</button>
      </div>
      <script>
        document.getElementById('login-button').addEventListener('click', verifyPassword);
        document.getElementById('password-input').addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            verifyPassword();
          }
        });
        
        async function verifyPassword() {
          const password = document.getElementById('password-input').value;
          
          try {
            const response = await fetch('/verify-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
            });
            
            const result = await response.json();
            
            if (result.success) {
              // 密码正确，使用服务器返回的令牌重定向到域名列表页面
              window.location.href = '/domains?token=' + encodeURIComponent(result.token);
            } else {
              alert('密码错误');
            }
          } catch (error) {
            alert('验证失败，请重试');
            console.error('验证失败:', error);
          }
        }
      </script>
    </body>
    </html>
  `;
}

// 生成域名列表页面
async function generateDomainListPage(domains, SITENAME) {
  const siteIcon = 'https://pan.811520.xyz/icon/domain.png';
  const bgimgURL = 'https://bing.img.run/1920x1080.php';
  const rows = await Promise.all(domains.map(async info => {
    const registrationDate = new Date(info.registrationDate);
    const expirationDate = new Date(info.expirationDate);
    const today = new Date();
    const totalDays = (expirationDate - registrationDate) / (1000 * 60 * 60 * 24);
    const daysElapsed = (today - registrationDate) / (1000 * 60 * 60 * 24);
    const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    const daysRemaining = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
    const isExpired = today > expirationDate;
    const statusColor = isExpired ? '#e74c3c' : '#2ecc71';
    const statusText = isExpired ? '已过期' : '正常';

    return `
      <tr>
        <td><span class="status-dot" style="background-color: ${statusColor};" title="${statusText}"></span></td>
        <td>${info.domain}</td>
        <td><a href="${info.systemURL}" target="_blank">${info.system}</a></td>
        <td>${info.registrationDate}</td>
        <td>${info.expirationDate}</td>
        <td>${isExpired ? '已过期' : daysRemaining + ' 天'}</td>
        <td>
          <div class="progress-bar">
            <div class="progress" style="width: ${progressPercentage}%;"></div>
          </div>
        </td>
        <td>
          <button onclick="deleteDomain('${info.domain}')">删除</button>
        </td>
      </tr>
    `;
  }));

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${SITENAME}</title>
      <link rel="icon" href="${siteIcon}" type="image/png">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-image: url('${bgimgURL}');
          color: #333;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .container {
          flex: 1;
          width: 95%;
          max-width: 1200px;
          margin: 20px auto;
          background-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          border-radius: 5px;
          overflow: hidden;
        }
        h1 {
          background-color: #3498db;
          color: #fff;
          padding: 20px;
          margin: 0;
        }
        .table-container {
          width: 100%;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
          table-layout: auto;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
          white-space: nowrap;
        }
        th {
          background-color: rgba(242, 242, 242, 0.7);
          font-weight: bold;
        }
        .status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #2ecc71;
        }
        .progress-bar {
          width: 100%;
          min-width: 100px;
          background-color: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress {
          height: 20px;
          background-color: #3498db;
        }
        .footer {
          text-align: center;
          padding: 0;
          background-color: #3498db;
          font-size: 0.9rem;
          color: #fff;
          margin-top: auto;
        }
        .footer a {
          color: white;
          text-decoration: none;
          margin-left: 10px;
          transition: color 0.3s ease;
        }
        .footer a:hover {
          color: #f1c40f;
        }
        #add-domain-form {
          padding: 15px;
          background-color: rgba(255, 255, 255, 0.5);
          margin-bottom: 15px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        #add-domain-form input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          flex: 1;
        }
        #add-domain-form button {
          padding: 8px 15px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #add-domain-form button:hover {
          background-color: #2980b9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${SITENAME}</h1>
        <form id="add-domain-form">
          <input type="text" id="domain" placeholder="域名" required>
          <input type="date" id="registrationDate" placeholder="注册日期" required>
          <input type="date" id="expirationDate" placeholder="过期日期" required>
          <input type="text" id="system" placeholder="注册商" required>
          <input type="url" id="systemURL" placeholder="注册商 URL" required>
          <button type="submit">添加域名</button>
        </form>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>状态</th>
                <th>域名</th>
                <th>域名注册商</th>
                <th>注册时间</th>
                <th>过期时间</th>
                <th>剩余天数</th>
                <th>使用进度</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="footer">
        <p>
          Copyright © 2025 Yutian81&nbsp;&nbsp;&nbsp;|
          <a href="https://github.com/yutian81/domain-check" target="_blank">GitHub Repository</a>&nbsp;&nbsp;&nbsp;|
          <a href="https://blog.811520.xyz/" target="_blank">青云志博客</a>
        </p>
      </div>
      <script>
        // 处理表单提交
        const form = document.getElementById('add-domain-form');
        form.addEventListener('submit', async function(event) {
          event.preventDefault();
          const domainInfo = {
            domain: document.getElementById('domain').value,
            registrationDate: document.getElementById('registrationDate').value,
            expirationDate: document.getElementById('expirationDate').value,
            system: document.getElementById('system').value,
            systemURL: document.getElementById('systemURL').value
          };
          await fetch('/add-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(domainInfo)
          });
          alert('域名信息已保存');
          // 刷新页面以显示新添加的域名
          window.location.reload();
        });

        // 删除域名
        async function deleteDomain(domain) {
          if (confirm('确认删除该域名信息?')) {
            await fetch('/delete-domain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain })
            });
            alert('域名信息已删除');
            // 刷新页面以更新域名列表
            window.location.reload();
          }
        }
      </script>
    </body>
    </html>
  `;
}

// 修改 fetch 函数来使用新的页面生成函数
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 处理密码验证请求
    if (request.method === 'POST' && url.pathname === '/verify-password') {
      try {
        const { password } = await request.json();
        const storedPassword = await env.SECRET_KV.get('password');
        
        if (password === storedPassword) {
          // 生成一个简单的会话令牌（在生产环境中应使用更安全的方法）
          const token = btoa(Date.now() + ':' + Math.random());
          
          // 存储令牌（有效期10分钟）
          await env.SECRET_KV.put('auth_token:' + token, 'valid', { expirationTtl: 600 });
          
          return new Response(JSON.stringify({ 
            success: true, 
            token: token 
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            message: '密码错误' 
          }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: '验证失败' 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 处理其他 POST 请求
    if (request.method === 'POST') {
      const requestBody = await request.json();
      if (url.pathname.endsWith('/add-domain')) {
        await saveDomainToKV(env, requestBody);
        return new Response('域名信息已保存', { status: 200 });
      } else if (url.pathname.endsWith('/delete-domain')) {
        await deleteDomainFromKV(env, requestBody.domain);
        return new Response('域名信息已删除', { status: 200 });
      }
    }

    // 提取并设置环境变量
    sitename = env.SITENAME || sitename;
    tgid = env.TGID || tgid;
    tgtoken = env.TGTOKEN || tgtoken;
    days = Number(env.DAYS || days);

    // 检查 SECRET_KV 是否定义
    if (!env.SECRET_KV || typeof env.SECRET_KV.get !== 'function') {
      return new Response("SECRET_KV 命名空间未定义或绑定", { status: 500 });
    }
    
    // 检查是否是域名列表页面请求
    if (url.pathname === '/domains') {
      // 验证令牌参数
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response("未授权访问", { status: 401 });
      }
      
      // 验证令牌是否有效
      const isValidToken = await env.SECRET_KV.get('auth_token:' + token);
      if (!isValidToken) {
        return new Response("会话已过期或无效，请重新登录", { status: 401 });
      }
      
      // 从Cloudflare KV中获取最新的 domains 数据
      try {
        const domainsKV = await env.SECRET_KV.get('domains');
        domains = domainsKV ? JSON.parse(domainsKV) : [];
        if (!Array.isArray(domains)) throw new Error('JSON 数据格式不正确');
      } catch (error) {
        return new Response("从Cloudflare KV中获取的 JSON 数据格式不正确", { status: 500 });
      }
      
      // 返回域名列表页面
      const htmlContent = await generateDomainListPage(domains, sitename);
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      // 返回密码验证页面
      const htmlContent = await generatePasswordPage();
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  }
};
