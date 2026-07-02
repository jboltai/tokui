/**
 * TokUI 构建器测试套件
 * 测试 TokUIBuilder 的各种输出场景，
 * 包括基础输出、展示组件、表格组件、表单组件、布局组件和流式输出。
 */
'use strict';

const assert = require('assert');
const { TokUIBuilder } = require('../src/server/tokui-builder');

/** 测试用例存储 */
const tests = [];
let passed = 0;
let failed = 0;

/**
 * 注册测试用例
 * @param {string} name - 测试名称
 * @param {Function} fn - 测试函数
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/** 运行所有测试用例并输出结果 */
function run() {
  passed = 0;
  failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

// ===== 基础输出测试 =====

// 测试：空构建器输出空字符串
test('empty builder produces empty string', () => {
  const b = new TokUIBuilder();
  assert.strictEqual(b.toString(), '');
});

// 测试：带内容的自闭合标签
test('self-closing with content: h1', () => {
  const b = new TokUIBuilder();
  b.h1('Hello World');
  assert.strictEqual(b.toString(), '[h1 Hello World]');
});

// 测试：仅属性的自闭合标签
test('self-closing with attrs: a', () => {
  const b = new TokUIBuilder();
  b.a({ tx: '百度', u: 'http://www.baidu.com' });
  assert.strictEqual(b.toString(), '[a tx:百度 u:http://www.baidu.com]');
});

// 测试：引号包裹的属性值（含空格）
test('self-closing with quoted value', () => {
  const b = new TokUIBuilder();
  b.input({ t: 'text', l: '用户名', ph: '请 输入用户名' });
  assert.strictEqual(b.toString(), '[input t:text l:用户名 ph:"请 输入用户名"]');
});

// 测试：布尔属性
test('boolean attribute', () => {
  const b = new TokUIBuilder();
  b.input({ t: 'text', id: 'username', req: true });
  assert.strictEqual(b.toString(), '[input t:text id:username req]');
});

// 测试：容器的开闭标签
test('container open + close', () => {
  const b = new TokUIBuilder();
  b.card({ tt: '信息' }).end();
  assert.strictEqual(b.toString(), '[card tt:信息][/card]');
});

// 测试：嵌套容器带子元素
test('nested container with children', () => {
  const b = new TokUIBuilder();
  b.card({ tt: '欢迎' }).h2('Hello TokUI!').p('流式UI渲染框架').end();
  assert.strictEqual(b.toString(), '[card tt:欢迎][h2 Hello TokUI!][p 流式UI渲染框架][/card]');
});

// 测试：toChunks 返回逐组件数组
test('toChunks returns per-component array', () => {
  const b = new TokUIBuilder();
  b.h1('Title').p('Body');
  const chunks = b.toChunks();
  assert.deepStrictEqual(chunks, ['[h1 Title]', '[p Body]']);
});

// 测试：reset 清空构建器状态
test('reset clears builder state', () => {
  const b = new TokUIBuilder();
  b.h1('Title');
  b.reset();
  assert.strictEqual(b.toString(), '');
});

// 测试：false 和 undefined 属性被忽略
test('false and undefined attrs are omitted', () => {
  const b = new TokUIBuilder();
  b.input({ t: 'text', id: 'x', dis: false, missing: undefined });
  assert.strictEqual(b.toString(), '[input t:text id:x]');
});

// ===== 展示组件测试 =====

// 测试：分割线
test('hr', () => {
  const b = new TokUIBuilder();
  b.hr();
  assert.strictEqual(b.toString(), '[hr]');
});

test('dv basic', () => {
  const b = new TokUIBuilder();
  b.dv();
  assert.strictEqual(b.toString(), '[dv]');
});

test('dv with variant', () => {
  const b = new TokUIBuilder();
  b.dv({ v: 'dashed' });
  assert.strictEqual(b.toString(), '[dv v:dashed]');
});

// upd 的 false 值必须序列化为 'false' 字符串（toggle-off 语义），
// 不能像初始渲染那样跳过 —— 否则 [upd id:x dis:false] 发不出 dis:false，禁用态清不掉。
test('upd serializes false as "false" string (toggle-off)', () => {
  const b = new TokUIBuilder();
  b.upd({ id: 'inp', dis: false, ro: false, ph: '可输入了' });
  assert.strictEqual(b.toString(), '[upd id:inp dis:false ro:false ph:可输入了]');
});

test('upd serializes true as bare boolean key', () => {
  const b = new TokUIBuilder();
  b.upd({ id: 'sw', chk: true });
  assert.strictEqual(b.toString(), '[upd id:sw chk]');
});

test('dv with text and align', () => {
  const b = new TokUIBuilder();
  b.dv({ tx: '标题', align: 'left' });
  assert.strictEqual(b.toString(), '[dv tx:标题 align:left]');
});

// 测试：图片
test('img', () => {
  const b = new TokUIBuilder();
  b.img({ s: 'a.png', alt: '图片', w: '200', tt: '提示' });
  assert.strictEqual(b.toString(), '[img s:a.png alt:图片 w:200 tt:提示]');
});

// 测试：Markdown（容器模式，保留换行）
test('md', () => {
  const b = new TokUIBuilder();
  b.md('# Hello\n- item');
  assert.strictEqual(b.toString(), '[md]# Hello\n- item[/md]');
});

// 测试：代码块
test('code', () => {
  const b = new TokUIBuilder();
  b.code({ lang: 'js' }, 'console.log("hi")');
  assert.strictEqual(b.toString(), '[code lang:js]console.log("hi")[/code]');
});

// ===== 表格组件测试 =====

// 测试：带布尔属性的表格
test('table with stripe boolean', () => {
  const b = new TokUIBuilder();
  b.table({ stripe: true, id: 't1' }).end();
  assert.strictEqual(b.toString(), '[table stripe id:t1][/table]');
});

// 测试：完整表格（表头 + 表体）
test('table with thead and tbody', () => {
  const b = new TokUIBuilder();
  b.table({ stripe: true })
    .thead()
      .tcol({ n: '姓名' })
      .tcol({ n: '年龄', t: 'number' })
    .end()
    .tbody()
      .row('张三', '28')
      .row('李四', '32')
    .end()
  .end();
  assert.strictEqual(b.toString(), '[table stripe][thead][tcol n:姓名][tcol n:年龄 t:number][/thead][tbody][tr 张三,28][tr 李四,32][/tbody][/table]');
});

// 测试：表头 cols 简写
test('table with theadCols shorthand', () => {
  const b = new TokUIBuilder();
  b.table({ stripe: true })
    .theadCols('姓名,年龄:number,部门')
    .tbody()
      .row('张三', '28', '技术部')
      .row('李四', '32', '市场部')
    .end()
  .end();
  assert.strictEqual(b.toString(), '[table stripe][thead cols:姓名,年龄:number,部门][tbody][tr 张三,28,技术部][tr 李四,32,市场部][/tbody][/table]');
});

// ===== 表单组件测试 =====

// 测试：带输入框和按钮的表单
test('form with inputs and button', () => {
  const b = new TokUIBuilder();
  b.form({ id: 'login', act: '/api/login', mtd: 'post', sub: 'handleLogin' })
    .input({ t: 'text', l: '用户名', ph: '请输入用户名', id: 'username', req: true })
    .pwd({ l: '密码', ph: '请输入密码', id: 'password', req: true })
    .btn({ tx: '登录', t: 'submit', clk: 'handleLogin' })
  .end();
  assert.strictEqual(b.toString(),
    '[form id:login act:/api/login mtd:post sub:handleLogin][input t:text l:用户名 ph:请输入用户名 id:username req][pwd l:密码 ph:请输入密码 id:password req][btn tx:登录 t:submit clk:handleLogin][/form]'
  );
});

// 测试：下拉选择框
test('select with opt', () => {
  const b = new TokUIBuilder();
  b.select({ l: '角色', id: 'role' })
    .opt({ v: 'admin', tx: '管理员' })
    .opt({ v: 'user', tx: '普通用户' })
  .end();
  assert.strictEqual(b.toString(), '[select l:角色 id:role][opt v:admin tx:管理员][opt v:user tx:普通用户][/select]');
});

// 测试：多选下拉框
test('select with multi attribute', () => {
  const b = new TokUIBuilder();
  b.select({ l: '技能', id: 'skills', multi: true })
    .opt({ v: 'js', tx: 'JavaScript' })
    .opt({ v: 'py', tx: 'Python' })
  .end();
  assert.strictEqual(b.toString(), '[select l:技能 id:skills multi][opt v:js tx:JavaScript][opt v:py tx:Python][/select]');
});

// 测试：自定义选择器单选
test('picker with opt', () => {
  const b = new TokUIBuilder();
  b.picker({ l: '角色', id: 'role', ph: '请选择' })
    .opt({ v: 'admin', tx: '管理员' })
    .opt({ v: 'user', tx: '普通用户' })
  .end();
  assert.strictEqual(b.toString(), '[picker l:角色 id:role ph:请选择][opt v:admin tx:管理员][opt v:user tx:普通用户][/picker]');
});

// 测试：自定义选择器多选
test('picker multi', () => {
  const b = new TokUIBuilder();
  b.picker({ l: '技能', id: 'skills', multi: true })
    .opt({ v: 'js', tx: 'JavaScript' })
    .opt({ v: 'py', tx: 'Python' })
  .end();
  assert.strictEqual(b.toString(), '[picker l:技能 id:skills multi][opt v:js tx:JavaScript][opt v:py tx:Python][/picker]');
});

// 测试：row 自动引号转义（值含逗号时自动加双引号）
test('row auto-quotes values with commas', () => {
  const b = new TokUIBuilder();
  b.table({})
    .theadCols('名称,单价,金额')
    .tbody()
      .row('钢板', '¥4,200/吨', '¥2,100,000')
    .end()
  .end();
  assert.strictEqual(b.toString(), '[table][thead cols:名称,单价,金额][tbody][tr 钢板,"¥4,200/吨","¥2,100,000"][/tbody][/table]');
});

// 测试：单选按钮组
test('radio with opt', () => {
  const b = new TokUIBuilder();
  b.radio({ l: '性别', n: 'gender', id: 'genderGroup' })
    .opt({ v: 'male', tx: '男', chk: true })
    .opt({ v: 'female', tx: '女' })
  .end();
  assert.strictEqual(b.toString(), '[radio l:性别 n:gender id:genderGroup][opt v:male tx:男 chk][opt v:female tx:女][/radio]');
});

// 测试：复选框
test('checkbox', () => {
  const b = new TokUIBuilder();
  b.checkbox({ l: '记住我', id: 'remember' });
  assert.strictEqual(b.toString(), '[checkbox l:记住我 id:remember]');
});

// ===== 布局组件测试 =====

// 测试：栅格布局
test('row/col layout', () => {
  const b = new TokUIBuilder();
  b.row_layout()
    .col_layout({ span: 6 }).p('左').end()
    .col_layout({ span: 6 }).p('右').end()
  .end();
  assert.strictEqual(b.toString(), '[row][col span:6][p 左][/col][col span:6][p 右][/col][/row]');
});

// 测试：列表
test('list', () => {
  const b = new TokUIBuilder();
  b.list({ t: 'ul' })
    .item('第一项')
    .item('第二项')
    .item('第三项')
  .end();
  assert.strictEqual(b.toString(), '[list t:ul][item 第一项][item 第二项][item 第三项][/list]');
});

// ===== 流式输出测试 =====

// 测试：toChunks 用于流式传输
test('toChunks for streaming', () => {
  const b = new TokUIBuilder();
  b.card({ tt: '信息' }).h2('标题').p('内容').end();
  const chunks = b.toChunks();
  assert.deepStrictEqual(chunks, [
    '[card tt:信息]',
    '[h2 标题]',
    '[p 内容]',
    '[/card]'
  ]);
});

// 测试：imgs 容器（完整版）
test('imgs container with img children', () => {
  const b = new TokUIBuilder();
  b.imgs()
    .img({ s: 'url1', alt: 'A' })
    .img({ s: 'url2', alt: 'B' })
  .end();
  assert.strictEqual(b.toString(), '[imgs][img s:url1 alt:A][img s:url2 alt:B][/imgs]');
});

// 测试：imgs 简写版
test('imgs shorthand with s: attribute', () => {
  const b = new TokUIBuilder();
  b.imgs({ s: 'url1,url2,url3' }).end();
  assert.strictEqual(b.toString(), '[imgs s:url1,url2,url3][/imgs]');
});

// 测试：img 带变体
test('img with variant', () => {
  const b = new TokUIBuilder();
  b.img({ s: 'a.png', v: 'avatar' });
  assert.strictEqual(b.toString(), '[img s:a.png v:avatar]');
});

// 测试：btn 带多个变体
test('btn with multiple variants', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: 'Delete', v: 'danger,sm' });
  assert.strictEqual(b.toString(), '[btn tx:Delete v:danger,sm]');
});

