# Personal Terminal

一个以黑白、荧光黄绿和邦布为视觉元素的个人站点初版，包含个人介绍、项目、随笔与角色收藏。纯 HTML、CSS、JavaScript，无构建步骤，可托管到 GitHub Pages。

## 本地预览

安装 Node.js 18 或更新版本后，在此目录运行：

```sh
npm run dev
```

打开 <http://127.0.0.1:4173>。无需 `npm install`。如需修改监听地址或端口：

```sh
npm run dev -- --host 127.0.0.1 --port 4180
```

## 主题外观

右上角可选择「跟随系统 / 浅色 / 深色」，默认跟随系统。手动选择保存在浏览器本地，刷新后保留；切回跟随系统后，页面会实时响应系统外观变化。浏览器限制本地存储时仍可在当前页面切换。`theme.js` 在首屏绘制前应用选择，`themes.css` 管理界面配色；角色、邦布和插画保留原色。

手机上主题选择与导航分为两行，方便点击。没有启用 JavaScript 时，页面仍按系统配色显示。

## 邦布小动作

- 待机时轻轻晃动，鼠标移入或键盘聚焦时歪头回应。
- 点击会交替跳跃、摇摆；快速连点三下会触发开心连跳。
- 约 14 秒没有互动就进入打盹，点击可以叫醒。
- 离开可视区域、切换到后台或重播入场时暂停；系统开启“减少动态效果”时保留文字回应。

## 内容替换

「偏爱频道」位于关于之后，首页电脑、顶部导航和侧边导航都能直接进入。第一位收藏角色为蕾米埃尔·丹，使用本地官方透明立绘与头像；图片延迟加载，不阻塞首页入场。桌面鼠标移动时，人物与背景产生轻微视差，手机和“减少动态效果”模式保持静态。章节滚动渐入可在离开后重播。

角色语录引用官网；“关于这份偏爱”目前是待补写的收藏留言，可在 `index.html` 的 `favorite-note` 中替换。收藏条目前展示一位角色，后续添加真实收藏时再接入切换。

昵称已使用 GitHub 用户名 `loutaiyue`。项目区展示 [komari-theme-zzz](https://github.com/loutaiyue/komari-theme-zzz) 与 [KnowledgeHub](https://github.com/loutaiyue/KnowledgeHub)，点击卡片会在新标签页打开对应仓库；下方提供 GitHub 主页入口。卡片封面为站内设计插画，介绍依据仓库 README 编写。

简介及随笔仍为预览内容，可继续替换为自己的文字。页面结构、项目介绍与链接在 `index.html`，样式在 `styles.css`，昵称、随笔与交互在 `app.js`，图片保存在 `assets/`。

邦布与角色相关素材来源和署名见 [assets/SOURCES.md](assets/SOURCES.md)。本项目为个人站点设计练习，与游戏官方无关联。

## GitHub Pages

站点地址：<https://loutaiyue.github.io/>。仓库为 [loutaiyue/loutaiyue.github.io](https://github.com/loutaiyue/loutaiyue.github.io)，Pages 使用 `main` 分支的根目录发布，无需构建步骤。

后续修改可先用 `npm run dev` 预览，再提交并推送到 `main`；GitHub Pages 会自动部署。部署状态可在仓库的 **Actions** 或 **Settings → Pages** 中查看。

站点使用相对资源路径，也可部署在 `用户名.github.io/仓库名/` 下。保留仓库根目录的 `.nojekyll` 和 `assets/` 中的素材、来源说明及字体许可；`node_modules/` 与本地临时文件已被忽略。旧主页保留在 Git 历史中。
