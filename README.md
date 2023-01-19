# Q2TG - without User Bot
QQ 群与 Telegram 群相互转发的 bot，但是去除了 _UserBot_ 模式，再也不用担心杜叔叔瞎几把封号啦！

## 为什么不需要 User Bot

[Clansty/Q2TG#74](https://github.com/Clansty/Q2TG/issues/74) [Clansty/Q2TG#80](https://github.com/Clansty/Q2TG/issues/80) [Clansty/Q2TG#83](https://github.com/Clansty/Q2TG/issues/83)

首先，并不是说 User Bot 不好，~~如果杜叔叔不瞎几把封号那其实无所谓，但我已经被封了两个 `+1` 的 Telegram Account 了。~~ 但是对于那些不需要个人模式，愿意舍弃 Telegram 消息撤回检测，且想体验 `rainbowcat` 的新功能的用户来说，User Bot 的配置略显多余，但 User Bot 在 `rainbowcat` 中被写死在代码中，而不是像 v1 中一样作为可选功能安装，而 `rainbowcat` 中在部署时必须配置 User Bot，于是便有了这个 fork。

需要注意的是，此 fork 中个人模式**几乎不可用**，而群聊模式中需要 User Bot 功能实现的也都无法实现。

![image](https://user-images.githubusercontent.com/49985975/213389640-350764fc-8932-4db3-bd83-f4c80df34912.png)

## 安装 / 迁移

请看 [Wiki](https://github.com/Clansty/Q2TG/wiki/%E5%AE%89%E8%A3%85%E9%83%A8%E7%BD%B2)，与上游相同。

请注意修改 [`docker-compose.yaml`](https://raw.githubusercontent.com/Nofated095/Q2TG/rainbowcat/docker-compose.yaml)，启动命令 `docker-compose up -d`。

如果你事先部署过上游的 Q2TG 实例，建议通过 `docker stop main_q2tg` 停止服务。你可以直接修改原先的 `docker-compose.yaml` 中 `services - q2tg - image` 为 `ghcr.io/nofated095/q2tg:rainbowcat`

```yaml
version: "3.8"
services:
  # 如果有现成的 Postgresql 实例，可以删除这一小节
  postgres:
    image: postgres
    container_name: postgresql_q2tg
    restart: unless-stopped
    environment:
      POSTGRES_DB: db_name
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - ./postgresql:/var/lib/postgresql/data
  q2tg:
    image: ghcr.io/nofated095/q2tg:rainbowcat
    container_name: main_q2tg
    restart: unless-stopped
    depends_on:
      - postgres
    volumes:
      - ./data:/app/data
    environment:
      - TG_API_ID=
      - TG_API_HASH=
      - TG_BOT_TOKEN=
      - DATABASE_URL=postgres://user:password@postgres/db_name
      - CRV_API=
      - CRV_KEY=
      # 如果需要通过代理联网，那么设置下面两个变量
      #- PROXY_IP=
      #- PROXY_PORT=
```

## 支持的消息类型

>此分支可能不支持一些文件转发，经过测试转发多条消息是不可用的。

- [x] 文字（双向）
- [x] 图片（双向）
  - [x] GIF
  - [x] 闪照

    闪照每个 TG 用户也只能查看 5 秒
- [x] 图文混排消息（双向）
- [x] 大表情（双向）
  - [x] TG 中的动态 Sticker

    目前是[转换成 GIF](https://github.com/ed-asriyan/tgs-to-gif) 发送的，并且可能有些[问题](https://github.com/ed-asriyan/tgs-to-gif/issues/13#issuecomment-633244547)
- [x] 视频（双向）
- [x] 语音（双向）
- [x] 小表情（可显示为文字）
- [x] 链接（双向）
- [x] JSON/XML 卡片

  （包括部分转化为小程序的链接）
- [x] 位置（TG -> QQ）
- [x] 群公告
- [x] 回复（双平台原生回复）
- [x] 文件

  QQ -> TG 按需获取下载地址

  TG -> QQ 将自动转发 20M 一下的小文件
- [x] 转发多条消息记录
- [x] TG 编辑消息（撤回再重发）
- [x] 双向撤回消息
- [x] 戳一戳

## 关于模式

### 群组模式

群组模式就是 1.x 版本唯一的模式，是给群主使用的。如果群组想要使自己的 QQ 群和 Telegram 群联通起来，就使用这个模式。群组模式只可以给群聊配置转发，并且转发消息时会带上用户在当前平台的发送者名称。

>### 个人模式
>
>个人模式适合 QQ 轻度使用者，TG 重度使用者。可以把 QQ 的好友和群聊搬到 Telegram 中。个人模式一定要登录机器人主人自己的 Telegram 账号作为 UserBot。可以自动为 QQ 中的好友和群组创建对应的 Telegram 群组，并同步头像简介等信息。当有没有创建关联的好友发起私聊的时候会自动创建 Telegram 中的对应群组。个人模式在初始化的时候会自动在 Telegram 个人账号中创建一个文件夹来存储所有来自 QQ 的对应群组。消息在从 TG 转发到 QQ 时不会带上发送者昵称，因为默认发送者只有一个人。
>
>不幸的，因为 User Bot 在此分支被残忍的删除，所以虽然没有测试个人模式，但是想想就知道个人模式在没有 User Bot 的情况下是几乎完全废的。

## 如何撤回消息

在 QQ 中，直接撤回相应的消息，撤回操作会同步到 TG

在 TG 中，可以选择以下操作之一：

- 将消息内容编辑为 `/rm`
- 回复要撤回的消息，内容为 `/rm`。如果操作者在 TG 群组中没有「删除消息」权限，则只能撤回自己的消息
>- 如果正确配置了个人账号的 User Bot，可以直接删除消息
>
>正确的，但由于此分支删除了 User Bot 功能，所以无法直接删除。

为了使撤回功能正常工作，TG 机器人需要具有「删除消息」权限，QQ 机器人需要为管理员或群主

即使 QQ 机器人为管理员，也无法撤回其他管理员在 QQ 中发送的消息

## 免责声明

一切开发旨在学习，请勿用于非法用途。本项目完全免费开源，不会收取任何费用，无任何担保。请勿将本项目用于商业用途。由于使用本程序造成的任何问题，由使用者自行承担，项目开发者不承担任何责任。

本项目基于 AGPL 发行。修改、再发行和运行服务需要遵守 AGPL 许可证，源码需要和服务一起提供。

## 许可证

```
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```