// 测试：card 带变体
test('card with variant', () => {
  const b = new TokUIBuilder();
  b.card({ tt: 'Warning', v: 'highlight' }).end();
  assert.strictEqual(b.toString(), '[card tt:Warning v:highlight][/card]');
});

// 测试：card 带 ft 页脚
test('card with ft footer', () => {
  const b = new TokUIBuilder();
  b.card({ tt: '操作' })
    .p('这里是卡片内容')
    .ft()
      .btn({ tx: '确认', t: 'submit', clk: 'handleOk' })
      .btn({ tx: '取消', t: 'reset' })
    .end()
  .end();
  assert.strictEqual(b.toString(),
    '[card tt:操作][p 这里是卡片内容][ft][btn tx:确认 t:submit clk:handleOk][btn tx:取消 t:reset][/ft][/card]'
  );
});

// 测试：end() 空栈不输出畸形标签
test('end() on empty stack is no-op', () => {
  const b = new TokUIBuilder();
  b.h1('Hello');
  b.end(); // 栈为空，应无操作
  assert.strictEqual(b.toString(), '[h1 Hello]');
});

// 测试：toString() 不修改 builder 内部状态
test('toString() is non-destructive', () => {
  const b = new TokUIBuilder();
  b.card({ tt: 'Test' });
  const first = b.toString();
  const second = b.toString();
  assert.strictEqual(first, second);
});

