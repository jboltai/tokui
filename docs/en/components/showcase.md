# Showcase

A collection of finished examples. Rather than walking through individual component properties, this page presents complete DSL snippets that mirror real business scenarios — showing how TokUI components compose into production-ready interfaces: registration forms, CRUD consoles, data dashboards, sales and customer analysis reports, and AI conversation fragments. Each example shows the formatted, syntax-highlighted DSL on the left and a live render on the right; click "Edit" to modify it in real time.

## Registration Form

A `card` wrapping a `form`, covering the most typical registration scenario: username, password, and email inputs, a `select` for country, a `checkbox` to accept terms, and an `ft` footer holding the submit and reset buttons.

<Playground dsl='[card tt:"创建账号"][p v:muted 填写以下信息即可完成注册，所有字段均为必填。][form act:/api/register mtd:post sub:onRegister][row][col span:12][input l:"用户名" n:username ph:"3-16 位字母数字" req][/col][col span:12][pwd l:"密码" n:password ph:"至少 8 位" req][/col][/row][row][col span:12][input t:email l:"邮箱" n:email ph:"name@example.com" req][/col][col span:12][select l:"所在国家" n:country ph:"请选择" req][opt v:cn tx:"中国" chk][opt v:us tx:"美国"][opt v:jp tx:"日本"][opt v:sg tx:"新加坡"][opt v:de tx:"德国"][/select][/col][/row][checkbox l:"我已阅读并同意《用户协议》与《隐私政策》" id:agree req][ft][btn tx:"立即注册" v:primary sub:onRegister][btn tx:"重置" t:reset][/ft][/form][/card]' />

> The form's `sub:` handler must be pre-registered via `TokUI.registerHandler('onRegister', fn)` and is invoked when the submit button is pressed; `act` / `mtd` provide a native-form fallback when JavaScript is unavailable.

## Form + Table Linkage

An entry form on top and a `table` below showing the records that have been entered. Common in back-office sub-pages like "quickly add a member".

<Playground dsl='[card tt:"团队成员管理"][p v:muted 录入成员后即时追加到下方列表。][form sub:onAddMember][row][col span:8][input l:"姓名" n:name ph:"如：王磊" req][/col][col span:8][select l:"角色" n:role ph:"请选择"][opt v:dev tx:"开发"][opt v:design tx:"设计"][opt v:pm tx:"产品"][opt v:qa tx:"测试"][/select][/col][col span:8][input t:email l:"邮箱" n:email ph:"name@team.com"][/col][/row][ft][btn tx:"添加成员" v:primary sub:onAddMember][btn tx:"清空" t:reset][/ft][/form][/card][card tt:"成员列表" v:flat][table stripe][thead cols:"姓名,角色,邮箱,状态"][tbody][tr 王磊,开发,wanglei@team.com,在职][tr 林晓,设计,linxiao@team.com,在职][tr 赵峰,产品,zhaofeng@team.com,休假][tr 陈雨,测试,chenyu@team.com,在职][/tbody][/table][/card]' />

## CRUD Console

The most classic back-office page: a `card` containing a search box and bulk action buttons at the top, a striped `table` with a checkbox column in the middle, and a `pagination` at the bottom.

<Playground dsl='[card tt:"商品管理"][p v:muted 共 128 条记录，当前第 1 / 13 页。][row v:inline][input ph:"输入关键字回车搜索" search clk:onSearch w:280][btn tx:"搜索" v:primary clk:onSearch][btn tx:"新增商品" v:success clk:onCreate][btn tx:"批量上架" clk:onBatch][btn tx:"导出 CSV" v:ghost clk:onExport][/row][table stripe][thead cols:"#,商品名称,分类,价格,库存,状态,操作"][tbody][tr "1,iPhone 15 Pro Max,数码,9999,234,在售,编辑 删除"][tr "2,Magic Mouse,配件,799,1280,在售,编辑 删除"][tr "3,MacBook Air M3,数码,8999,56,在售,编辑 删除"][tr "4,AirPods Pro 2,配件,1899,890,在售,编辑 删除"][tr "5,HomePod mini,配件,449,0,缺货,编辑 删除"][tr "6,Apple Watch S9,穿戴,2999,312,在售,编辑 删除"][tr "7,iPad Air,数码,4799,178,在售,编辑 删除"][tr "8,Studio Display,数码,11499,24,预售,编辑 删除"][tr "9,Pencil Pro,配件,949,560,在售,编辑 删除"][tr "10,Mac mini M4,数码,4499,98,在售,编辑 删除"][/tbody][/table][ft][pagination page:1 total:128 count:10 clk:onPage][/ft][/card]' />

> Cells containing spaces or Chinese characters must be wrapped in double quotes as a whole, since the parser splits tokens by space and would otherwise truncate them. To add a checkbox column, change the first entry of the `thead`'s `cols` to `chk`.

## Action Card with Footer

A `card v:highlight` highlighted card whose body holds explanatory text, with an `ft` footer using a `btngroup` to organize three actions — Save, Cancel, and Export. Common in settings panels or detail editors.

<Playground dsl='[card tt:"编辑配送地址" v:highlight][row][col span:12][input l:"收件人" n:receiver val:"周明"][/col][col span:12][input l:"手机号" n:phone val:"13800138000"][/col][/row][row][col span:12][input l:"详细地址" n:address ph:"省 / 市 / 区 / 街道门牌" val:"上海市浦东新区世纪大道 100 号"][/col][/row][dv v:dashed][ft][btngroup][btn tx:"保存修改" v:primary clk:onSave][btn tx:"取消" clk:OnCancel][btn tx:"导出 PDF" v:ghost clk:onExport][/btngroup][/ft][/card]' />

