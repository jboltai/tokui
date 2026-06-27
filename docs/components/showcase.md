# 综合案例

成品案例集。这里不再逐个讲解组件属性，而是用一组贴近真实业务场景的完整 DSL，展示 TokUI 组件如何组合出可上线的界面：注册表单、CRUD 管理台、数据看板、销售/客户分析报告、AI 对话片段等。每个案例左侧为格式化 + 高亮的 DSL，右侧为实时渲染，点「编辑」可即时改动。

## 注册表单

`card` 包 `form`，覆盖最典型的注册场景：用户名、密码、邮箱输入，`select` 选国家，`checkbox` 同意条款，`ft` 页脚放提交与重置按钮。

<Playground dsl='[card tt:"创建账号"][p v:muted 填写以下信息即可完成注册，所有字段均为必填。][form act:/api/register mtd:post sub:onRegister][row][col span:12][input l:"用户名" n:username ph:"3-16 位字母数字" req][/col][col span:12][pwd l:"密码" n:password ph:"至少 8 位" req][/col][/row][row][col span:12][input t:email l:"邮箱" n:email ph:"name@example.com" req][/col][col span:12][select l:"所在国家" n:country ph:"请选择" req][opt v:cn tx:"中国" chk][opt v:us tx:"美国"][opt v:jp tx:"日本"][opt v:sg tx:"新加坡"][opt v:de tx:"德国"][/select][/col][/row][checkbox l:"我已阅读并同意《用户协议》与《隐私政策》" id:agree req][ft][btn tx:"立即注册" v:primary sub:onRegister][btn tx:"重置" reset][/ft][/form][/card]' />

> 表单的 `sub:` 处理器需通过 `TokUI.registerHandler('onRegister', fn)` 预先注册，按下提交按钮时被调用；`act` / `mtd` 用于无 JS 时的原生表单降级。

## 表单 + 表格联动

上方一个录入表单，下方一个 `table` 展示已录入的数据。常见于「快速添加成员」这类后台子页。

<Playground dsl='[card tt:"团队成员管理"][p v:muted 录入成员后即时追加到下方列表。][form sub:onAddMember][row][col span:8][input l:"姓名" n:name ph:"如：王磊" req][/col][col span:8][select l:"角色" n:role ph:"请选择"][opt v:dev tx:"开发"][opt v:design tx:"设计"][opt v:pm tx:"产品"][opt v:qa tx:"测试"][/select][/col][col span:8][input t:email l:"邮箱" n:email ph:"name@team.com"][/col][/row][ft][btn tx:"添加成员" v:primary sub:onAddMember][btn tx:"清空" reset][/ft][/form][/card][card tt:"成员列表" v:flat][table stripe][thead cols:"姓名,角色,邮箱,状态"][tbody][tr 王磊,开发,wanglei@team.com,在职][tr 林晓,设计,linxiao@team.com,在职][tr 赵峰,产品,zhaofeng@team.com,休假][tr 陈雨,测试,chenyu@team.com,在职][/tbody][/table][/card]' />

## CRUD 管理界面

最经典的后台管理页：`card` 内顶部搜索框与批量操作按钮，中部 `stripe` 斑马纹表格带复选列，底部 `pagination` 分页。

<Playground dsl='[card tt:"商品管理"][p v:muted 共 128 条记录，当前第 1 / 13 页。][row v:inline][input ph:"输入关键字回车搜索" search clk:onSearch w:280][btn tx:"搜索" v:primary clk:onSearch][btn tx:"新增商品" v:success clk:onCreate][btn tx:"批量上架" clk:onBatch][btn tx:"导出 CSV" v:ghost clk:onExport][/row][table stripe][thead cols:"#,商品名称,分类,价格,库存,状态,操作"][tbody][tr "1,iPhone 15 Pro Max,数码,9999,234,在售,编辑 删除"][tr "2,Magic Mouse,配件,799,1280,在售,编辑 删除"][tr "3,MacBook Air M3,数码,8999,56,在售,编辑 删除"][tr "4,AirPods Pro 2,配件,1899,890,在售,编辑 删除"][tr "5,HomePod mini,配件,449,0,缺货,编辑 删除"][tr "6,Apple Watch S9,穿戴,2999,312,在售,编辑 删除"][tr "7,iPad Air,数码,4799,178,在售,编辑 删除"][tr "8,Studio Display,数码,11499,24,预售,编辑 删除"][tr "9,Pencil Pro,配件,949,560,在售,编辑 删除"][tr "10,Mac mini M4,数码,4499,98,在售,编辑 删除"][/tbody][/table][ft][pagination page:1 total:128 count:10 clk:onPage][/ft][/card]' />

> 含空格或中文的单元格必须用双引号整行包裹，解析器按空格切 token，否则会被截断。如需勾选列，把 `thead` 的 `cols` 首列改为 `chk` 即可。

## 带页脚的操作卡片

`card v:highlight` 高亮卡片，正文承载说明，`ft` 页脚用 `btngroup` 组织保存 / 取消 / 导出三个动作，常见于设置面板或详情编辑。

<Playground dsl='[card tt:"编辑配送地址" v:highlight][row][col span:12][input l:"收件人" n:receiver val:"周明"][/col][col span:12][input l:"手机号" n:phone val:"13800138000"][/col][/row][row][col span:12][input l:"详细地址" n:address ph:"省 / 市 / 区 / 街道门牌" val:"上海市浦东新区世纪大道 100 号"][/col][/row][dv v:dashed][ft][btngroup][btn tx:"保存修改" v:primary clk:onSave][btn tx:"取消" clk:OnCancel][btn tx:"导出 PDF" v:ghost clk:onExport][/btngroup][/ft][/card]' />

## 数据看板