// 测试：toChunks() 不修改 builder 内部状态
test('toChunks() is non-destructive', () => {
  const b = new TokUIBuilder();
  b.card({ tt: 'Test' }).p('Content');
  const first = b.toChunks();
  const second = b.toChunks();
  assert.deepStrictEqual(first, second);
});

// 测试：endAll() 关闭所有未关闭容器
test('endAll() closes all open containers', () => {
  const b = new TokUIBuilder();
  b.card({ tt: 'A' }).form({ id: 'f1' });
  b.endAll();
  assert.strictEqual(b.stack.length, 0);
});

// 测试：h4-h6 标题
test('h4 h5 h6 methods', () => {
  const b = new TokUIBuilder();
  b.h4('四级标题').h5('五级标题').h6('六级标题');
  assert.strictEqual(b.toString(), '[h4 四级标题][h5 五级标题][h6 六级标题]');
});

// 测试：pwd 密码输入框
test('pwd method', () => {
  const b = new TokUIBuilder();
  b.pwd({ l: '密码', ph: '请输入密码', id: 'pwd' });
  assert.strictEqual(b.toString(), '[pwd l:密码 ph:请输入密码 id:pwd]');
});

// 测试：input 支持 min/max/step 属性
test('input with min max step attrs', () => {
  const b = new TokUIBuilder();
  b.input({ t: 'number', l: '年龄', id: 'age', min: '18', max: '65', step: '1' });
  const result = b.toString();
  assert.ok(result.includes('min:18'));
  assert.ok(result.includes('max:65'));
  assert.ok(result.includes('step:1'));
});

