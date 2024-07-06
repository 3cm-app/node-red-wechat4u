const qrcode = require('qrcode-terminal')
qrcode.setErrorLevel('L')
// https://github.com/nodeWechat/wechat4u/blob/master/src/util/conf.js
module.exports = async function (RED) {
  RED.nodes.registerType(
    "wechat4u-uuid",
    function (config) {
      RED.nodes.createNode(this, config)
      this.on("input", async (msg, send, done) => {
        const uuid = msg.payload
        const loginUrl = `https://login.weixin.qq.com/qrcode/${uuid}`
        this.warn(`二维码链接: ${loginUrl}`)
        const qrcodeUrl = 'https://login.weixin.qq.com/l/' + uuid
        qrcode.generate(qrcodeUrl, {small: true}, qrcode => {
            this.warn('\n' + qrcode)
            this.send({
              payload: qrcode,
              uuid,
              loginUrl,
              qrcodeUrl,
            })
            if (done) {
              done()
            }
        })
      })
    }
  )
}
