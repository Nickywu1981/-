/**
 * 通联支付聚合收银台配置
 *
 * 生产地址: https://syb.allinpay.com/apiweb/h5unionpay/onepay
 * 测试地址: https://syb-test.allinpay.com/apiweb/h5unionpay/onepay
 * 对接文档: https://prodoc.allinpay.com/project/17/
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

const allinpayConfig = {
  env: process.env.ALLINPAY_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'),
  cusid: process.env.ALLINPAY_CUSID || '',
  appid: process.env.ALLINPAY_APPID || '',
  privateKey: () => process.env.ALLINPAY_PRIVATE_KEY || null,
  publicKey: () => process.env.ALLINPAY_PUBLIC_KEY || null,
  privateKeyPath: process.env.ALLINPAY_PRIVATE_KEY_PATH || './certs/allinpay_private.pem',
  publicKeyPath: process.env.ALLINPAY_PUBLIC_KEY_PATH || './certs/allinpay_public.pem',
  notifyUrl: process.env.ALLINPAY_NOTIFY_URL || '',
  returnUrl: process.env.ALLINPAY_RETURN_URL || '',
  frontUrl: process.env.ALLINPAY_FRONT_URL || '',
  signType: process.env.ALLINPAY_SIGN_TYPE || 'RSA',

  get baseUrl() {
    return this.env === 'production'
      ? 'https://syb.allinpay.com/apiweb/h5unionpay/onepay'
      : 'https://syb-test.allinpay.com/apiweb/h5unionpay/onepay';
  },

  get isSandbox() {
    return this.env === 'sandbox';
  },
};

export default allinpayConfig;