// 测试：toString 和 toChunks 输出一致
test('toString and toChunks are consistent', () => {
  const b = new TokUIBuilder();
  b.card({ tt: 'Test' }).h1('Hello').p('World').end();
  assert.strictEqual(b.toString(), b.toChunks().join(''));
});

// 测试：值含双引号
test('value containing double quotes', () => {
  const b = new TokUIBuilder();
  const result = TokUIBuilder.serializeAttrs({ msg: 'say "hello"' });
  assert.ok(result.includes('msg:"say \\"hello\\""'), 'double quotes should be escaped in value');
});

// 测试：content 含 [ ] 自动用双引号包裹（parser 引号感知，括号作字面内容）
test('content with [ ] auto-quoted to keep brackets literal', () => {
  const b = new TokUIBuilder();
  b.p('hello]world');
  let output = b.toString();
  // content 含 ] 时应用双引号包裹：[p "hello]world"]
  assert.strictEqual(output, '[p "hello]world"]', '含 ] 自动引号包裹');

  const b2 = new TokUIBuilder();
  b2.item('Math.random() 生成 [0, 1) 浮点数');
  output = b2.toString();
  assert.strictEqual(output, '[item "Math.random() 生成 [0, 1) 浮点数"]', '含 [ 自动引号包裹');

  // 引号内的 [ ] 经 parser 解析仍为字面内容（不被误判嵌套子标签）
  const { TokUIParser } = require('../src/core/parser');
  const nodes = [];
  new TokUIParser(n => nodes.push(n)).parse(output);
  assert.strictEqual(nodes[0].type, 'item');
  assert.strictEqual(nodes[0].content, 'Math.random() 生成 [0, 1) 浮点数');
  assert.strictEqual(nodes[0].children.length, 0, '无误解析的子标签');
});

// 测试：空 row()
test('empty row()', () => {
  const b = new TokUIBuilder();
  b.row();
  assert.strictEqual(b.toString(), '[tr]');
});

// 测试：btn 带 w 属性
test('btn with width', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '宽按钮', w: '100%' });
  assert.strictEqual(b.toString(), '[btn tx:宽按钮 w:100%]');
});

// 测试：btn 带 bg 和 fc 属性
test('btn with bg and fc', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '彩色', bg: 'FF8C00', fc: 'FFFFFF' });
  assert.strictEqual(b.toString(), '[btn tx:彩色 bg:FF8C00 fc:FFFFFF]');
});

// 测试：btn 带 radius 属性
test('btn with radius', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '圆角', radius: '12px' });
  assert.strictEqual(b.toString(), '[btn tx:圆角 radius:12px]');
});

// 测试：btn 带 pill 变体
test('btn with pill variant', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '胶囊', v: 'pill' });
  assert.strictEqual(b.toString(), '[btn tx:胶囊 v:pill]');
});