## Data Dashboard

A `row` / `col` grid layout: a top row of four `stat` summary cards, with a `chart` line trend on the lower left and a real-time orders `table` on the right — a typical operations dashboard.

<Playground dsl='[row][col span:6][stat tt:"今日营收" pre:¥ v:482910 trend:up][/col][col span:6][stat tt:"活跃用户" v:18342 trend:up][/col][col span:6][stat tt:"订单数" v:1294 trend:up][/col][col span:6][stat tt:"退款率" v:1.2 suf:% trend:down dec:1][/col][/row][row][col span:8][card tt:"近 7 日营收趋势"][p v:muted 单位：万元][chart t:line tt:"营收趋势" l:"周一,周二,周三,周四,周五,周六,周日" d:"32,45,38,52,61,78,69" area][/card][/col][col span:4][card tt:"最新订单" v:flat][table stripe][thead cols:"客户,金额,状态"][tbody][tr 王磊,¥1299,已支付][tr 林晓,¥459,待发货][tr 赵峰,¥8999,已发货][tr 陈雨,¥189,已退款][tr 周明,¥3299,已支付][/tbody][/table][/card][/col][/row]' />

## Report: Sales Analysis

A dashboard-style sales analysis report: title card → key-metric `stat` row → bar-comparison `chart` → detail `table`. The whole thing reads like a single BI report page.

<Playground dsl='[card tt:"2026 Q1 销售分析报告"][p v:muted 数据范围：2026-01-01 至 2026-03-31｜生成时间：2026-04-02][row][col span:6][stat tt:"总营收" pre:¥ v:12843210 trend:up][/col][col span:6][stat tt:"同比增长" v:23.6 suf:% trend:up dec:1][/col][col span:6][stat tt:"客单价" pre:¥ v:486 trend:up][/col][col span:6][stat tt:"退货率" v:1.8 suf:% trend:down dec:1][/col][/row][/card][row][col span:12][card tt:"月度销售对比（万元）"][chart t:bar tt:"月度销售对比" l:"1月,2月,3月" d:"382,451,451" c:"4f46e5,10b981,f59e0b"][/card][/col][/row][card tt:"分渠道明细" v:flat][table stripe][thead cols:"渠道,营收(万),占比,同比,负责人"][tbody][tr 官方商城,542,42.2%,+18%,张敏][tr 天猫旗舰,328,25.5%,+12%,李航][tr 京东自营,231,18.0%,+9%,王磊][tr 抖音电商,124,9.6%,+58%,陈雨][tr 线下门店,59,4.7%,-6%,赵峰][/tbody][/table][/card]' />

## Report: Customer Analysis

A `desc` description list summarizes the customer profile, paired with a detail `table` and a `callout` conclusion note — a fully structured customer-analysis conclusion page.

<Playground dsl='[card tt:"重点客户画像：华东大客户 A"][desc cols:2 stripe bordered][desc-item l:"客户名称" tx:"上海智云科技有限公司"][desc-item l:"行业" tx:"企业服务 / SaaS"][desc-item l:"合作周期" tx:"3 年 4 个月"][desc-item l:"累计消费" tx:"¥2,184,500"][desc-item l:"服务等级" tx:"VIP 钻石"][desc-item l:"客户经理" tx:"林晓"][/desc][/card][card tt:"近 6 个月成交明细" v:flat][table stripe][thead cols:"月份,合同金额,产品,状态"][tbody][tr 2026-01,¥386000,企业版授权,已回款][tr 2026-02,¥420000,增值服务包,已回款][tr 2026-03,¥298000,培训咨询,已回款][tr 2026-04,¥515000,扩容 + 续约,已回款][tr 2026-05,¥312000,定制开发,审批中][tr 2026-06,¥253500,运维服务,待签约][/tbody][/table][/card][callout t:success tt:"分析结论"]该客户近 6 个月合同金额稳步上升，回款及时、续约意愿强。建议下季度主动推进 ¥800,000 级别的全栈升级方案，并安排季度高管回访以巩固关系。[/callout]' />

## AI Conversation Fragment

The closing example, showcasing the overall expressiveness of AI scenarios: a `bubble role:ai` containing a `think` reasoning block, a `tool-call` tool invocation, an `md` Markdown body, and a `msg-actions` action bar — a real, streamable conversation reply.

<Playground dsl='[bubble role:ai model:"GPT-5.2" time:"2026-06-20 14:32"][think tt:"正在分析用户问题…"]用户问的是 Q1 销售趋势，需要先查询数据库，再对比去年同期。先调用 sales_query 工具取数。[/think][tool-call name:"sales_query" status:success duration:"1.2s" id:call_001]查询参数：range=2026-Q1, group_by=channel[/tool-call][md]## Q1 销售分析\n\n本季度总营收 **¥12,843,210**，同比 **+23.6%**。核心结论：\n\n- **官方商城**贡献最大，营收 542 万（占比 42.2%）\n- **抖音电商**增速最快，同比 +58%\n- **线下门店**小幅下滑 -6%，建议复盘选址策略\n\n详细数据见上方表格。如需进一步拆分到周维度或地区维度，请告诉我。[/md][msg-actions copy regenerate like dislike][/msg-actions][/bubble]' />

> `bubble` / `think` / `tool-call` / `md` / `msg-actions` are all containers and must be closed. During streaming, `think` is shown first as it arrives, then the `tool-call` status and `md` body are progressively flushed out, simulating a real typewriter effect.

---

For properties and variants of more components, see the category docs in the left navigation: [Basic Components](/components/basic), [Form Controls](/components/form), [Tables](/components/table), [Layout Containers](/components/layout), [Charts](/components/chart), [AI Chat](/components/ai-chat).