`row` / `col` 栅格布局：顶部一行 4 个 `stat` 统计卡，下方左侧 `chart` 折线趋势、右侧 `table` 实时订单，是一份典型的运营看板。

<Playground dsl='[row][col span:6][stat tt:"今日营收" pre:¥ v:482910 trend:up][/col][col span:6][stat tt:"活跃用户" v:18342 trend:up][/col][col span:6][stat tt:"订单数" v:1294 trend:up][/col][col span:6][stat tt:"退款率" v:1.2 suf:% trend:down dec:1][/col][/row][row][col span:8][card tt:"近 7 日营收趋势"][p v:muted 单位：万元][chart t:line tt:"营收趋势" l:"周一,周二,周三,周四,周五,周六,周日" d:"32,45,38,52,61,78,69" area][/card][/col][col span:4][card tt:"最新订单" v:flat][table stripe][thead cols:"客户,金额,状态"][tbody][tr 王磊,¥1299,已支付][tr 林晓,¥459,待发货][tr 赵峰,¥8999,已发货][tr 陈雨,¥189,已退款][tr 周明,¥3299,已支付][/tbody][/table][/card][/col][/row]' />

## 报告类：销售分析

仪表盘风格的销售分析报告：标题卡 → 关键指标 `stat` 行 → 柱状对比 `chart` → 明细 `table`，整体读起来像一页 BI 报表。

<Playground dsl='[card tt:"2026 Q1 销售分析报告"][p v:muted 数据范围：2026-01-01 至 2026-03-31｜生成时间：2026-04-02][row][col span:6][stat tt:"总营收" pre:¥ v:12843210 trend:up][/col][col span:6][stat tt:"同比增长" v:23.6 suf:% trend:up dec:1][/col][col span:6][stat tt:"客单价" pre:¥ v:486 trend:up][/col][col span:6][stat tt:"退货率" v:1.8 suf:% trend:down dec:1][/col][/row][/card][row][col span:12][card tt:"月度销售对比（万元）"][chart t:bar tt:"月度销售对比" l:"1月,2月,3月" d:"382,451,451" c:"4f46e5,10b981,f59e0b"][/card][/col][/row][card tt:"分渠道明细" v:flat][table stripe][thead cols:"渠道,营收(万),占比,同比,负责人"][tbody][tr 官方商城,542,42.2%,+18%,张敏][tr 天猫旗舰,328,25.5%,+12%,李航][tr 京东自营,231,18.0%,+9%,王磊][tr 抖音电商,124,9.6%,+58%,陈雨][tr 线下门店,59,4.7%,-6%,赵峰][/tbody][/table][/card]' />

## 报告类：客户分析

`desc` 描述列表汇总客户画像，配合明细 `table` 与 `callout` 结论提示，是一页结构完整的客户分析结论页。

<Playground dsl='[card tt:"重点客户画像：华东大客户 A"][desc cols:2 stripe bordered][desc-item l:"客户名称" tx:"上海智云科技有限公司"][desc-item l:"行业" tx:"企业服务 / SaaS"][desc-item l:"合作周期" tx:"3 年 4 个月"][desc-item l:"累计消费" tx:"¥2,184,500"][desc-item l:"服务等级" tx:"VIP 钻石"][desc-item l:"客户经理" tx:"林晓"][/desc][/card][card tt:"近 6 个月成交明细" v:flat][table stripe][thead cols:"月份,合同金额,产品,状态"][tbody][tr 2026-01,¥386000,企业版授权,已回款][tr 2026-02,¥420000,增值服务包,已回款][tr 2026-03,¥298000,培训咨询,已回款][tr 2026-04,¥515000,扩容 + 续约,已回款][tr 2026-05,¥312000,定制开发,审批中][tr 2026-06,¥253500,运维服务,待签约][/tbody][/table][/card][callout t:success tt:"分析结论"]该客户近 6 个月合同金额稳步上升，回款及时、续约意愿强。建议下季度主动推进 ¥800,000 级别的全栈升级方案，并安排季度高管回访以巩固关系。[/callout]' />

## AI 对话片段

收尾案例，展示 AI 场景的综合表现力：`bubble role:ai` 内嵌 `think` 思考块、`tool-call` 工具调用、`md` Markdown 正文与 `msg-actions` 操作栏，是一段真实可流的对话回复。

<Playground dsl='[bubble role:ai model:"GPT-5.2" time:"2026-06-20 14:32"][think tt:"正在分析用户问题…"]用户问的是 Q1 销售趋势，需要先查询数据库，再对比去年同期。先调用 sales_query 工具取数。[/think][tool-call name:"sales_query" status:success duration:"1.2s" id:call_001]查询参数：range=2026-Q1, group_by=channel[/tool-call][md]## Q1 销售分析\n\n本季度总营收 **¥12,843,210**，同比 **+23.6%**。核心结论：\n\n- **官方商城**贡献最大，营收 542 万（占比 42.2%）\n- **抖音电商**增速最快，同比 +58%\n- **线下门店**小幅下滑 -6%，建议复盘选址策略\n\n详细数据见上方表格。如需进一步拆分到周维度或地区维度，请告诉我。[/md][msg-actions copy regenerate like dislike][/msg-actions][/bubble]' />

> `bubble` / `think` / `tool-call` / `md` / `msg-actions` 均为容器，必须闭合。流式渲染时 `think` 会先到先显，随后逐步刷出 `tool-call` 状态与 `md` 正文，模拟真实打字机效果。

---

更多组件的属性与变体请查阅左侧导航的各分类文档：[基础组件](/components/basic)、[表单控件](/components/form)、[表格](/components/table)、[布局容器](/components/layout)、[图表](/components/chart)、[AI 对话](/components/ai-chat)。