// 测试：btngroup 容器
test('btngroup container', () => {
  const b = new TokUIBuilder();
  b.btngroup()
    .btn({ tx: 'A' })
    .btn({ tx: 'B' })
  .end();
  assert.strictEqual(b.toString(), '[btngroup][btn tx:A][btn tx:B][/btngroup]');
});

// 测试：btngroup 带 vertical 变体
test('btngroup with vertical variant', () => {
  const b = new TokUIBuilder();
  b.btngroup({ v: 'vertical' })
    .btn({ tx: '上' })
    .btn({ tx: '下' })
  .end();
  assert.strictEqual(b.toString(), '[btngroup v:vertical][btn tx:上][btn tx:下][/btngroup]');
});

// ===== Input Group 属性透传测试 =====

test('builder input with pre/app attrs', () => {
  const b = new TokUIBuilder();
  b.input({ l: '网址', pre: 'https://', app: '.com', ph: '域名' });
  assert.strictEqual(b.toString(), '[input l:网址 pre:https:// app:.com ph:域名]');
});

test('builder input with prebtn/appbtn attrs', () => {
  const b = new TokUIBuilder();
  b.input({ l: '搜索', appbtn: '搜索:handleSearch|primary', ph: '关键词' });
  assert.strictEqual(b.toString(), '[input l:搜索 appbtn:搜索:handleSearch|primary ph:关键词]');
});

test('builder input with v:inline', () => {
  const b = new TokUIBuilder();
  b.input({ l: '用户名', v: 'inline', ph: '请输入' });
  assert.strictEqual(b.toString(), '[input l:用户名 v:inline ph:请输入]');
});

test('builder pwd with pre attr', () => {
  const b = new TokUIBuilder();
  b.pwd({ l: '密码', pre: '🔒' });
  assert.strictEqual(b.toString(), '[pwd l:密码 pre:🔒]');
});

test('builder input with pre variant', () => {
  const b = new TokUIBuilder();
  b.input({ l: '价格', pre: '$|dark', app: '.00', t: 'number' });
  assert.strictEqual(b.toString(), '[input l:价格 pre:$|dark app:.00 t:number]');
});

// ===== ol/ul/i 构建器测试 =====

// 测试：ul + i 自闭合
test('ul with self-closing i', () => {
  const b = new TokUIBuilder();
  b.ul()
    .i('第一项')
    .i('第二项')
    .i('第三项')
  .end();
  assert.strictEqual(b.toString(), '[ul][i 第一项][i 第二项][i 第三项][/ul]');
});

// 测试：ol + i 自闭合
test('ol with self-closing i', () => {
  const b = new TokUIBuilder();
  b.ol()
    .i('步骤1')
    .i('步骤2')
  .end();
  assert.strictEqual(b.toString(), '[ol][i 步骤1][i 步骤2][/ol]');
});

// 测试：i 容器模式 — 无内容时 _open
test('i container mode', () => {
  const b = new TokUIBuilder();
  b.ul()
    .i()
      .p('嵌套内容')
    .end()
  .end();
  assert.strictEqual(b.toString(), '[ul][i][p 嵌套内容][/i][/ul]');
});

// 测试：i 自闭合与容器混合
test('i mixed self-closing and container', () => {
  const b = new TokUIBuilder();
  b.ul()
    .i('纯文本')
    .i()
      .card({ tt: '卡片' }).p('内容').end()
    .end()
  .end();
  assert.strictEqual(b.toString(), '[ul][i 纯文本][i][card tt:卡片][p 内容][/card][/i][/ul]');
});

// ===== 新增组件 Builder 测试 =====

// 测试：empty 空状态
test('empty self-closing', () => {
  const b = new TokUIBuilder();
  b.empty({ tx: '暂无数据', icon: 'search' });
  assert.strictEqual(b.toString(), '[empty tx:暂无数据 icon:search]');
});

// 测试：empty 带图片
test('empty with image', () => {
  const b = new TokUIBuilder();
  b.empty({ s: 'empty.png', tx: '没有内容' });
  assert.strictEqual(b.toString(), '[empty s:empty.png tx:没有内容]');
});

// 测试：result 结果页
test('result success', () => {
  const b = new TokUIBuilder();
  b.result({ t: 'success', tt: '操作成功', tx: '您的数据已保存' });
  assert.strictEqual(b.toString(), '[result t:success tt:操作成功 tx:您的数据已保存]');
});

// 测试：result error
test('result error', () => {
  const b = new TokUIBuilder();
  b.result({ t: 'error', tt: '操作失败' });
  assert.strictEqual(b.toString(), '[result t:error tt:操作失败]');
});

