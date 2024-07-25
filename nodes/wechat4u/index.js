const Wechat = require("wechat4u")
// const WechatCore = require('wechat4u/lib/core.js')

// https://github.com/nodeWechat/wechat4u/blob/master/run-core.js
module.exports = async function (RED) {
  RED.nodes.registerType(
    "wechat4u",
    function (config) {
      RED.nodes.createNode(this, config)
      const bot = new Wechat()
      this.refreshStatus = () => {
        switch (bot.state) {
          case bot.CONF.STATE.init: {
            this.status({ fill: "grey", shape: "dot", text: bot.state })
            return
          }
          case bot.CONF.STATE.uuid: {
            this.status({ fill: "yellow", shape: "dot", text: bot.state })
            return
          }
          case bot.CONF.STATE.login: {
            this.status({ fill: "green", shape: "dot", text: bot.state })
            return
          }
          case bot.CONF.STATE.logout:
          default: {
            this.status({ fill: "grey", shape: "dot", text: bot.state })
          }
        }
      }
      this.restart = () => {
        this.refreshStatus()
        this.context().get("botData", (err, data) => {
          if (err) {
            this.error(err)
          }
          if (data) {
            bot.botData = data // https://github.com/nodeWechat/wechat4u/blob/master/src/core.js#L43
            this.log(data)
            this.send([null, null, { payload: data }])
          }
          if (bot.PROP.uin) {
            bot.restart()
          } else {
            bot.start()
          }
        })
      }

      this.on("close", async (removed, done) => {
        try {
          if (removed) {
            await bot.stop()
          }
        } catch (e) {
          this.error(e)
        } finally {
          if (done) {
            done()
          }
        }
      })

      this.on("input", async (msg, send, done) => {
        try {
          if (typeof msg.payload === "function") {
            await msg.payload(bot)
          } else if (Array.isArray(msg.payload)) {
            await bot.sendMsg(...msg.payload)
          } else {
            await bot.sendMsg(msg.payload, 'filehelper')
          }
        } catch (e) {
          this.error(e)
        } finally {
          if (done) {
            done()
          }
        }
      })

      bot.on("uuid", uuid => {
        this.log(`uuid: ${uuid}`)
        this.send([null, { payload: uuid }])
      })

      bot.on("user-avatar", avatar => {
        this.log(`登录用户头像Data URL: ${avatar}`)
        this.refreshStatus()
      })

      bot.on("login", async () => {
        this.refreshStatus()
        this.log('登录成功')
        if (!bot.user.UserName) {
          this.error("wechat4u event: login: user.UserName not found")
          return
        }
        this.context().set("botData", bot.botData, () => {})
        this.send([null, { payload: '' }, { payload: bot.botData }])
      })

      bot.on("logout", async () => {
        this.log('登出成功')
        this.refreshStatus()
        this.context().set("botData", null, () => {})
        this.restart()
      })

      bot.on("contacts-updated", async contacts => {
        this.refreshStatus()
        this.log(`联系人(${Object.keys(bot.contacts).length}: ${contacts}`)
      })

      bot.on("message", async (msg) => {
        this.refreshStatus()
        this.send([{ payload: msg }])
      })

      bot.on("error", async (err) => {
        this.error(err)
      })

      this.restart()
    }
  )
}
