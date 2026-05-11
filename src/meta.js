window.PMO_META = {
  "version": "0.6.21",
  "buildDate": "2026-05-11 23:13",
  "dataSchema": 1,
  "changelog": [
    {
      "version": "0.6.21",
      "commit": "10366e0",
      "date": "2026-05-11 23:11",
      "message": "Harden preview login and release changelog",
      "points": [
        "增强右侧预览登录自愈能力，修复残留错误用户数据导致的登录失败",
        "项目卡片图标背景改为纯色，统一视觉风格",
        "更新日志改为全量记录、逐次递增版本号和具体中文更新点",
        "左侧菜单更新日志入口改为显示最近更新时间"
      ]
    },
    {
      "version": "0.6.20",
      "commit": "e0271c5",
      "date": "2026-05-11 23:01",
      "message": "Migrate legacy preview login users",
      "points": [
        "修复右侧预览残留旧用户数据导致默认账号无法登录的问题",
        "新增内置账号认证数据迁移，保留项目、Sprint、需求等业务数据",
        "补充旧预览数据迁移与密码保护测试"
      ]
    },
    {
      "version": "0.6.19",
      "commit": "f279f32",
      "date": "2026-05-11 22:56",
      "message": "Fix preview login and table permissions",
      "points": [
        "将登录页改为标准表单提交，提升右侧预览登录稳定性",
        "成员管理表格增加无权限禁用态",
        "优化关于我们与二级、三级页面底部间距"
      ]
    },
    {
      "version": "0.6.18",
      "commit": "8b84f6a",
      "date": "2026-05-11 22:39",
      "message": "Add sprint creation wizard and user table",
      "points": [
        "新建 Sprint 改为二级下钻页面",
        "新增基础信息、计划与里程碑、关键需求三步创建向导",
        "成员管理列表改为表格呈现"
      ]
    },
    {
      "version": "0.6.17",
      "commit": "4d8ffd5",
      "date": "2026-05-11 22:19",
      "message": "Polish project cards and login account sync",
      "points": [
        "优化首页项目卡片布局，提升 Owner、周期、Sprint 等信息可读性",
        "移除项目节奏冗余标签和 Project 字段",
        "登录账号输入与系统用户账号保持同步"
      ]
    },
    {
      "version": "0.6.16",
      "commit": "c45defc",
      "date": "2026-05-11 22:04",
      "message": "Refine forms and synchronized member data",
      "points": [
        "项目成员选择与成员管理数据即时联动",
        "用户表单新增姓名与账号字段规范",
        "Sprint 详情页补充风险说明展示"
      ]
    },
    {
      "version": "0.6.15",
      "commit": "3f5476e",
      "date": "2026-05-11 20:17",
      "message": "Use secondary info pages and add favicon",
      "points": [
        "关于我们和更新日志改为二级页面呈现",
        "新增浏览器页签 favicon",
        "产品定位更新为多 Agent 协同的 AI Native 项目管理系统"
      ]
    },
    {
      "version": "0.6.14",
      "commit": "71b7521",
      "date": "2026-05-11 19:54",
      "message": "Add info popovers and scoped sprint edit pages",
      "points": [
        "新增关于我们、版本信息和更新日志入口",
        "Sprint 编辑改为按基础信息、计划、需求分区下钻",
        "更新日志改为中文更新点展示"
      ]
    },
    {
      "version": "0.6.13",
      "commit": "e4067a4",
      "date": "2026-05-11 19:34",
      "message": "Polish marked UI details",
      "points": [
        "优化登录页、侧边栏和按钮视觉细节",
        "精简 Sprint 详情页重复信息",
        "强化 WeTask 链接展示"
      ]
    },
    {
      "version": "0.6.12",
      "commit": "5073546",
      "date": "2026-05-11 19:27",
      "message": "Refine user management and release metadata",
      "points": [
        "优化系统级用户管理表单",
        "新增版本信息与更新日志元数据",
        "保护业务数据避免被系统更新覆盖"
      ]
    },
    {
      "version": "0.6.11",
      "commit": "bf33bee",
      "date": "2026-05-11 19:01",
      "message": "Add functional coverage for sprint detail flow",
      "points": [
        "补充 Sprint 详情页功能用例",
        "验证项目与 Sprint 关联切换"
      ]
    },
    {
      "version": "0.6.10",
      "commit": "e9295c9",
      "date": "2026-05-11 18:08",
      "message": "Use account login and fixed sidebar layout",
      "points": [
        "切换为用户账号登录",
        "固定左侧系统菜单高度与滚动结构"
      ]
    },
    {
      "version": "0.6.9",
      "commit": "549944c",
      "date": "2026-05-11 17:42",
      "message": "Refine sidebar account actions and permissions",
      "points": [
        "优化侧边栏账号与退出操作",
        "完善 PMO、PM、成员权限展示"
      ]
    },
    {
      "version": "0.6.8",
      "commit": "752ea35",
      "date": "2026-05-11 17:30",
      "message": "Fix preview login without bypassing auth",
      "points": [
        "修复预览窗口登录问题",
        "保留正常账号密码校验逻辑"
      ]
    },
    {
      "version": "0.6.7",
      "commit": "d63369e",
      "date": "2026-05-11 17:17",
      "message": "Fix preview login entry",
      "points": [
        "修复预览环境登录入口响应",
        "保持账号密码校验流程不绕过"
      ]
    },
    {
      "version": "0.6.6",
      "commit": "83a2bbb",
      "date": "2026-05-11 17:04",
      "message": "Add direct login click fallback",
      "points": [
        "新增登录按钮直接点击兜底逻辑",
        "提升内嵌预览环境登录稳定性"
      ]
    },
    {
      "version": "0.6.5",
      "commit": "1c49fc9",
      "date": "2026-05-11 16:55",
      "message": "Handle login via explicit click action",
      "points": [
        "补充显式登录点击事件处理"
      ]
    },
    {
      "version": "0.6.4",
      "commit": "e112fff",
      "date": "2026-05-11 16:36",
      "message": "Allow debug login from empty login form",
      "points": [
        "增加早期调试登录能力"
      ]
    },
    {
      "version": "0.6.3",
      "commit": "2209cc6",
      "date": "2026-05-11 16:27",
      "message": "Refine login page presentation",
      "points": [
        "优化登录页视觉呈现"
      ]
    },
    {
      "version": "0.6.2",
      "commit": "cc3c94a",
      "date": "2026-05-11 16:18",
      "message": "Add login and role-based permissions",
      "points": [
        "新增登录模块",
        "增加基于角色的权限控制"
      ]
    },
    {
      "version": "0.6.1",
      "commit": "56be66f",
      "date": "2026-05-11 15:37",
      "message": "Initial open source PMO Suite MVP",
      "points": [
        "初始化 PMO Suite 单页 MVP",
        "实现项目、Sprint、成员、需求和里程碑基础管理",
        "建立本地可部署的开源项目结构"
      ]
    }
  ]
};