// 测试：stat 统计数值
test('stat basic', () => {
  const b = new TokUIBuilder();
  b.stat({ tt: '总销售额', v: '128,960', pre: '¥' });
  assert.strictEqual(b.toString(), '[stat tt:总销售额 v:128,960 pre:¥]');
});

// 测试：stat 带趋势
test('stat with trend', () => {
  const b = new TokUIBuilder();
  b.stat({ tt: '增长率', v: '12.5', suf: '%', trend: 'up' });
  assert.strictEqual(b.toString(), '[stat tt:增长率 v:12.5 suf:% trend:up]');
});

// 测试：desc 描述列表容器
test('desc container with descItem', () => {
  const b = new TokUIBuilder();
  b.desc({ cols: 2 })
    .descItem({ l: '用户名', tx: '张三' })
    .descItem({ l: '年龄', tx: '28' })
  .end();
  assert.strictEqual(b.toString(), '[desc cols:2][desc-item l:用户名 tx:张三][desc-item l:年龄 tx:28][/desc]');
});

// 测试：desc 带 stripe 和 bordered
test('desc with stripe and bordered', () => {
  const b = new TokUIBuilder();
  b.desc({ stripe: true, bordered: true })
    .descItem({ l: '名称', tx: '值' })
  .end();
  assert.strictEqual(b.toString(), '[desc stripe bordered][desc-item l:名称 tx:值][/desc]');
});

// 测试：numinput 数字输入框
test('numinput basic', () => {
  const b = new TokUIBuilder();
  b.numinput({ l: '数量', v: '5', min: '0', max: '99', step: '1', n: 'qty' });
  assert.strictEqual(b.toString(), '[numinput l:数量 v:5 min:0 max:99 step:1 n:qty]');
});

// 测试：numinput 带禁用
test('numinput disabled', () => {
  const b = new TokUIBuilder();
  b.numinput({ v: '10', dis: true });
  assert.strictEqual(b.toString(), '[numinput v:10 dis]');
});

// 测试：carousel 容器 + carousel-item
test('carousel container with items', () => {
  const b = new TokUIBuilder();
  b.carousel({ id: 'c1', auto: '3000' })
    .carouselItem({ s: 'url1', tt: '标题1', tx: '描述1' })
    .carouselItem({ s: 'url2', tt: '标题2' })
  .end();
  assert.strictEqual(b.toString(), '[carousel id:c1 auto:3000][carousel-item s:url1 tt:标题1 tx:描述1][carousel-item s:url2 tt:标题2][/carousel]');
});

// ===== Conversations 对话列表 Builder 测试 =====

// 测试：conversations 容器 + conv 子项
test('conversations with conv children', () => {
  const b = new TokUIBuilder();
  b.conversations({ clk: 'onSelect' })
    .conv({ tt: '会话1', time: '10:30' })
    .conv({ tt: '会话2', time: '09:15', active: true })
  .end();
  const dsl = b.toString();
  assert.ok(dsl.indexOf('[conversations') !== -1);
  assert.ok(dsl.indexOf('clk:onSelect') !== -1);
  assert.ok(dsl.indexOf('[conv') !== -1);
  assert.ok(dsl.indexOf('tt:会话1') !== -1);
  assert.ok(dsl.indexOf('active') !== -1);
  assert.ok(dsl.indexOf('[/conversations]') !== -1);
});

// 测试：conversations toChunks 输出
test('conversations toChunks outputs array', () => {
  const b = new TokUIBuilder();
  b.conversations({})
    .conv({ tt: 'A' })
    .conv({ tt: 'B' })
  .end();
  const chunks = b.toChunks();
  assert.ok(Array.isArray(chunks));
  assert.strictEqual(chunks.length, 4); // open + 2 conv + close
  assert.strictEqual(chunks[0], '[conversations]');
  assert.strictEqual(chunks[1], '[conv tt:A]');
  assert.strictEqual(chunks[2], '[conv tt:B]');
  assert.strictEqual(chunks[3], '[/conversations]');
});

// 测试：conv 带 active 布尔属性
test('conv with active boolean', () => {
  const b = new TokUIBuilder();
  b.conversations({})
    .conv({ tt: 'ActiveConv', time: '14:00', active: true })
  .end();
  const dsl = b.toString();
  assert.ok(dsl.indexOf('active') !== -1);
  assert.ok(dsl.indexOf('tt:ActiveConv') !== -1);
});

test('input with val attr', () => {
  const b = new TokUIBuilder();
  b.input({ val: 'initial' });
  assert.strictEqual(b.toString(), '[input val:initial]');
});

test('input with hint attr', () => {
  const b = new TokUIBuilder();
  b.input({ hint: 'help text' });
  assert.strictEqual(b.toString(), '[input hint:"help text"]');
});

