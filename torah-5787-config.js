/*
 * Public browser settings only. Never place Ko-fi verification tokens, Supabase
 * service-role keys, payment secrets, or paid lesson bodies in this file.
 *
 * Payment links deliberately remain inactive until the backend webhook,
 * shop products, membership tier and account verification are tested.
 */
window.TORAH_5787_CONFIG = Object.freeze({
  kofiHome: "https://ko-fi.com/adamlee1986",
  supabaseUrl: "",
  supabaseAnonKey: "",
  edgeFunctionName: "torah-access",
  paymentReady: false,
  membershipUrl: "",
  shopUrls: {
    "5787-bereshit": "",
    "5787-noach": ""
  }
});
