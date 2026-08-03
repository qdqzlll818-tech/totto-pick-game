# 托托捞捞

一款适合手机与桌面浏览器的 3D 堆叠三消网页游戏。点击所有看得见的物品，三个相同物品会自动消除；在每局中找到三个主题托托即可完成救援并解锁对应皮肤。

## 九个主题关卡

关卡按顺序解锁，不能通过直接修改网址跳关：

1. `index.html?level=hotpot` — 火锅局（93 件）
2. `index.html?level=garlic` — 大蒜局（108 件）
3. `index.html?level=fruit` — 水果局（126 件）
4. `index.html?level=rain` — 雨天失物局（135 件）
5. `index.html?level=vanity` — 梳妆台局（144 件）
6. `index.html?level=studio` — 画室局（150 件）
7. `index.html?level=picnic` — 野餐局（156 件）
8. `index.html?level=boba` — 奶茶店局（162 件）
9. `index.html?level=winter` — 冬日毛线局（168 件）

画室局加入 4 秒灵感连消；奶茶店局每天随机三份订单，全部完成可获得一次 +10 金币奖励；冬日毛线局需要先三消毛线球，逐步解开被缠住的物品。

## 存档和账号

- 游戏进度会自动保存在当前浏览器，退出后可继续。
- 登录后通过 Supabase 同步通关、金币、每关最高分/最快时间和皮肤。
- 翻锅动作权限由手机浏览器管理，无法随账号同步；iPhone 通常需要在按钮点击后单独授权。
- 普通走路和轻晃不会触发，只有明显的前后翻锅动作才会产生有限物理翻动。

## 本地运行与验证

```bash
npm run serve
npm test
npm run test:syntax
npm run test:assets
```

打开 `http://127.0.0.1:4173/home.html`。项目是纯静态网站，可直接部署到 GitHub Pages。