test('input with w attr', () => {
  const b = new TokUIBuilder();
  b.input({ w: '200px' });
  assert.strictEqual(b.toString(), '[input w:200px]');
});

test('pwd with toggle', () => {
  const b = new TokUIBuilder();
  b.pwd({ toggle: true });
  assert.strictEqual(b.toString(), '[pwd toggle]');
});

test('pwd with val and hint', () => {
  const b = new TokUIBuilder();
  b.pwd({ val: 'pass123', hint: '至少6位' });
  assert.strictEqual(b.toString(), '[pwd val:pass123 hint:至少6位]');
});

test('input with search boolean', () => {
  const b = new TokUIBuilder();
  b.input({ search: true, ph: '搜索...' });
  assert.strictEqual(b.toString(), '[input search ph:搜索...]');
});

test('input with search:right', () => {
  const b = new TokUIBuilder();
  b.input({ search: 'right', ph: '搜索...' });
  assert.strictEqual(b.toString(), '[input search:right ph:搜索...]');
});

test('input with v:pill', () => {
  const b = new TokUIBuilder();
  b.input({ v: 'pill', ph: '搜索...' });
  assert.strictEqual(b.toString(), '[input v:pill ph:搜索...]');
});

// chart 自闭合判定：凡带内联数据载体（d/tasks/rows/nodes+flows/v）均自闭合，
// 不应走容器分支产出 [/chart] —— 否则后续栅格 .end() 错位闭合致布局乱套
test('chart heatmap(rows) self-closing', () => {
  const b = new TokUIBuilder();
  b.chart({ t: 'heatmap', rows: '1,2|3,4', h: 200 });
  assert.strictEqual(b.toString(), '[chart t:heatmap rows:1,2|3,4 h:200]');
});

test('chart sankey(nodes+flows) self-closing', () => {
  const b = new TokUIBuilder();
  b.chart({ t: 'sankey', nodes: 'A,B,C', flows: 'A->B:10', h: 200 });
  assert.strictEqual(b.toString(), '[chart t:sankey nodes:A,B,C flows:A->B:10 h:200]');
});

test('chart progress(v) self-closing', () => {
  const b = new TokUIBuilder();
  b.chart({ t: 'progress', v: 68, h: 80 });
  assert.strictEqual(b.toString(), '[chart t:progress v:68 h:80]');
});

test('chart row_layout 2-col 不串味', () => {
  // 回归：heatmap/sankey/progress 走容器分支时 [/chart] 会让 .end() 错位，
  // 致 row 内只剩 1 col、第二 col 孤儿到顶层
  const b = new TokUIBuilder();
  b.row_layout()
    .col_layout({ span: 6 }).card({}).chart({ t: 'heatmap', rows: '1,2|3,4', h: 200 }).end().end()
    .col_layout({ span: 6 }).card({}).chart({ t: 'progress', v: 68, h: 80 }).end().end()
    .end();
  const dsl = b.toString();
  assert.ok(dsl.indexOf('[/chart]') === -1, '不应有 stray [/chart]');
  const colCount = (dsl.match(/\[col span:6\]/g) || []).length;
  assert.strictEqual(colCount, 2, 'row 内应恰好 2 个 col span:6');
});

// === chart 布局属性前置（消除流式预览末尾翻转）===

test('chart 布局属性排在 d 前：orient/stack 先于 d 输出', () => {
  const b = new TokUIBuilder();
  // 故意把 orient/stack 放后面，builder 应重排到 d 前
  b.chart({ d: '1,2,3', l: 'a,b,c', orient: 'h', stack: true, t: 'bar' });
  const dsl = b.toString();
  const tag = dsl.match(/\[chart [^\]]*\]/)[0];
  const iD = tag.indexOf('d:');
  const iOrient = tag.indexOf('orient:h');
  const iStack = tag.indexOf('stack');
  const iT = tag.indexOf('t:bar');
  assert.notStrictEqual(iD, -1, '应有 d:');
  assert.notStrictEqual(iOrient, -1, '应有 orient:h');
  assert.ok(iT < iOrient, 't 应在 orient 前：' + tag);
  assert.ok(iOrient < iD, 'orient 应在 d 前（消除流式翻转）：' + tag);
  assert.ok(iStack < iD, 'stack 应在 d 前：' + tag);
});

test('chartLayoutFirst 保留其余属性原序、不过滤', () => {
  const ordered = TokUIBuilder.chartLayoutFirst({ d: '1,2', l: 'a,b', orient: 'h', t: 'bar', tt: '标题' });
  const keys = Object.keys(ordered);
  assert.strictEqual(keys[0], 't', 't 恒首');
  assert.strictEqual(keys[1], 'orient', '布局键次之');
  assert.ok(keys.indexOf('d') < keys.indexOf('l'), 'd/l 等保持原相对序');
  assert.strictEqual(keys.length, 5, '属性不丢');
});

test('builder heatmapRow 产 hrow 子节点（heatmap 流式逐行）', () => {
  const b = new TokUIBuilder();
  b.heatmapRow({ v: '1,2,3' });
  const out = b.toString();
  assert.ok(out.indexOf('hrow') >= 0, '含 hrow 类型');
  assert.ok(out.indexOf('1,2,3') >= 0, '含行数据');
});

test('builder sankeyFlow 产 flow 子节点（sankey 流式逐条）', () => {
  const b = new TokUIBuilder();
  b.sankeyFlow({ v: 'A->B:10' });
  const out = b.toString();
  assert.ok(out.indexOf('flow') >= 0, '含 flow 类型');
  assert.ok(out.indexOf('A->B:10') >= 0, '含流数据');
});

// === 表单动作绑定（form:ID / reset / print / printArea）===
test('builder printArea 容器开闭', () => {
  const b = new TokUIBuilder();
  b.printArea({ id: 'pa1', tt: '订单' }).p('内容').end();
  assert.strictEqual(b.toString(), '[print-area id:pa1 tt:订单][p 内容][/print-area]');
});

test('builder btn form:ID + sub 绑定', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '提交', form: 'login', sub: 'onLogin', t: 'primary' });
  assert.strictEqual(b.toString(), '[btn tx:提交 form:login sub:onLogin t:primary]');
});

test('builder btn reset 裸写', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '重置', form: 'f', reset: true });
  // reset 为布尔属性，输出裸 reset
  assert.strictEqual(b.toString(), '[btn tx:重置 form:f reset]');
});

test('builder btn print:T', () => {
  const b = new TokUIBuilder();
  b.btn({ tx: '打印', print: 'pa1' });
  assert.strictEqual(b.toString(), '[btn tx:打印 print:pa1]');
});

test('builder 表单+按钮+打印区组合（端到端 DSL 形态）', () => {
  const b = new TokUIBuilder();
  b.form({ id: 'login', sub: 'onLogin' })
    .input({ l: '用户名', n: 'username', req: true })
    .end()
    .btn({ tx: '登录', form: 'login', sub: 'onLogin', t: 'primary' })
    .btn({ tx: '重置', form: 'login', reset: true });
  const out = b.toString();
  assert.ok(out.indexOf('[form id:login sub:onLogin]') >= 0);
  assert.ok(out.indexOf('form:login sub:onLogin') >= 0);
  assert.ok(out.indexOf('form:login reset') >= 0);
});

// === opt 简写：强制引号 + 双行为 ===
test('checkbox opt 简写：强制双引号包裹', () => {
  const b = new TokUIBuilder();
  b.checkbox({ n: 'brand', opt: '1:篮球;2:足球;3:羽毛球' });
  const out = b.toString();
  assert.ok(out.indexOf('opt:"1:篮球;2:足球;3:羽毛球"') >= 0, 'opt 值须强制双引号: ' + out);
  assert.ok(out.indexOf('[checkbox') >= 0 && out.indexOf('[/checkbox]') === -1, '简写为自闭合，无闭标签');
});
test('checkbox multi → 容器开标签', () => {
  const b = new TokUIBuilder();
  b.checkbox({ n: 'brand', multi: true }).opt({ v: '1', tx: '篮球' }).end();
  const out = b.toString();
  assert.ok(out.indexOf('[checkbox') >= 0, '开出 checkbox 开标签');
  assert.ok(out.indexOf('[opt v:1 tx:篮球]') >= 0, 'opt 子节点');
  assert.ok(out.indexOf('[/checkbox]') >= 0, '容器闭标签');
});
test('radio opt 简写：自闭合', () => {
  const b = new TokUIBuilder();
  b.radio({ n: 'gender', opt: '1:男;2:女' });
  const out = b.toString();
  assert.ok(out.indexOf('opt:"1:男;2:女"') >= 0);
  assert.ok(out.indexOf('[/radio]') === -1, '简写自闭合无闭标签');
});
test('select opt 简写：自闭合', () => {
  const b = new TokUIBuilder();
  b.select({ n: 'city', opt: 'bj:北京;sh:上海' });
  const out = b.toString();
  assert.ok(out.indexOf('opt:"bj:北京;sh:上海"') >= 0);
  assert.ok(out.indexOf('[/select]') === -1);
});
test('checkbox 单布尔：维持自闭合', () => {
  const b = new TokUIBuilder();
  b.checkbox({ l: '同意协议' });
  const out = b.toString();
  assert.ok(out.indexOf('[checkbox l:同意协议]') >= 0);
  assert.ok(out.indexOf('[/checkbox]') === -1);
});

run();
